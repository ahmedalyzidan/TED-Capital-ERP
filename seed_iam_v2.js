const pool = require('./backend/config/db');

const permissions = [
    // FINANCE
    { code: 'FIN_VIEW_LEDGER', name: 'عرض الأستاذ العام', module: 'FINANCE' },
    { code: 'FIN_POST_ENTRY', name: 'ترحيل القيود', module: 'FINANCE' },
    { code: 'FIN_MANAGE_ACCOUNTS', name: 'إدارة الحسابات', module: 'FINANCE' },
    { code: 'FIN_CLOSE_PERIOD', name: 'إقفال الفترات المالية', module: 'FINANCE' },
    { code: 'FIN_VIEW_REPORTS', name: 'عرض التقارير المالية', module: 'FINANCE' },
    
    // PROJECTS
    { code: 'PROJ_VIEW_ALL', name: 'عرض كافة المشاريع', module: 'PROJECTS' },
    { code: 'PROJ_VIEW_BRANCH', name: 'عرض مشاريع الفرع', module: 'PROJECTS' },
    { code: 'PROJ_CREATE', name: 'إنشاء مشروع جديد', module: 'PROJECTS' },
    { code: 'PROJ_EDIT', name: 'تعديل المشاريع', module: 'PROJECTS' },
    { code: 'PROJ_MANAGE_FINANCE', name: 'إدارة ماليات المشاريع', module: 'PROJECTS' },
    
    // INVENTORY
    { code: 'INV_VIEW', name: 'عرض المخزون', module: 'INVENTORY' },
    { code: 'INV_MANAGE_STOCK', name: 'إدارة حركة الأصناف', module: 'INVENTORY' },
    { code: 'INV_ADJUST', name: 'تسوية المخزون', module: 'INVENTORY' },
    
    // PROCUREMENT
    { code: 'PUR_VIEW', name: 'عرض المشتريات', module: 'PROCUREMENT' },
    { code: 'PUR_CREATE_PO', name: 'إنشاء طلبات شراء', module: 'PROCUREMENT' },
    { code: 'PUR_APPROVE_PO', name: 'اعتماد طلبات الشراء', module: 'PROCUREMENT' },
    
    // SALES & REAL ESTATE
    { code: 'SALE_VIEW', name: 'عرض المبيعات', module: 'SALES' },
    { code: 'SALE_CREATE_CONTRACT', name: 'إنشاء عقود بيع', module: 'SALES' },
    { code: 'SALE_MANAGE_PAYMENTS', name: 'إدارة تحصيل الأقساط', module: 'SALES' },
    
    // HR
    { code: 'HR_VIEW_STAFF', name: 'عرض بيانات الموظفين', module: 'HR' },
    { code: 'HR_MANAGE_PAYROLL', name: 'إدارة الرواتب', module: 'HR' },
    
    // IAM
    { code: 'IAM_MANAGE_USERS', name: 'إدارة المستخدمين', module: 'IAM' },
    { code: 'IAM_MANAGE_ROLES', name: 'إدارة الأدوار والصلاحيات', module: 'IAM' },
    { code: 'IAM_VIEW_AUDIT', name: 'مراقبة سجل النظام', module: 'IAM' }
];

const roles = [
    { name: 'SuperAdmin', description: 'مدير النظام الكامل مع كافة الصلاحيات' },
    { name: 'Accountant', description: 'المحاسب المسؤول عن القيود والتقارير المالية' },
    { name: 'ProjectManager', description: 'مدير المشروع المسؤول عن الموقع والعمالة' },
    { name: 'SalesAgent', description: 'مسؤول المبيعات والتعاقدات' }
];

async function seed() {
    console.log("🌱 Seeding Professional IAM Matrix...");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // 1. Insert Permissions
        for (const p of permissions) {
            await client.query(`
                INSERT INTO permissions (code, name, module) 
                VALUES ($1, $2, $3) 
                ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, module = EXCLUDED.module
            `, [p.code, p.name, p.module]);
        }
        console.log(`✅ ${permissions.length} Permissions Seeded.`);

        // 2. Insert Roles
        for (const r of roles) {
            await client.query(`
                INSERT INTO roles (name, description) 
                VALUES ($1, $2) 
                ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
            `, [r.name, r.description]);
        }
        console.log(`✅ ${roles.length} Roles Seeded.`);

        // 3. Auto-Assign ALL permissions to SuperAdmin
        const adminRes = await client.query("SELECT id FROM roles WHERE name = 'SuperAdmin'");
        const allPerms = await client.query("SELECT id FROM permissions");
        
        if (adminRes.rows.length > 0) {
            const roleId = adminRes.rows[0].id;
            for (const p of allPerms.rows) {
                await client.query(`
                    INSERT INTO role_permissions (role_id, permission_id) 
                    VALUES ($1, $2) 
                    ON CONFLICT DO NOTHING
                `, [roleId, p.id]);
            }
            console.log("⭐ SuperAdmin Role Granted All Permissions.");
        }

        // 4. Assign Basic permissions to Accountant
        const accRes = await client.query("SELECT id FROM roles WHERE name = 'Accountant'");
        if (accRes.rows.length > 0) {
            const roleId = accRes.rows[0].id;
            const accPermCodes = ['FIN_VIEW_LEDGER', 'FIN_POST_ENTRY', 'FIN_MANAGE_ACCOUNTS', 'FIN_VIEW_REPORTS', 'SALE_MANAGE_PAYMENTS'];
            for (const code of accPermCodes) {
                const pRes = await client.query("SELECT id FROM permissions WHERE code = $1", [code]);
                if (pRes.rows.length > 0) {
                    await client.query("INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [roleId, pRes.rows[0].id]);
                }
            }
            console.log("💼 Accountant Role Initialized with Financial Permissions.");
        }

        await client.query("COMMIT");
    } catch (e) {
        await client.query("ROLLBACK");
        console.error("❌ Seeding Error:", e);
    } finally {
        client.release();
        process.exit();
    }
}

seed();
