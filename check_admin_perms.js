const pool = require('./backend/config/db');

async function checkAdmin() {
    try {
        const userRes = await pool.query("SELECT * FROM users WHERE username = 'admin'");
        console.log("Admin User Data:", userRes.rows[0]);

        const roleRes = await pool.query(`
            SELECT r.* 
            FROM roles r
            JOIN user_roles ur ON r.id = ur.role_id
            WHERE ur.user_id = $1
        `, [userRes.rows[0].id]);
        console.log("Admin Roles:", roleRes.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkAdmin();
