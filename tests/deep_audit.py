import pytest
import requests
import psycopg2
import os
import sys
from dotenv import load_dotenv

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "database": os.getenv("DB_DATABASE", "erp_db"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASS", "1985"),
    "port": os.getenv("DB_PORT", "5432")
}

API_BASE = "http://localhost:4000/api"

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)

@pytest.fixture
def auth_token():
    res = requests.post(f"{API_BASE}/login", json={"username": "admin", "password": "admin123"})
    return res.json().get("token")

@pytest.mark.audit
def test_e2e_salary_payout_integrity(auth_token):
    """
    E2E: Payout salaries (6100 -> 1101)
    """
    headers = {"Authorization": f"Bearer {auth_token}"}
    conn = get_db_connection()
    cur = conn.cursor()
    
    # 1. Capture initial state
    cur.execute("SELECT SUM(debit), SUM(credit) FROM ledger")
    init = cur.fetchone()
    init_sum = float(init[0] or 0)
    
    # 2. Simulate transaction via API (We use a JV approach or specific expense endpoint)
    # Since we verified '1101' and '6100' exist
    # We will post 2 lines for a manual JV to ensure the ledger handles it
    desc = "AUDIT_TEST_E2E_SALARY"
    
    # Debit Salaries
    res_debit = requests.post(f"{API_BASE}/dynamic/add/ledger", json={
        "account_name": "رواتب الإدارة",
        "debit": 1000,
        "credit": 0,
        "description": desc
    }, headers=headers)
    
    # Credit Cash
    res_credit = requests.post(f"{API_BASE}/dynamic/add/ledger", json={
        "account_name": "صندوق نقدية - تيد كابيتال",
        "debit": 0,
        "credit": 1000,
        "description": desc
    }, headers=headers)
    
    # 3. Verify Ledger Balance for this transaction
    cur.execute("SELECT SUM(debit), SUM(credit) FROM ledger WHERE description = %s", (desc,))
    audit = cur.fetchone()
    assert float(audit[0]) == float(audit[1]) == 1000, "Transaction is NOT balanced!"
    
    # 4. Global Balance Check
    cur.execute("SELECT SUM(debit) - SUM(credit) FROM ledger")
    diff = float(cur.fetchone()[0] or 0)
    assert abs(diff) < 0.01, f"Trial Balance BROKEN! Diff: {diff}"
    
    # Cleanup
    cur.execute("DELETE FROM ledger WHERE description = %s", (desc,))
    conn.commit()
    cur.close()
    conn.close()

@pytest.mark.audit
def test_negative_invalid_account_rejection(auth_token):
    """
    Negative: Try to post to a non-existent account.
    """
    headers = {"Authorization": f"Bearer {auth_token}"}
    res = requests.post(f"{API_BASE}/dynamic/table/ledger", json={
        "account_name": "حساب وهمي غير موجود",
        "debit": 1000,
        "credit": 0,
        "description": "NEG_TEST"
    }, headers=headers)
    
    # If using dynamic API with foreign key on account_name (or string check)
    # It should ideally fail or log an error.
    # We check if it was actually inserted
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id FROM ledger WHERE description = 'NEG_TEST'")
    row = cur.fetchone()
    
    # Cleanup if it inserted (which it shouldn't if strict)
    if row:
        cur.execute("DELETE FROM ledger WHERE description = 'NEG_TEST'")
        conn.commit()
    
    cur.close()
    conn.close()
    
    # In a perfect system, it should have failed (400 or 500)
    # Or at least not exist in ledger if it failed validation.
    assert row is None, "CRITICAL: System allowed posting to a non-existent account name!"
