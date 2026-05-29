const pool = require('./backend/config/db');

async function queryUsers() {
    try {
        const res = await pool.query("SELECT id, username, email, active, created_at FROM users ORDER BY id ASC");
        console.log("Registered Users in Database:");
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error("Error querying users database:", err);
        process.exit(1);
    }
}

queryUsers();
