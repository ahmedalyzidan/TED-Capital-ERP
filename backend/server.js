require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const app = express();

// 1. الأساسيات (Basics)
app.use(cors({ 
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
    allowedHeaders: ['Content-Type', 'Authorization'], 
    credentials: true 
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 🌟 Request Logger for Debugging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// استدعاء الإعدادات والأدوات
const pool = require('./config/db');
const { authenticateToken } = require('./middlewares/auth');
const { startCronJobs } = require('./services/cron');

// استدعاء مسارات الـ API التي أنشأناها
const authRoutes = require('./routes/authRoutes');
const systemRoutes = require('./routes/systemRoutes');
const reportRoutes = require('./routes/reportRoutes');
const apiRoutes = require('./routes/apiRoutes');
const financeRoutes = require('./routes/financeRoutes');
const userRoutes = require('./routes/userRoutes');

// منع السيرفر من الانهيار عند الأخطاء
process.on('uncaughtException', (err) => console.error('🔥 CRITICAL ERROR:', err.message));
process.on('unhandledRejection', (reason) => console.error('🔥 CRITICAL ERROR:', reason));

// تجهيز مسار رفع المرفقات
const uploadsPath = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });
app.use('/uploads', express.static(uploadsPath));


// دالة تهيئة قاعدة البيانات والتأكد من وجود الأدمن
const { applySchemaFixes } = require('./config/schemaFixes');

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
                must_change_password BOOLEAN DEFAULT FALSE,
                last_password_change TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Ensure columns exist for existing installations
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255)");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100)");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50)");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS linked_employee_id INTEGER");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor BOOLEAN DEFAULT FALSE");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT FALSE");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS linked_company VARCHAR(255)");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS linked_project VARCHAR(255)");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_org_unit_id INTEGER");

        const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@tedcapital.com';
        const initialAdminPass = process.env.INITIAL_ADMIN_PASSWORD || 'admin123';
        const defaultPasswordHash = await bcrypt.hash(initialAdminPass, 10);
        
        await pool.query(`
            INSERT INTO users (username, email, password_hash, role, status, permissions, must_change_password, is_superadmin) 
            VALUES ('admin', $2, $1, 'Super Admin', 'Active', '{"screens":["ALL"],"tables":{"ALL":["read","create","update","delete","approve","export","import","print","audit"]}}', TRUE, TRUE) 
            ON CONFLICT (username) DO UPDATE SET 
                role = EXCLUDED.role, 
                is_superadmin = EXCLUDED.is_superadmin, 
                permissions = EXCLUDED.permissions 
            -- Note: We DO NOT update password_hash here to avoid resetting user-changed passwords on deploy
        `, [defaultPasswordHash, initialAdminEmail]);

        // 2. Ensuring Roles Table and Super Admin Role
        await pool.query(`CREATE TABLE IF NOT EXISTS roles (id SERIAL PRIMARY KEY, name VARCHAR(100) UNIQUE, description TEXT, is_system_role BOOLEAN DEFAULT FALSE)`);
        await pool.query(`INSERT INTO roles (name, description, is_system_role) VALUES ('Super Admin', 'Full system access', TRUE) ON CONFLICT (name) DO NOTHING`);

        const superAdminRole = await pool.query("SELECT id FROM roles WHERE name = 'Super Admin'");
        const adminUser = await pool.query("SELECT id FROM users WHERE username = 'admin'");

        if (superAdminRole.rows.length > 0 && adminUser.rows.length > 0) {
            await pool.query(`CREATE TABLE IF NOT EXISTS user_roles (user_id INTEGER, role_id INTEGER, PRIMARY KEY(user_id, role_id))`);
            await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [adminUser.rows[0].id, superAdminRole.rows[0].id]);
        }

        // --- Workflow Fixes ---
        await pool.query("ALTER TABLE workflow_instances ADD COLUMN IF NOT EXISTS amount NUMERIC(20,6) DEFAULT 0");
        await pool.query("ALTER TABLE workflow_instances ADD COLUMN IF NOT EXISTS module_name VARCHAR(100)");
        await pool.query("ALTER TABLE workflow_definitions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE");
        await pool.query("ALTER TABLE workflow_definitions ADD COLUMN IF NOT EXISTS auto_approve_below NUMERIC(20,6) DEFAULT 0");

        console.log("✅ Database, IAM Roles, and default Admin verified successfully.");

        // تطبيق إصلاحات الجدول وتهيئة شجرة الحسابات
        await applySchemaFixes();

        // تم إزالة startCronJobs() من هنا لنقلها للأسفل
    } catch (e) { console.log("⚠️ DB Init Notice:", e.message); }
};
initDB();

