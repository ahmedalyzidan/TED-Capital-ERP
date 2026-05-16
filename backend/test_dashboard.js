const axios = require('axios');
async function test() {
    try {
        console.log("Calling /api/finance/dashboard...");
        const res = await axios.get('http://localhost:4000/api/finance/dashboard', {
            headers: { 'Authorization': 'Bearer test' }
        });
        console.log("Dashboard Result:", JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.log("Error:", e.response ? e.response.status : e.message);
    }
}
test();
