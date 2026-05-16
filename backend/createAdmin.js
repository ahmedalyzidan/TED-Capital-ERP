
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// الاتصال بقاعدة البيانات بناءً على ملف .env الخاص بك
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'erp_db',
    password: process.env.DB_PASSWORD || '1985',
    port: process.env.DB_PORT || 5432,
});

async function createDefaultAdmin() {
    try {
        console.log("⏳ Checking for admin user...");
        
        const check = await pool.query("SELECT * FROM users WHERE username = 'admin'");
        
        if (check.rows.length === 0) {
            // تشفير كلمة المرور الافتراضية
            const hash = await bcrypt.hash('admin123', 10); 
            
            // زرع بيانات المدير في قاعدة البيانات
            await pool.query(
                "INSERT INTO users (username, password_hash, email, role, status, permissions) VALUES ($1, $2, $3, $4, $5, $6)",
                ['admin', hash, 'admin@tedcapital.com', 'Admin', 'Active', JSON.stringify({ tables: { ALL: true } })]
            );
            
            console.log("✅ Default Admin User created successfully!");
            console.log("👉 Username: admin");
            console.log("👉 Password: admin123");
        } else {
            console.log("⚠️ Admin user already exists. You can log in.");
        }
    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        pool.end(); // إنهاء الاتصال
    }
}

createDefaultAdmin();