const pool = require('./config/db');
const bcrypt = require('bcryptjs');

async function fix() {
    try {
        const hash = await bcrypt.hash('admin123', 10);
        await pool.query("UPDATE users SET password_hash = $1 WHERE username = $2", [hash, 'admin']);
        console.log("✅ Admin password updated to 'admin123'");
        process.exit(0);
    } catch (e) {
        console.error("❌ Fix failed:", e);
        process.exit(1);
    }
}

fix();
