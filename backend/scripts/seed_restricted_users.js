const pool = require('../config/db');
const bcrypt = require('bcryptjs');

async function seedRestrictedUsers() {
    console.log("🔄 Starting restricted users seeding...");

    const users = [
        {
            username: 'MTAYEM',
            pass: 'MTAYEM123',
            email: 'mtayem@tedcapital.com'
        },
        {
            username: 'MSOBHI',
            pass: 'MSOBHI123',
            email: 'msobhi@tedcapital.com'
        }
    ];

    try {
        for (const u of users) {
            const hash = await bcrypt.hash(u.pass, 10);
            await pool.query(`
                INSERT INTO users (username, email, password_hash, role, status, permissions) 
                VALUES ($1, $2, $3, 'Super Admin', 'Active', '{"screens":["ALL"],"tables":{"ALL":["read","create","update","delete","approve","export","import","print","audit"]}}') 
                ON CONFLICT (username) DO UPDATE SET 
                    password_hash = EXCLUDED.password_hash,
                    status = 'Active',
                    role = 'Super Admin',
                    permissions = EXCLUDED.permissions;
            `, [u.username, u.email, hash]);
            console.log(`✅ User '${u.username}' created/reset successfully with password '${u.pass}'!`);
        }
        console.log("🎉 Seeding completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error seeding restricted users:", err.message);
        process.exit(1);
    }
}

seedRestrictedUsers();
