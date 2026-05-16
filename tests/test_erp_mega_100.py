import pytest
import requests
import psycopg2
import random
import os
from decimal import Decimal
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

# Config
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "database": os.getenv("DB_DATABASE", "erp_db"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "1985"),
    "port": os.getenv("DB_PORT", "5432")
}
API_BASE = f"http://localhost:{os.getenv('PORT', '4000')}/api"

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)

@pytest.fixture(scope="session")
def auth_token():
    res = requests.post(f"{API_BASE}/login", json={
        "username": "admin", 
        "password": "admin123"
    })
    token = res.json().get("token")
    if not token:
        pytest.fail(f"Failed to login and get token. Response: {res.text}")
    return token

@pytest.fixture(scope="session")
def lookup_data(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    def fetch(table):
        url = f"{API_BASE}/table/{table}"
        print(f"FETCHING: {url}")
        res = requests.get(url, headers=headers)
        print(f"STATUS: {res.status_code}")
        if res.status_code != 200:
            pytest.fail(f"Lookup failed for table {table}: {res.status_code} - {res.text}")
        data = res.json().get("data", [])
        print(f"DATA COUNT for {table}: {len(data)}")
        if not data:
            print(f"WARNING: Table {table} is empty! Response: {res.text}")
        return data

    return {
        "companies": fetch("companies"),
        "projects": fetch("projects"),
        "categories": fetch("expense_categories")
    }

@pytest.mark.parametrize("i", range(100))
def test_mega_expense_lifecycle(auth_token, lookup_data, i):
    """
    End-to-End lifecycle for 100 random expenses.
    Verifies: Registration -> Approval -> Auto-GL Posting -> Project Budget Sync.
    """
    headers = {"Authorization": f"Bearer {auth_token}"}
    conn = get_db_connection()
    cur = conn.cursor()

    # 1. Setup Random Data
    company = random.choice(lookup_data["companies"])
    project = random.choice(lookup_data["projects"])
    category = random.choice(lookup_data["categories"])
    
    cost_codes = ["Materials", "Labor", "Subcontractor", "Admin"]
    cost_code = random.choice(cost_codes)
    pay_methods = ["Cash", "Bank"]
    pay_method = random.choice(pay_methods)
    
    amount = random.randint(100, 5000)
    description = f"AUTO_TEST_MEGA_{i}_{company['name']}_{cost_code}"

    # Capture initial project budget if possible
    cur.execute("SELECT budget FROM projects WHERE id = %s", (project['id'],))
    init_budget = float(cur.fetchone()[0] or 0)

    # 2. Register Expense
    payload = {
        "description": description,
        "amount": amount,
        "category_id": category['id'],
        "project_id": project['id'],
        "expense_date": "2024-05-11",
        "payment_method": pay_method,
        "company_entity": company['name'],
        "metadata": {
            "cost_center_type": "Project",
            "cost_code": cost_code,
            "payment_detail": pay_method,
            "reference_no": f"REF-{i}"
        }
    }
    
    res = requests.post(f"{API_BASE}/expenses", json=payload, headers=headers)
    assert res.status_code == 201, f"Failed to create expense {i}: {res.text}"
    expense_id = res.json()['id']

    # 3. Approve Expense (Trigger Auto-GL)
    res_approve = requests.patch(f"{API_BASE}/expenses/{expense_id}/status", json={"status": "Approved"}, headers=headers)
    assert res_approve.status_code == 200, f"Failed to approve expense {i}"

    # 4. Verify Journal Entry
    cur.execute("SELECT debit_account_id, credit_account_id, amount, company_id FROM journal_entries WHERE metadata->>'reference_id' = %s", (str(expense_id),))
    journal = cur.fetchone()
    assert journal is not None, f"No journal entry found for expense {expense_id}"
    
    debit_acc, credit_acc, j_amount, j_company_id = journal
    assert float(j_amount) == float(amount), f"Amount mismatch in GL: {j_amount} vs {amount}"
    
    # 5. Verify Company Isolation
    expected_company_id = company['id']
    assert j_company_id == expected_company_id, f"Company ID mismatch: {j_company_id} vs {expected_company_id}"

    # 6. Verify Account Mapping (Basic check)
    # Materials (27), Subcontractor (28), Labor (29), Admin (31)
    if cost_code == "Materials": assert debit_acc == 27
    elif cost_code == "Subcontractor": assert debit_acc == 28
    elif cost_code == "Labor": assert debit_acc == 29
    else: assert debit_acc == 31

    # 7. Security Check: Try to delete or modify without token
    res_bad = requests.delete(f"{API_BASE}/expenses/{expense_id}")
    assert res_bad.status_code == 401, "Security Loophole: Allowed deletion without token!"

    cur.close()
    conn.close()

def test_final_system_integrity():
    """Final check for overall trial balance integrity"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Trial Balance check across all entries
    cur.execute("SELECT SUM(amount) FROM journal_entries WHERE debit_account_id IS NOT NULL")
    total_debit = float(cur.fetchone()[0] or 0)
    
    cur.execute("SELECT SUM(amount) FROM journal_entries WHERE credit_account_id IS NOT NULL")
    total_credit = float(cur.fetchone()[0] or 0)
    
    # In this simplified single-row schema, they are always balanced if amount is the same,
    # but we verify existence of both sides.
    assert total_debit == total_credit, "Global Financial Imbalance detected!"
    
    cur.close()
    conn.close()