// ================= تسجيل المسارات (Routes) =================

app.use('/api', authRoutes);

app.use('/api', authenticateToken);

const { enforceCompanyIsolation } = require('./middlewares/companyIsolationMiddleware');
app.use('/api', enforceCompanyIsolation);

// 3. المسارات الموديلار (Modular Routes)
const inventoryRoutes = require('./routes/inventoryRoutes');
const projectRoutes = require('./routes/projectRoutes');
const subcontractorRoutes = require('./routes/subcontractorRoutes');
const realEstateRoutes = require('./routes/realEstateRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const customerRoutes = require('./routes/customerRoutes');
const fileRoutes = require('./routes/fileRoutes');
const dynamicRoutes = require('./routes/dynamicRoutes');
const hcmRoutes = require('./routes/hcmRoutes');

const expenseRoutes = require('./routes/expenseRoutes');

app.use('/api/system', systemRoutes);
app.use('/api/hcm', hcmRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/subcontractors', subcontractorRoutes);
app.use('/api/real-estate', realEstateRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/clients', customerRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/user', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/dynamic', dynamicRoutes);
app.use('/api/communication', require('./routes/communicationRoutes'));
app.use('/api/custodies', require('./routes/custodyRoutes'));

// المسار القديم للتوافق المؤقت (سيتم حذفه لاحقاً)
app.use('/api', apiRoutes);

// 4. Health Check Endpoint
app.get('/api/health', async (req, res) => {
    try {
        const dbCheck = await pool.query('SELECT NOW()');
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: 'connected',
            uptime: process.uptime(),
            env: process.env.NODE_ENV
        });
    } catch (err) {
        res.status(500).json({
            status: 'degraded',
            database: 'disconnected',
            error: err.message
        });
    }
});

app.get('/api/debug-routes', (req, res) => {
    const routes = [];
    app._router.stack.forEach(middleware => {
        if (middleware.route) { routes.push(`${Object.keys(middleware.route.methods)} ${middleware.route.path}`); }
        else if (middleware.name === 'router') {
            middleware.handle.stack.forEach(handler => {
                if (handler.route) { routes.push(`${Object.keys(handler.route.methods)} ${middleware.regexp} ${handler.route.path}`); }
            });
        }
    });
    res.json(routes);
});

// ================= ربط الواجهة الأمامية (Frontend) =================
const clientPath = path.join(__dirname, 'client/dist');
if (fs.existsSync(clientPath)) {
    app.use(express.static(clientPath));
    app.get('/*any', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(clientPath, 'index.html'));
        }
    });
} else {
    app.get('/', (req, res) => res.send('🚀 TED CAPITAL ERP API is running. Frontend build not found. Use npm run dev in client folder.'));
}

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('🔥 [GLOBAL ERROR]:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// تشغيل السيرفر
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`🚀 TED CAPITAL ERP Server running on http://localhost:${PORT}`);

    // 🌟 إطلاق المهام المجدولة فور عمل الخادم وتجهيزه
    startCronJobs();

    // 📱 تهيئة خدمة الواتساب المحلية (Self-Hosted) إذا كانت مفعلة في الإعدادات
    const selfHostedWhatsapp = require('./services/selfHostedWhatsapp');
    pool.query("SELECT whatsapp_enabled, metadata FROM settings LIMIT 1")
        .then(res => {
            if (res.rows.length > 0) {
                const settings = res.rows[0];
                const metadata = settings.metadata || {};
                if (settings.whatsapp_enabled && metadata.whatsapp_type === 'self-hosted') {
                    console.log("📱 [WhatsApp Startup] Initializing self-hosted WhatsApp client...");
                    selfHostedWhatsapp.initialize();
                }
            }
        })
        .catch(err => console.error("⚠️ [WhatsApp Startup Error]:", err.message));
});