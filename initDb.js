// initDb.js
require('dotenv').config();
const { Pool } = require('pg');

// تهيئة الاتصال بقاعدة البيانات
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'erp_db',
    password: process.env.DB_PASS || '1985',
    port: process.env.DB_PORT || 5432,
});

async function initializeDatabase() {
    console.log("🚀 Starting TED ERP Database Schema Initialization...");
    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // نبدأ Transaction لضمان تطبيق كل شيء أو التراجع في حال الخطأ

        // =========================================================================
        // 1. Core System & Logs Tables
        // =========================================================================
        console.log("📦 Creating Core & Logs Tables...");
        await client.query(`CREATE TABLE IF NOT EXISTS system_parameters (id SERIAL PRIMARY KEY, category VARCHAR(255), value VARCHAR(255))`);
        await client.query(`CREATE TABLE IF NOT EXISTS email_logs (id SERIAL PRIMARY KEY, recipient VARCHAR(255), to_email VARCHAR(255), subject VARCHAR(255), body TEXT, sent_by VARCHAR(100), status VARCHAR(50), sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await client.query(`CREATE TABLE IF NOT EXISTS email_triggers_config (id SERIAL PRIMARY KEY, trigger_type VARCHAR(100) UNIQUE, is_active BOOLEAN DEFAULT false)`);
        await client.query(`CREATE TABLE IF NOT EXISTS backups_log (id SERIAL PRIMARY KEY, name VARCHAR(255), date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, size VARCHAR(50), source VARCHAR(50), local_directory VARCHAR(255))`);
        await client.query(`CREATE TABLE IF NOT EXISTS attachments (id SERIAL PRIMARY KEY, table_name VARCHAR(50), record_id INT, file_name VARCHAR(255), file_path TEXT, uploaded_by VARCHAR(100), uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await client.query(`CREATE TABLE IF NOT EXISTS audit_logs (id SERIAL PRIMARY KEY, username VARCHAR(255), action VARCHAR(100), table_name VARCHAR(100), record_id INT, details TEXT, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await client.query(`CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, user_id INT, title VARCHAR(255), message TEXT, is_read BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

        // =========================================================================
        // 2. Users, Customers & Entities
        // =========================================================================
        console.log("👥 Creating & Updating Users and Entities Tables...");
        await client.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(255), password_hash VARCHAR(255), email VARCHAR(255), role VARCHAR(50), status VARCHAR(50) DEFAULT 'Active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await client.query(`CREATE TABLE IF NOT EXISTS customers (id SERIAL PRIMARY KEY, name VARCHAR(255), phone VARCHAR(100), email VARCHAR(255), address TEXT, status VARCHAR(50) DEFAULT 'Active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        
        // تحديث جداول الكيانات بالأعمدة الجديدة
        const entityAlters = [
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS linked_company VARCHAR(255), ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb`,
            `ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_name VARCHAR(255), ADD COLUMN IF NOT EXISTS legal_id VARCHAR(100), ADD COLUMN IF NOT EXISTS customer_type VARCHAR(100), ADD COLUMN IF NOT EXISTS referral VARCHAR(100), ADD COLUMN IF NOT EXISTS customer_since DATE, ADD COLUMN IF NOT EXISTS product VARCHAR(255), ADD COLUMN IF NOT EXISTS credit_limit NUMERIC DEFAULT 0, ADD COLUMN IF NOT EXISTS credit_balance NUMERIC DEFAULT 0`,
            `ALTER TABLE projects ADD COLUMN IF NOT EXISTS company VARCHAR(255), ADD COLUMN IF NOT EXISTS budget_fcy NUMERIC DEFAULT 0, ADD COLUMN IF NOT EXISTS fx_rate NUMERIC DEFAULT 1, ADD COLUMN IF NOT EXISTS management_pct NUMERIC DEFAULT 0, ADD COLUMN IF NOT EXISTS partners_pct NUMERIC DEFAULT 100`,
            `ALTER TABLE staff ADD COLUMN IF NOT EXISTS company VARCHAR(255)`,
            `ALTER TABLE rfq ADD COLUMN IF NOT EXISTS company VARCHAR(255)`
        ];
        for (let query of entityAlters) await client.query(query);

        // =========================================================================
        // 3. Accounting, Ledger & Partners
        // =========================================================================
        console.log("💰 Setting up Financial & Accounting Schemas...");
        await client.query(`CREATE TABLE IF NOT EXISTS gl_mappings (id SERIAL PRIMARY KEY, transaction_type VARCHAR(255), debit_account VARCHAR(255), credit_account VARCHAR(255), cost_center_required BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await client.query(`CREATE TABLE IF NOT EXISTS ledger (id SERIAL PRIMARY KEY, date DATE DEFAULT CURRENT_DATE, account_name VARCHAR(255), cost_center VARCHAR(255), debit NUMERIC DEFAULT 0, credit NUMERIC DEFAULT 0, description TEXT, created_by VARCHAR(100), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        
        // تعديل أنواع البيانات لتتحمل أرقام بالمليارات (Numeric Overflow Fix)
        await client.query(`ALTER TABLE ledger ALTER COLUMN debit TYPE NUMERIC, ALTER COLUMN credit TYPE NUMERIC`);

        await client.query(`ALTER TABLE partners ADD COLUMN IF NOT EXISTS partner_type VARCHAR(50) DEFAULT 'Partner', ADD COLUMN IF NOT EXISTS management_rate NUMERIC DEFAULT 0, ADD COLUMN IF NOT EXISTS expected_profit_rate NUMERIC DEFAULT 0, ADD COLUMN IF NOT EXISTS investment_amount NUMERIC DEFAULT 0`);
        await client.query(`ALTER TABLE partner_deposits ADD COLUMN IF NOT EXISTS amount_fcy NUMERIC DEFAULT 0, ADD COLUMN IF NOT EXISTS fx_rate NUMERIC DEFAULT 1`);
        await client.query(`ALTER TABLE partner_withdrawals ADD COLUMN IF NOT EXISTS amount_fcy NUMERIC DEFAULT 0, ADD COLUMN IF NOT EXISTS fx_rate NUMERIC DEFAULT 1`);

        // =========================================================================
        // 4. Inventory, Procurement & Supply Chain
        // =========================================================================
        console.log("📦 Initializing Inventory & Procurement...");
        await client.query(`CREATE TABLE IF NOT EXISTS po_ddp_charges (id SERIAL PRIMARY KEY, po_id INT, date DATE, amount NUMERIC DEFAULT 0, description VARCHAR(255), created_by VARCHAR(100), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await client.query(`CREATE TABLE IF NOT EXISTS po_ddp_lcy_charges (id SERIAL PRIMARY KEY, po_id INT, date DATE, amount_fcy NUMERIC DEFAULT 0, fx_rate NUMERIC DEFAULT 1, amount NUMERIC DEFAULT 0, description VARCHAR(255), created_by VARCHAR(100), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await client.query(`CREATE TABLE IF NOT EXISTS inventory_sales (id SERIAL PRIMARY KEY, inventory_id INT, date DATE, customer_name VARCHAR(255), project_name VARCHAR(255), item_name VARCHAR(255), qty NUMERIC, buy_price NUMERIC, sell_price NUMERIC, created_by VARCHAR(100), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await client.query(`CREATE TABLE IF NOT EXISTS rtv_transactions (id SERIAL PRIMARY KEY, po_id INT, inventory_id INT, qty NUMERIC, value NUMERIC, date DATE, reason TEXT, created_by VARCHAR(100), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        
        await client.query(`ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS uom VARCHAR(100), ADD COLUMN IF NOT EXISTS specification VARCHAR(255), ADD COLUMN IF NOT EXISTS fx_rate NUMERIC DEFAULT 1`);
        await client.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS batch_no VARCHAR(100), ADD COLUMN IF NOT EXISTS warehouse VARCHAR(100) DEFAULT 'Main Store', ADD COLUMN IF NOT EXISTS po_id INT, ADD COLUMN IF NOT EXISTS uom VARCHAR(50)`);
        
        // إجبار التحديث للجداول الموجودة مسبقاً
        await client.query(`ALTER TABLE po_ddp_lcy_charges ADD COLUMN IF NOT EXISTS amount_fcy NUMERIC DEFAULT 0, ADD COLUMN IF NOT EXISTS fx_rate NUMERIC DEFAULT 1`);

        // =========================================================================
        // 6. Contracts, Real Estate & Client Operations
        // =========================================================================
        console.log("🏢 Setting up Contracts & Client Operations...");
        await client.query(`CREATE TABLE IF NOT EXISTS client_preorders (id SERIAL PRIMARY KEY, client_id INT, po_id INT, reserved_qty NUMERIC, unit_price NUMERIC, advance_payment NUMERIC, status VARCHAR(50) DEFAULT 'Pending')`);
        await client.query(`CREATE TABLE IF NOT EXISTS client_refunds (id SERIAL PRIMARY KEY, client_id INT, amount NUMERIC, date DATE, method VARCHAR(50), notes TEXT, created_by VARCHAR(100), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await client.query(`CREATE TABLE IF NOT EXISTS client_delayed_payments (id SERIAL PRIMARY KEY, client_id INT, amount NUMERIC, original_amount NUMERIC, due_date DATE, status VARCHAR(50) DEFAULT 'Pending', inventory_id INT, consumed_qty NUMERIC, paid_amount NUMERIC DEFAULT 0, last_payment_date DATE, consumption_id INT, payment_history JSONB DEFAULT '[]'::jsonb, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await client.query(`CREATE TABLE IF NOT EXISTS client_consumptions (id SERIAL PRIMARY KEY, client_id INT, inventory_id INT, consumed_qty NUMERIC, paid_amount NUMERIC DEFAULT 0, outstanding_balance NUMERIC, outstanding_date DATE, total_revenue NUMERIC DEFAULT 0, created_by VARCHAR(100), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await client.query(`CREATE TABLE IF NOT EXISTS client_payment_history (id SERIAL PRIMARY KEY, client_id INT, delayed_payment_id INT, amount_paid NUMERIC, payment_method VARCHAR(50), reference_no VARCHAR(255), payment_date DATE DEFAULT CURRENT_DATE)`);

        // إجبار التحديث لجدول سجل المدفوعات الموجود مسبقاً
        await client.query(`ALTER TABLE client_payment_history ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50), ADD COLUMN IF NOT EXISTS reference_no VARCHAR(255)`);

        await client.query(`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS duration_years NUMERIC, ADD COLUMN IF NOT EXISTS payment_frequency VARCHAR(50), ADD COLUMN IF NOT EXISTS grace_period_days INT, ADD COLUMN IF NOT EXISTS penalty_rate NUMERIC, ADD COLUMN IF NOT EXISTS contract_type VARCHAR(50), ADD COLUMN IF NOT EXISTS handover_date DATE, ADD COLUMN IF NOT EXISTS sales_rep VARCHAR(255), ADD COLUMN IF NOT EXISTS notes TEXT, ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active', ADD COLUMN IF NOT EXISTS project_name VARCHAR(255), ADD COLUMN IF NOT EXISTS project_id INT`);
        await client.query(`ALTER TABLE installments ADD COLUMN IF NOT EXISTS installment_no VARCHAR(100), ADD COLUMN IF NOT EXISTS unit_number VARCHAR(100), ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0, ADD COLUMN IF NOT EXISTS penalty_rate NUMERIC DEFAULT 0.05`);
        await client.query(`ALTER TABLE payment_receipts ADD COLUMN IF NOT EXISTS outstanding_amount NUMERIC DEFAULT 0, ADD COLUMN IF NOT EXISTS installment_no VARCHAR(100), ADD COLUMN IF NOT EXISTS unit_number VARCHAR(100)`);
        await client.query(`ALTER TABLE property_units ADD COLUMN IF NOT EXISTS building_no VARCHAR(100)`);

        // إصلاح قيود جداول الاستهلاكات
        try { await client.query(`ALTER TABLE client_consumptions DROP CONSTRAINT IF EXISTS client_consumptions_outstanding_balance_check`); } catch(e) {}

        // 6. Files & Attachments
        console.log("📎 Setting up Attachments...");
        await client.query(`CREATE TABLE IF NOT EXISTS attachments (id SERIAL PRIMARY KEY, record_type VARCHAR(100), record_id INT, file_name VARCHAR(255), file_path TEXT, created_by VARCHAR(100), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        
        // إجبار قاعدة البيانات على إضافة الأعمدة الناقصة لضمان عدم ظهور أخطاء
        await client.query(`ALTER TABLE attachments ADD COLUMN IF NOT EXISTS table_name VARCHAR(100)`);
        await client.query(`ALTER TABLE po_ddp_lcy_charges ADD COLUMN IF NOT EXISTS amount_fcy NUMERIC DEFAULT 0, ADD COLUMN IF NOT EXISTS fx_rate NUMERIC DEFAULT 1`);

        // =========================================================================
        // 7. Chart of Accounts (COA) Seeding
        // =========================================================================
        console.log("📊 Verifying Chart of Accounts (COA)...");
        await client.query(`CREATE TABLE IF NOT EXISTS chart_of_accounts (
            id SERIAL PRIMARY KEY, account_code VARCHAR(100), account_name VARCHAR(255), 
            account_type VARCHAR(100), hierarchy_level INT, parent_account VARCHAR(100), 
            company_entity VARCHAR(255), department VARCHAR(255), currency VARCHAR(50) DEFAULT 'EGP', 
            manual_entry_allowed BOOLEAN DEFAULT true, status VARCHAR(50) DEFAULT 'Active'
        )`);

        const checkTree = await client.query("SELECT id FROM chart_of_accounts WHERE account_code = '1000'");
        if (checkTree.rows.length === 0) {
            console.log("🌱 Seeding Default Chart of Accounts...");
            await client.query("DELETE FROM chart_of_accounts"); 
            const defaultAccounts = [
                ['1000', 'الأصول (Assets)', 'All', 1, null, 'Asset', 'EGP', false],
                ['1100', 'الأصول المتداولة', 'All', 2, '1000', 'Asset', 'EGP', false],
                ['1101', 'صندوق نقدية - تيد كابيتال', 'TED Capital', 3, '1100', 'Asset', 'EGP', true],
                ['1102', 'صندوق نقدية - ديزاين كونسبت', 'Design Concept', 3, '1100', 'Asset', 'EGP', true],
                ['1111', 'بنك CIB - تيد كابيتال', 'TED Capital', 3, '1100', 'Asset', 'EGP', true],
                ['1112', 'بنك الأهلي - ديزاين كونسبت', 'Design Concept', 3, '1100', 'Asset', 'EGP', true],
                ['1120', 'عملاء (حسابات مدينة - AR)', 'All', 3, '1100', 'Asset', 'EGP', false],
                ['1130', 'مخزون خامات ومواد', 'All', 3, '1100', 'Asset', 'EGP', false],
                ['1140', 'دفعات مقدمة للموردين', 'All', 3, '1100', 'Asset', 'EGP', true],
                ['2000', 'الالتزامات (Liabilities)', 'All', 1, null, 'Liability', 'EGP', false],
                ['2100', 'الالتزامات المتداولة', 'All', 2, '2000', 'Liability', 'EGP', false],
                ['2110', 'موردين (حسابات دائنة - AP)', 'All', 3, '2100', 'Liability', 'EGP', false],
                ['2120', 'مقاولي الباطن', 'All', 3, '2100', 'Liability', 'EGP', false],
                ['2130', 'دفعات مقدمة من العملاء', 'All', 3, '2100', 'Liability', 'EGP', true],
                ['2500', 'جاري الشركات الشقيقة', 'All', 2, '2000', 'Liability', 'EGP', true],
                ['2501', 'جاري شركة ديزاين كونسبت', 'TED Capital', 3, '2500', 'Liability', 'EGP', true],
                ['2502', 'جاري شركة تيد كابيتال', 'Design Concept', 3, '2500', 'Liability', 'EGP', true],
                ['3000', 'حقوق الملكية (Equity)', 'All', 1, null, 'Equity', 'EGP', false],
                ['3100', 'رأس المال', 'All', 2, '3000', 'Equity', 'EGP', true],
                ['3200', 'جاري الشركاء', 'All', 2, '3000', 'Equity', 'EGP', true],
                ['3300', 'الأرباح المحتجزة', 'All', 2, '3000', 'Equity', 'EGP', false],
                ['4000', 'الإيرادات (Revenues)', 'All', 1, null, 'Revenue', 'EGP', false],
                ['4100', 'إيرادات مبيعات عقارية', 'All', 2, '4000', 'Revenue', 'EGP', true],
                ['4200', 'إيرادات مستخلصات وخدمات', 'All', 2, '4000', 'Revenue', 'EGP', true],
                ['4300', 'إيرادات أخرى / غرامات تأخير', 'All', 2, '4000', 'Revenue', 'EGP', true],
                ['5000', 'التكاليف المباشرة (COGS)', 'All', 1, null, 'Expense', 'EGP', false],
                ['5100', 'تكلفة خامات ومواد (منصرف)', 'All', 2, '5000', 'Expense', 'EGP', false],
                ['5200', 'تكلفة مقاولي الباطن', 'All', 2, '5000', 'Expense', 'EGP', false],
                ['5300', 'أجور وعمالة مباشرة (للموقع)', 'All', 2, '5000', 'Expense', 'EGP', true],
                ['5400', 'مصاريف استيراد وشحن مباشرة', 'All', 2, '5000', 'Expense', 'EGP', true],
                ['6000', 'مصاريف عمومية وإدارية', 'All', 1, null, 'Expense', 'EGP', false],
                ['6100', 'رواتب الإدارة', 'All', 2, '6000', 'Expense', 'EGP', true],
                ['6200', 'إيجار وتجهيزات المقر', 'All', 2, '6000', 'Expense', 'EGP', true],
                ['6300', 'تسويق وعمولات بيع', 'All', 2, '6000', 'Expense', 'EGP', true]
            ];
            for (let acc of defaultAccounts) {
                await client.query(
                    "INSERT INTO chart_of_accounts (account_code, account_name, company_entity, hierarchy_level, parent_account, account_type, currency, manual_entry_allowed) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
                    acc
                );
            }
        }

        await client.query('COMMIT');
        console.log("✅ Database Schema Initialized and Updated Successfully.");

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("❌ Error initializing database schema:", error);
    } finally {
        client.release();
        pool.end(); // إنهاء الاتصال بعد انتهاء السكريبت
    }
}

// تنفيذ الدالة
initializeDatabase();