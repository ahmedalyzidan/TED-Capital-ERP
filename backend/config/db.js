const { Pool } = require('pg');
require('dotenv').config(); // 1. ربط ملف الـ .env

// 2. استخدام NODE_ENV لتحديد بيئة العمل بدقة
const isProduction = process.env.NODE_ENV === 'production';

// 3. إعدادات الاتصال الديناميكية
const poolConfig = isProduction 
    ? {
        // إذا كنا على الكلاود
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } 
      }
    : {
        // إذا كنا على الجهاز المحلي (يقرأ من .env)
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE, 
        password: String(process.env.DB_PASSWORD), // تحويل صريح للنص
        port: process.env.DB_PORT,
      };

// 4. تعريف الـ pool مرة واحدة فقط
const pool = new Pool(poolConfig);

pool.on('error', (err, client) => {
    console.error('🔥 Unexpected Database Error on idle client:', err.message);
}); // تم إصلاح القوس الناقص

// 5. فحص الاتصال للتأكيد
pool.query('SELECT NOW()', (err) => {
    if (err) {
        console.error('🔥 Database Connection Failed:', err.message);
    } else {
        console.log(`✅ Connected to ${isProduction ? 'Supabase' : 'Local'} PostgreSQL DB`);
    }
});

// 6. تصدير الملف
module.exports = pool;