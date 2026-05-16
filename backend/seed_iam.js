require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./config/db');

const permissions = [
    // Finance
    { module: 'Finance', name: 'عرض الحسابات', code: 'FIN_VIEW_ACCOUNTS' },
    { module: 'Finance', name: 'عرض الأستاذ العام', code: 'FIN_VIEW_LEDGER' },
    { module: 'Finance', name: 'ترحيل القيود', code: 'FIN_POST_ENTRY' },
    { module: 'Finance', name: 'إقفال الفترات', code: 'FIN_CLOSE_PERIOD' },
    
    // Inventory
    { module: 'Inventory', name: 'عرض المخزون', code: 'INV_VIEW_STOCK' },
    { module: 'Inventory', name: 'إدارة المخازن', code: 'INV_MANAGE_STOCK' },
    { module: 'Inventory', name: 'أوامر الشراء', code: 'INV_PURCHASE_ORDERS' },
    { module: 'Inventory', name: 'إرسال بريد طلبات الشراء', code: 'INV_MAIL_PO' },
    
    // HR
    { module: 'HR', name: 'عرض الموظفين', code: 'HR_VIEW_STAFF' },
    { module: 'HR', name: 'إدارة الرواتب', code: 'HR_MANAGE_PAYROLL' },
    
    // Projects & Companies
    { module: 'Projects', name: 'عرض كافة المشاريع', code: 'PROJ_VIEW_ALL' },
    { module: 'Projects', name: 'عرض مشاريع الفرع فقط', code: 'PROJ_VIEW_BRANCH' },
    { module: 'Projects', name: 'إدارة المشاريع', code: 'PROJ_MANAGE' },
    { module: 'Projects', name: 'اعتماد المستخلصات', code: 'PROJ_APPROVE_INV' },
    
    // IAM
    { module: 'IAM', name: 'إدارة المستخدمين', code: 'IAM_MANAGE_USERS' },
    { module: 'IAM', name: 'إدارة الأدوار', code: 'IAM_MANAGE_ROLES' },
    { module: 'IAM', name: 'مراقبة سجل الأمان', code: 'IAM_VIEW_AUDIT' }
];

async function seed() {
    try {
        console.log("🌱 Seeding IAM Permissions...");
        for (const p of permissions) {
            await pool.query(`
                INSERT INTO permissions (module, name, code) 
                VALUES ($1, $2, $3) 
                ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, module = EXCLUDED.module
            `, [p.module, p.name, p.code]);
        }
        console.log("✅ Permissions seeded successfully.");

        // Check if audit table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS security_audit_trail (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                username VARCHAR(50),
                action VARCHAR(50),
                resource TEXT,
                impact_level VARCHAR(20),
                ip_address VARCHAR(45),
                details JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Security audit table verified.");

    } catch (err) {
        console.error("❌ Seeding failed:", err.message);
    } finally {
        process.exit();
    }
}

seed();
