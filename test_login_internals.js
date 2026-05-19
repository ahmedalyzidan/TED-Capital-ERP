const pool = require('./backend/config/db');
const bcrypt = require('bcryptjs');

async function test() {
    try {
        console.log("Querying user...");
        const userRes = await pool.query("SELECT * FROM users WHERE LOWER(username) = LOWER($1) AND status = 'Active'", ['MTAYEM']);
        console.log("User query finished. Rows:", userRes.rows.length);
        if (userRes.rows.length === 0) return;
        const user = userRes.rows[0];
        
        console.log("Comparing password...");
        const isMatch = await bcrypt.compare('MTAYEM123', user.password_hash);
        console.log("Password compare finished. Match:", isMatch);
        
        console.log("Inserting audit log...");
        await pool.query(
            "INSERT INTO audit_logs (username, action, table_name, record_id, details, timestamp) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)",
            [user.username, 'LOGIN', 'users', String(user.id), 'User logged into the system.']
        );
        console.log("Audit log insert finished.");
    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit(0);
    }
}
test();
