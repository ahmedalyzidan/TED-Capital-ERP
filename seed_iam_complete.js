const pool = require('./backend/config/db');

const permissions = [
    // FINANCE
    { code: 'FIN_VIEW_LEDGER', name: 'عرض الأستاذ العام (General Ledger)', module: 'Finance' },
    { code: 'FIN_POST_ENTRY', name: 'ترحيل القيود المحاسبية', module: 'Finance' },
    { code: 'FIN_MANAGE_ACCOUNTS', name: 'إدارة شجرة الحسابات (COA)', module: 'Finance' },
    { code: 'FIN_CLOSE_PERIOD', name: 'إقفال الفترات المالية', module: 'Finance' },
    { code: 'FIN_VIEW_REPORTS', name: 'عرض التقارير المالية والختامية', module: 'Finance' },
    { code: 'FIN_MANAGE_VOUCHERS', name: 'إدارة السندات (قبض/صرف)', module: 'Finance' },
    
    // CRM & SALES
    { code: 'CRM_VIEW_CLIENTS', name: 'عرض بيانات العملاء', module: 'CRM' },
    { code: 'CRM_MANAGE_LEADS', name: 'إدارة الفرص البيعية', module: 'CRM' },
    { code: 'SALE_CREATE_CONTRACT', name: 'إنشاء عقود البيع', module: 'CRM' },
    { code: 'SALE_APPROVE_DISCOUNT', name: 'اعتماد الخصومات', module: 'CRM' },
    
    // INVENTORY & PROCUREMENT
    { code: 'INV_VIEW_STOCK', name: 'عرض أرصدة المخازن', module: 'Inventory' },
    { code: 'INV_MANAGE_STOCK', name: 'إدارة التحويلات والمخزون', module: 'Inventory' },
    { code: 'INV_ADJUST_STOCK', name: 'تسوية المخزون والجرد', module: 'Inventory' },
    { code: 'PUR_CREATE_PO', name: 'إنشاء طلبات الشراء', module: 'Inventory' },
    { code: 'PUR_APPROVE_PO', name: 'اعتماد أوامر الشراء', module: 'Inventory' },
    
    // PROJECTS & ENGINEERING
    { code: 'PROJ_VIEW_ALL', name: 'عرض كافة المشاريع', module: 'Projects' },
    { code: 'PROJ_CREATE', name: 'إطلاق مشروع جديد', module: 'Projects' },
    { code: 'PROJ_MANAGE_BOQ', name: 'إدارة جداول الكميات (BOQ)', module: 'Projects' },
    { code: 'PROJ_APPROVE_CERT', name: 'اعتماد المستخلصات', module: 'Projects' },
    { code: 'PROJ_MANAGE_TEAM', name: 'إدارة فرق العمل بالموقع', module: 'Projects' },
    
    // HCM (HR)
    { code: 'HR_VIEW_STAFF', name: 'عرض ملفات الموظفين', module: 'HCM' },
    { code: 'HR_MANAGE_PAYROLL', name: 'إدارة مسيرات الرواتب', module: 'HCM' },
    { code: 'HR_APPROVE_LEAVE', name: 'اعتماد الإجازات والغياب', module: 'HCM' },
    { code: 'HR_MANAGE_DOCS', name: 'إدارة الوثائق الحكومية', module: 'HCM' },
    
    // SECURITY & IAM
    { code: 'IAM_MANAGE_USERS', name: 'إدارة حسابات المستخدمين', module: 'Security' },
    { code: 'IAM_MANAGE_ROLES', name: 'إدارة الأدوار ومصفوفة الصلاحيات', module: 'Security' },
    { code: 'IAM_VIEW_AUDIT', name: 'عرض سجل العمليات والأمان', module: 'Security' },
    { code: 'SYS_CONFIG', name: 'إعدادات النظام المتقدمة', module: 'Security' }
];

const defaultRoles = [
    { name: 'Super Admin', description: 'وصول كامل لكافة موديولات النظام (System Owner)', is_system_role: true },
    { name: 'Financial Manager', description: 'إدارة كاملة للمالية والمحاسبة والتقارير', is_system_role: true },
    { name: 'HR Manager', description: 'إدارة الموارد البشرية والرواتب والتوظيف', is_system_role: true },
    { name: 'Inventory Controller', description: 'إدارة المستودعات وحركات الأصناف والمشتريات', is_system_role: true },
    { name: 'Project Director', description: 'إدارة المشاريع والمستخلصات والمقاولين', is_system_role: true }
];

async function seed() {
    console.log("🚀 Starting Comprehensive IAM Seeding...");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // 1. Seed Permissions
        for (const p of permissions) {
            await client.query(`
                INSERT INTO permissions (code, name, module) 
                VALUES ($1, $2, $3) 
                ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, module = EXCLUDED.module
            `, [p.code, p.name, p.module]);
        }
        console.log(`✅ ${permissions.length} Permissions Seeded.`);

        // 2. Seed Roles
        for (const r of defaultRoles) {
            await client.query(`
                INSERT INTO roles (name, description, is_system_role) 
                VALUES ($1, $2, $3) 
                ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, is_system_role = EXCLUDED.is_system_role
            `, [r.name, r.description, r.is_system_role]);
        }
        console.log(`✅ ${defaultRoles.length} Roles Seeded.`);

        // 3. Link ALL Permissions to Super Admin
        const saRole = await client.query("SELECT id FROM roles WHERE name = 'Super Admin'");
        if (saRole.rows.length > 0) {
            const roleId = saRole.rows[0].id;
            const allPerms = await client.query("SELECT id FROM permissions");
            for (const p of allPerms.rows) {
                await client.query(`
                    INSERT INTO role_permissions (role_id, permission_id) 
                    VALUES ($1, $2) 
                    ON CONFLICT DO NOTHING
                `, [roleId, p.id]);
            }
            console.log("⭐ Super Admin Role fully populated with all permissions.");
        }

        // 4. Link Financial Manager permissions
        const fmRole = await client.query("SELECT id FROM roles WHERE name = 'Financial Manager'");
        if (fmRole.rows.length > 0) {
            const roleId = fmRole.rows[0].id;
            const fmPerms = permissions.filter(p => p.module === 'Finance').map(p => p.code);
            for (const code of fmPerms) {
                const p = await client.query("SELECT id FROM permissions WHERE code = $1", [code]);
                if (p.rows.length > 0) {
                    await client.query("INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [roleId, p.rows[0].id]);
                }
            }
            console.log("💰 Financial Manager Role initialized.");
        }

        await client.query("COMMIT");
        console.log("🏁 Seeding Completed Successfully.");
    } catch (e) {
        await client.query("ROLLBACK");
        console.error("❌ Seeding Failed:", e);
    } finally {
        client.release();
        process.exit();
    }
}

seed();
