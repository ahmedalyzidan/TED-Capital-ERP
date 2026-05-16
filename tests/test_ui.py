import pytest
import os
import requests
from playwright.sync_api import Page, expect
from dotenv import load_dotenv

load_dotenv()

# Config
API_BASE = f"http://localhost:{os.getenv('PORT', '4000')}/api"

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

@pytest.mark.ui
def test_ui_numbers_match_db(page: Page, auth_token):
    # 1. Login to UI by setting token in localStorage
    page.goto("http://localhost:5173/login")
    page.evaluate(f"localStorage.setItem('token', '{auth_token}')")
    page.evaluate("localStorage.setItem('user', JSON.stringify({username: 'admin', role: 'admin'}))")
    
    # 2. Go to Reports page
    page.goto("http://localhost:5173/reports")
    
    # 3. Wait for loading to finish and the element to appear
    # We use a longer timeout because the dashboard calculates data
    locator = page.locator("#total-balance")
    expect(locator).to_be_visible(timeout=10000)
    
    ui_text = locator.inner_text()
    ui_numeric = float(ui_text.replace('LCY', '').replace(',', '').strip())
    
    # 4. Fetch the real value from the API to compare
    headers = {"Authorization": f"Bearer {auth_token}"}
    res = requests.get(f"{API_BASE}/finance/statements", headers=headers)
    db_summary = res.json().get("summary", {})
    db_value = float(db_summary.get("netProfit", 0))
    
    assert abs(ui_numeric - db_value) < 0.01, f"🚨 Financial Mismatch! UI: {ui_numeric}, DB: {db_value}"