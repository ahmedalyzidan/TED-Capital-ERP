const axios = require('C:/Users/Ahmed Zidan/ERP/backend/Ted ERP/node_modules/axios');

async function testUser(username, password, selectedCompany, disallowedCompanySearch) {
    console.log(`\n========================================`);
    console.log(`Testing User: ${username} with Company: ${selectedCompany}...`);
    
    // Login
    const loginRes = await axios.post('http://localhost:4000/api/login', {
        username,
        password,
        company: selectedCompany
    });
    
    const token = loginRes.data.token;
    console.log(`🔑 Login successful. Token generated.`);

    // 1. Report stats
    console.log(`📡 Requesting /api/reports/dashboard_stats...`);
    const reportRes = await axios.get('http://localhost:4000/api/reports/dashboard_stats', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const projects = reportRes.data.projects || [];
    console.log(`📊 Number of projects returned: ${projects.length}`);
    
    // Check if any project belongs to disallowed company names
    const invalidProjects = [];
    for (const p of projects) {
        // Query to check company of the project to verify isolation
        if (p.name.toLowerCase().includes(disallowedCompanySearch.toLowerCase())) {
            invalidProjects.push(p);
        }
    }
    
    if (invalidProjects.length > 0) {
        console.error(`❌ Data Leakage detected! Found projects belonging to disallowed scope:`, invalidProjects);
        throw new Error(`Data Isolation Violated for ${username}`);
    } else {
        console.log(`✅ Project isolation verified: No disallowed projects returned.`);
    }

    // 2. Finance Dashboard
    console.log(`📡 Requesting /api/finance/dashboard...`);
    const financeRes = await axios.get('http://localhost:4000/api/finance/dashboard', {
        headers: { 
            'Authorization': `Bearer ${token}`,
            'x-selected-company': selectedCompany
        }
    });
    console.log(`📈 Finance Dashboard values:`, financeRes.data.data);
}

async function runAllTests() {
    try {
        // MTAYEM should not see Design Concept data
        await testUser('MTAYEM', 'MTAYEM123', 'TED Capital', 'Design Concept');
        
        // MSOBHI should not see TED Capital or PRIMEMED PHARMA data
        await testUser('MSOBHI', 'MSOBHI123', 'Design Concept', 'TED Capital');
        
        console.log(`\n🎉 Success! All data isolation checks passed cleanly!`);
        process.exit(0);
    } catch (err) {
        console.error(`\n❌ Test suite failed:`, err.message);
        if (err.response) {
            console.error(`Response data:`, err.response.data);
        }
        process.exit(1);
    }
}

runAllTests();
