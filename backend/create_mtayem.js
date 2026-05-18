const pool = require('./config/db');
const bcrypt = require('bcryptjs');

async function createMTAYEM() {
    const username = 'MTAYEM';
    const pass = 'MTAYEM123';
    const hash = await bcrypt.hash(pass, 10);
    console.log(`🔄 Checking and seeding '${username}' super admin account...`);
    
    try {
        await pool.query(`
            INSERT INTO users (username, email, password_hash, role, status, permissions) 
            VALUES ($1, 'mtayem@tedcapital.com', $2, 'Super Admin', 'Active', '{"screens":["ALL"],"tables":{"ALL":["read","create","update","delete","approve","export","import","print","audit"]}}') 
            ON CONFLICT (username) DO UPDATE SET 
                password_hash = EXCLUDED.password_hash,
                status = 'Active',
                role = 'Super Admin';
        `, [username, hash]);
        console.log(`✅ User '${username}' created/reset successfully!`);
        console.log(`👉 Username: ${username}`);
        console.log(`👉 Password: ${pass}`);
        process.exit(0);
    } catch (err) {
        console.error("❌ Error seeding user MTAYEM:", err.message);
        process.exit(1);
    }
}
createMTAYEM();
