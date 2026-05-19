const pool = require('./config/db');

async function queryUsers() {
    try {
        const res = await pool.query("SELECT id, username, email, role, status, permissions FROM users ORDER BY username");
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
queryUsers();
