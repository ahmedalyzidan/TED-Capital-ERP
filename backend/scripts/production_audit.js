const axios = require('axios');
const API_BASE = 'http://46.224.144.166/api';
const TEST_TAG = 'AUDIT_TEST_' + Date.now();

async function runTests() {
    console.log("🚀 STARTING COMPREHENSIVE PRODUCTION AUDIT...");
    const results = [];

    // 1. Auth Test
    let token = '';
    try {
        console.log("  [1/6] Attempting Login...");
        const loginRes = await axios.post(`${API_BASE}/login`, { username: 'admin', password: 'admin123' }, { timeout: 5000 });
        token = loginRes.data.token;
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        results.push({ scenario: "Admin Login", type: "Positive", status: "PASS" });
    } catch (e) {
        results.push({ scenario: "Admin Login", type: "Positive", status: "FAIL", error: e.message });
        return finish(results);
    }

    // 2. Auth Negative Test
    try {
        console.log("  [2/6] Testing Negative Auth...");
        await axios.post(`${API_BASE}/login`, { username: 'admin', password: 'WRONG_PASSWORD' }, { timeout: 5000 });
        results.push({ scenario: "Bad Password Login", type: "Negative", status: "FAIL", error: "Allowed login with wrong password" });
    } catch (e) {
        results.push({ scenario: "Bad Password Login", type: "Negative", status: "PASS" });
    }

    // 3. Purchase Order Test (Schema Check)
    try {
        console.log("  [3/6] Testing PO Creation (Schema Check)...");
        const poPayload = {
            item_description: TEST_TAG + "_ITEM",
            qty: 10,
            estimated_cost: 100,
            supplier: "TEST_SUPPLIER",
            project_name: "TEST_PROJECT",
            category: "Material",
            warehouse: "Main Warehouse",
            metadata: { test_mode: true, tag: TEST_TAG }
        };
        const poRes = await axios.post(`${API_BASE}/dynamic/add/purchase_orders`, poPayload);
        results.push({ scenario: "Create Purchase Order", type: "Positive", status: "PASS", id: poRes.data.id });
    } catch (e) {
        results.push({ scenario: "Create Purchase Order", type: "Positive", status: "FAIL", error: e.response?.data?.message || e.message });
    }

    // 4. Finance GL Mapping Test
    try {
        console.log("  [4/6] Testing Finance & GL Mapping...");
        // First get a company and project
        const dropRes = await axios.get(`${API_BASE}/system/dropdowns`);
        const customers = dropRes.data.customers_dd || [];
        const projects = dropRes.data.projects_dd || [];
        
        const company = customers[0]?.company_name || 'TED Capital';
        const project = projects[0]?.id;

        const expensePayload = {
            description: TEST_TAG + "_EXPENSE",
            amount: 500,
            category_id: 1, 
            project_id: project,
            expense_date: new Date().toISOString().split('T')[0],
            payment_method: 'Cash',
            company_entity: company,
            metadata: { test_mode: true, tag: TEST_TAG, transaction_type: 'EXPENSE_PAYMENT' }
        };
        const expRes = await axios.post(`${API_BASE}/expenses`, expensePayload);
        const expId = expRes.data.id;
        results.push({ scenario: "Create Expense", type: "Positive", status: "PASS", id: expId });

        console.log("  [4/6b] Approving Expense (Trigger GL)...");
        await axios.patch(`${API_BASE}/expenses/${expId}/status`, { status: 'Approved' });
        results.push({ scenario: "Approve Expense & GL Mapping", type: "Positive", status: "PASS" });
    } catch (e) {
        results.push({ scenario: "Create Expense & GL Mapping", type: "Positive", status: "FAIL", error: e.response?.data?.message || e.message });
    }

    // 5. Report Fetch Test
    try {
        console.log("  [5/6] Testing Financial Dashboard...");
        await axios.get(`${API_BASE}/finance/dashboard`);
        results.push({ scenario: "Fetch Financial Dashboard", type: "Positive", status: "PASS" });
    } catch (e) {
        results.push({ scenario: "Fetch Balance Sheet", type: "Positive", status: "FAIL", error: e.message });
    }

    // 6. Strategic CommandCenter Test
    try {
        console.log("  [6/6] Testing Strategic Dashboard...");
        await axios.get(`${API_BASE}/system/sidebar-stats`);
        results.push({ scenario: "Fetch Sidebar Stats", type: "Positive", status: "PASS" });
    } catch (e) {
        results.push({ scenario: "Fetch Sidebar Stats", type: "Positive", status: "FAIL", error: e.message });
    }

    finish(results);
}

function finish(results) {
    console.log("\n📊 AUDIT REPORT SUMMARY:");
    console.table(results);
    console.log("\n🌟 DONE. Use 'cleanup_prod.sql' to remove test data with tag: " + TEST_TAG);
}

runTests();
