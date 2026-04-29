require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// استدعاء الإعدادات والأدوات
const pool = require('./config/db');
const { authenticateToken } = require('./middlewares/auth');
const { startCronJobs } = require('./services/cron');

// استدعاء مسارات الـ API التي أنشأناها
const authRoutes = require('./routes/authRoutes');
const systemRoutes = require('./routes/systemRoutes');
const reportRoutes = require('./routes/reportRoutes');
const apiRoutes = require('./routes/apiRoutes');

// منع السيرفر من الانهيار عند الأخطاء
process.on('uncaughtException', (err) => console.error('🔥 CRITICAL ERROR:', err.message));
process.on('unhandledRejection', (reason) => console.error('🔥 CRITICAL ERROR:', reason));

const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));

// إضافة الحد الأقصى للبيانات لتفادي مشاكل رفع الملفات والنصوص الطويلة
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// تجهيز مسار رفع المرفقات
const uploadsPath = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });
app.use('/uploads', express.static(uploadsPath));

// دالة تهيئة قاعدة البيانات والتأكد من وجود الأدمن
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(255),
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'Engineer',
                status VARCHAR(20) NOT NULL DEFAULT 'Active',
                permissions JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const defaultPasswordHash = await bcrypt.hash('1985', 10);
        await pool.query(`
            INSERT INTO users (username, email, password_hash, role, status, permissions) 
            VALUES ('admin', 'admin@tedcapital.com', $1, 'Admin', 'Active', '{"screens":["ALL"],"tables":{"ALL":["read","create","update","delete","approve","export","import","print","audit"]}}') 
            ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;
        `, [defaultPasswordHash]);

        console.log("✅ Database and default Admin verified successfully.");
        startCronJobs(); 
    } catch(e) { console.log("⚠️ DB Init Notice:", e.message); }
};
initDB();

// ================= تسجيل المسارات (Routes) =================

// 1. مسار تسجيل الدخول أولاً (لا يحتاج لتوكن)
app.use('/api', authRoutes);                 

// 2. التحقق من التوكن (أي مسار بعد هذا السطر سيكون محمي ومغلق لغير المسجلين)
app.use('/api', authenticateToken);          

// 3. باقي المسارات المحمية
app.use('/api/system', systemRoutes);        
app.use('/api', reportRoutes);               
app.use('/api', apiRoutes);                  

// ================= ربط الواجهة الأمامية (Frontend) =================
app.use(express.static(path.join(__dirname, '../frontend')));
app.use((req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

// تشغيل السيرفر
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`🚀 TED CAPITAL ERP Server running on http://localhost:${PORT}`);
});