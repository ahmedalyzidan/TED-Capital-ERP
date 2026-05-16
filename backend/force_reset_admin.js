const pool = require('./config/db');
const bcrypt = require('bcryptjs');

async function reset() {
    const pass = 'admin123';
    const hash = await bcrypt.hash(pass, 10);
    console.log("🔄 Force-resetting 'admin' account...");
    
    try {
        await pool.query(`
            INSERT INTO users (username, email, password_hash, role, status, permissions) 
            VALUES ('admin', 'admin@tedcapital.com', $1, 'Admin', 'Active', '{"screens":["ALL"],"tables":{"ALL":["read","create","update","delete","approve","export","import","print","audit"]}}') 
            ON CONFLICT (username) DO UPDATE SET 
                password_hash = EXCLUDED.password_hash,
                status = 'Active',
                role = 'Admin';
        `, [hash]);
        console.log("✅ Admin account is now ACTIVE with password: " + pass);
        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err.message);
        process.exit(1);
    }
}
reset();
