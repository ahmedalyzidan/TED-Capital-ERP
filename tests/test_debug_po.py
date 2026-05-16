
import pytest
import requests
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

API_BASE = f"http://localhost:{os.getenv('PORT', '4000')}/api"

@pytest.fixture
def auth_token():
    res = requests.post(f"{API_BASE}/login", json={
        "username": "admin", 
        "password": "admin123"
    })
    return res.json().get("token")

def test_fetch_purchase_orders(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    url = f"{API_BASE}/table/purchase_orders?limit=200"
    res = requests.get(url, headers=headers)
    assert res.status_code == 200, f"Error: {res.status_code} - {res.text}"
    data = res.json()
    assert "data" in data
    print(f"Fetched {len(data['data'])} purchase orders")

def test_fetch_purchase_orders_with_filter(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    # Test with a filter that might exist
    url = f"{API_BASE}/table/purchase_orders?limit=200&filter=General"
    res = requests.get(url, headers=headers)
    assert res.status_code == 200, f"Error: {res.status_code} - {res.text}"

def test_fetch_purchase_orders_unauthorized():
    url = f"{API_BASE}/table/purchase_orders"
    res = requests.get(url)
    assert res.status_code == 401
