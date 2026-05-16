const axios = require('axios');
const jwt = require('jsonwebtoken');

async function test() {
    try {
        const token = jwt.sign({ username: 'admin', role: 'Admin' }, 'ted-capital-super-secure-key-2026-v2', { expiresIn: '1h' });
        const res = await axios.get('http://localhost:4000/api/mpo-360/MPO-404519', {
            headers: { Authorization: "Bearer " + token }
        });
        console.log("Success!", res.status);
    } catch (e) {
        console.error("API Error:", e.response ? e.response.data : e.message);
    }
}
test();
