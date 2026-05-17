const pool = require('./db');

/**
 * Robust Schema Management for Ted ERP
 * Every operation is wrapped in try-catch to ensure that one failure 
 * (e.g. missing parent table) doesn't stop the entire initialization.
 */
const applySchemaFixes = async () => {
    console.log("🛠️ Starting Granular Schema Synchronization...");

    const runQuery = async (label, sql, params = []) => {
        try {
            await pool.query(sql, params);
        } catch (e) {
            // Suppress warnings for things that already exist
            if (e.message.includes("already exists") || e.code === '42P07' || e.code === '42710') {
                return;
            }
            console.warn(`⚠️ Schema Notice [${label}]: ${e.message}`);
        }
    };

    // --- 0. Core Identity & Logs ---
    await runQuery("Users Table", `CREATE TABLE IF NOT EXISTS users (
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
    )`);

    await runQuery("Audit Logs Table", `CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100),
        action VARCHAR(100),
        table_name VARCHAR(100),
        record_id TEXT,
        details TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Fix: ensure record_id is TEXT (not INTEGER) to support MPO/string references like 'MPO-421597'
    await runQuery("Audit Logs record_id to TEXT", `
        DO $$ 
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'audit_logs' AND column_name = 'record_id' AND data_type = 'integer'
            ) THEN
                ALTER TABLE audit_logs ALTER COLUMN record_id TYPE TEXT USING record_id::TEXT;
            END IF;
        END $$
    `);

    await runQuery("Refresh Tokens Table", `CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery("Notifications Table", `CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255),
        message TEXT,
        type VARCHAR(50),
        severity VARCHAR(20) DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        link VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery("Notifications Severity Column", `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'info'`);

    // --- IAM Infrastructure ---
    await runQuery("Permissions Table", `CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        resource VARCHAR(100),
        action VARCHAR(100),
        code VARCHAR(100) UNIQUE,
        module VARCHAR(100),
        name VARCHAR(255)
    )`);

    await runQuery("Permissions Resource Column", `ALTER TABLE permissions ADD COLUMN IF NOT EXISTS resource VARCHAR(100)`);
    await runQuery("Permissions Action Column", `ALTER TABLE permissions ADD COLUMN IF NOT EXISTS action VARCHAR(100)`);

    await runQuery("Roles Table", `CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE,
        description TEXT,
        is_system_role BOOLEAN DEFAULT FALSE,
        is_deleted BOOLEAN DEFAULT FALSE,
        deleted_by VARCHAR(100),
        deleted_at TIMESTAMP
    )`);

    await runQuery("Role Permissions Table", `CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY(role_id, permission_id)
    )`);

    await runQuery("User Roles Table", `CREATE TABLE IF NOT EXISTS user_roles (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        PRIMARY KEY(user_id, role_id)
    )`);

    await runQuery("Security Matrix Table", `CREATE TABLE IF NOT EXISTS elite_security_matrix (
        id SERIAL PRIMARY KEY,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        module_name VARCHAR(100),
        action_name VARCHAR(100),
        is_allowed BOOLEAN DEFAULT TRUE,
        UNIQUE(role_id, module_name, action_name)
    )`);

    await runQuery("Security Audit Trail Table", `CREATE TABLE IF NOT EXISTS security_audit_trail (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        username VARCHAR(100),
        action VARCHAR(100),
        resource VARCHAR(100),
        impact_level VARCHAR(20),
        ip_address VARCHAR(50),
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery("Security Audit Trail Timestamp Column", `ALTER TABLE security_audit_trail ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await runQuery("Security Audit Trail EventType Column", `ALTER TABLE security_audit_trail ADD COLUMN IF NOT EXISTS event_type VARCHAR(100)`);
    await runQuery("Security Audit Trail CreatedAt Column", `ALTER TABLE security_audit_trail ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);

    await runQuery("Active Sessions Table", `CREATE TABLE IF NOT EXISTS active_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT,
        is_valid BOOLEAN DEFAULT TRUE,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // --- Seeding Basic Permissions ---
    const basicPerms = [
        ['FINANCE', 'VIEW', 'FIN_VIEW_LEDGER', 'Finance', 'View Ledger'],
        ['FINANCE', 'POST', 'FIN_POST_ENTRY', 'Finance', 'Post Entry'],
        ['INVENTORY', 'MANAGE', 'INV_MANAGE_STOCK', 'Inventory', 'Manage Stock'],
        ['HR', 'VIEW', 'HR_VIEW_STAFF', 'HR', 'View Staff'],
        ['IAM', 'MANAGE', 'IAM_MANAGE_ROLES', 'Security', 'Manage Roles'],
        ['IAM', 'MANAGE', 'IAM_MANAGE_USERS', 'Security', 'Manage Users']
    ];

    for (const p of basicPerms) {
        await runQuery(`Seed Permission ${p[2]}`, `
            INSERT INTO permissions (resource, action, code, module, name) 
            VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO NOTHING
        `, p);
    }


    // --- 1. Workflow & Approvals ---
    await runQuery("Workflow Definitions", `CREATE TABLE IF NOT EXISTS workflow_definitions (
        id SERIAL PRIMARY KEY,
        module_name VARCHAR(100) UNIQUE NOT NULL,
        min_amount NUMERIC(15,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery("Workflow Instances", `CREATE TABLE IF NOT EXISTS workflow_instances (
        id SERIAL PRIMARY KEY,
        definition_id INTEGER REFERENCES workflow_definitions(id),
        record_id INTEGER,
        current_step INTEGER DEFAULT 1,
        status VARCHAR(50) DEFAULT 'Pending',
        maker_username VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // --- 2. Inventory & Procurement ---
    await runQuery("Purchase Orders", `CREATE TABLE IF NOT EXISTS purchase_orders (
        id SERIAL PRIMARY KEY,
        item_description TEXT,
        qty NUMERIC(20,6),
        estimated_cost NUMERIC(20,6),
        supplier VARCHAR(255),
        project_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Pending',
        master_po_no VARCHAR(100),
        category VARCHAR(100) DEFAULT 'Material',
        warehouse VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery("Purchase Orders Category", `ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Material'`);
    await runQuery("Purchase Orders Warehouse", `ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS warehouse VARCHAR(100)`);
    await runQuery("Purchase Orders Currency", `ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'EGP'`);
    await runQuery("Purchase Orders LCY Total", `ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS lcy_total NUMERIC(15,2) DEFAULT 0`);
    await runQuery("Purchase Orders Unit Cost DDP", `ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS unit_cost_after_ddp NUMERIC(15,2) DEFAULT 0`);
    await runQuery("Purchase Orders DDP Added", `ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS ddp_added_amount NUMERIC(15,2) DEFAULT 0`);
    await runQuery("Purchase Orders DDP LCY Added", `ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS ddp_lcy_added_amount NUMERIC(15,2) DEFAULT 0`);
    await runQuery("Purchase Orders FX Rate", `ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS fx_rate NUMERIC(20,8) DEFAULT 1`);

    await runQuery("Inventory Items", `CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        po_id INTEGER,
        item_name VARCHAR(255),
        item_description TEXT,
        project_name VARCHAR(255),
        master_po_no VARCHAR(100),
        quantity NUMERIC(20,6) DEFAULT 0,
        remaining_qty NUMERIC(20,6) DEFAULT 0,
        buy_price NUMERIC(20,6) DEFAULT 0,
        avg_cost NUMERIC(20,6) DEFAULT 0,
        min_stock_level NUMERIC(20,6) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery("Inventory Items LCY FX Rate", `ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS lcy_fx_rate NUMERIC(15,4) DEFAULT 1`);
    await runQuery("Inventory Items Warehouse", `ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS warehouse VARCHAR(255) DEFAULT 'المخزن الرئيسي'`);
    await runQuery("Inventory Items Warehouse", `ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS warehouse VARCHAR(255) DEFAULT 'المخزن الرئيسي'`);
    
    await runQuery("Job Titles Table", `CREATE TABLE IF NOT EXISTS job_titles (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    const defaultJobTitles = [
        'Project Manager', 'Site Engineer', 'Accountant', 'HR Manager', 
        'Operations Manager', 'Sales Executive', 'Procurement Officer', 
        'Technical Office Engineer', 'General Manager', 'Draftsman',
        'Storekeeper', 'Safety Officer', 'Quality Control'
    ];

    for (const title of defaultJobTitles) {
        await runQuery(`Seed Job Title ${title}`, `
            INSERT INTO job_titles (title) VALUES ($1) ON CONFLICT (title) DO NOTHING
        `, [title]);
    }

    await runQuery("Staff Table", `CREATE TABLE IF NOT EXISTS staff (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        job_title VARCHAR(255),
        salary NUMERIC(15,2) DEFAULT 0,
        company VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery("Subcontractors Table", `CREATE TABLE IF NOT EXISTS subcontractors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        specialty VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery("Customers Table", `CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        company_name VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        credit_balance NUMERIC(15,2) DEFAULT 0,
        legal_id VARCHAR(100),
        customer_type VARCHAR(50) DEFAULT 'Individual',
        referral VARCHAR(255),
        customer_since DATE DEFAULT CURRENT_DATE,
        product VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery("RFQ Table", `CREATE TABLE IF NOT EXISTS rfq (
        id SERIAL PRIMARY KEY,
        project_name VARCHAR(255),
        item_description TEXT,
        qty NUMERIC(20,6),
        status VARCHAR(50) DEFAULT 'Pending',
        company VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery("Warehouses Table", `CREATE TABLE IF NOT EXISTS warehouses (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        location VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery("BOQ Table", `CREATE TABLE IF NOT EXISTS boq (
        id SERIAL PRIMARY KEY,
        project_name VARCHAR(255),
        item_name VARCHAR(255),
        uom VARCHAR(50),
        est_qty NUMERIC(20,6) DEFAULT 0,
        est_unit_price NUMERIC(15,2) DEFAULT 0,
        est_total_price NUMERIC(15,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery("Subcontractor Items Table", `CREATE TABLE IF NOT EXISTS subcontractor_items (
        id SERIAL PRIMARY KEY,
        subcontractor_id INTEGER REFERENCES subcontractors(id),
        boq_id INTEGER REFERENCES boq(id),
        assigned_qty NUMERIC(20,6) DEFAULT 0,
        unit_price NUMERIC(15,2) DEFAULT 0,
        total_price NUMERIC(15,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery("Subcontractor Invoices Table", `CREATE TABLE IF NOT EXISTS subcontractor_invoices (
        id SERIAL PRIMARY KEY,
        subcontractor_id INTEGER REFERENCES subcontractors(id),
        project_name VARCHAR(255),
        description TEXT,
        curr_qty NUMERIC(20,6) DEFAULT 0,
        net_amount NUMERIC(15,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery("System Parameters Table", `CREATE TABLE IF NOT EXISTS system_parameters (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100),
        value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery("Projects Table", `CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        budget NUMERIC(15,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Active',
        company VARCHAR(255),
        company_id INTEGER,
        project_manager VARCHAR(255),
        org_unit_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery("PO Expenses Table", `CREATE TABLE IF NOT EXISTS po_expenses (
        id SERIAL PRIMARY KEY,
        po_id INTEGER REFERENCES purchase_orders(id),
        expense_name VARCHAR(255),
        amount NUMERIC(15,2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'EGP',
        fx_rate NUMERIC(15,4) DEFAULT 1,
        date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery("PO Expenses Master PO", `ALTER TABLE po_expenses ADD COLUMN IF NOT EXISTS master_po_no VARCHAR(100)`);

    // --- 3. Finance & Installments ---
    await runQuery("Installments (Real Estate)", `CREATE TABLE IF NOT EXISTS installments (
        id SERIAL PRIMARY KEY,
        contract_id INTEGER,
        due_date DATE NOT NULL,
        amount NUMERIC(15,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery("Sale Installments (Inventory)", `CREATE TABLE IF NOT EXISTS sale_installments (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER,
        client_id INTEGER,
        due_date DATE NOT NULL,
        amount NUMERIC(20,6) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // --- 4. Chart of Accounts Support ---
    await runQuery("COA Table", `CREATE TABLE IF NOT EXISTS chart_of_accounts (
        id SERIAL PRIMARY KEY,
        account_code VARCHAR(50) UNIQUE NOT NULL,
        account_name VARCHAR(255) NOT NULL,
        account_type VARCHAR(50),
        parent_account VARCHAR(50),
        company_entity VARCHAR(255),
        hierarchy_level INTEGER DEFAULT 1,
        currency VARCHAR(10) DEFAULT 'EGP',
        manual_entry_allowed BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await runQuery("COA Unique Constraint", `ALTER TABLE chart_of_accounts ADD CONSTRAINT chart_of_accounts_account_code_key UNIQUE (account_code)`);

    // --- 5. Global Columns (Soft-Delete & Metadata) ---
    const allTablesRes = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'");
    for (const r of allTablesRes.rows) {
        const table = r.table_name;
        await runQuery(`Soft-Delete for ${table}`, `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE`);
        await runQuery(`DeletedBy for ${table}`, `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(100)`);
        await runQuery(`DeletedAt for ${table}`, `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`);
        await runQuery(`Metadata for ${table}`, `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb`);
    }

    // --- 6. Chart of Accounts Seeding (Safe Mode) ---
    const defaultAccounts = [
        ['1000', 'الأصول (Assets)', 'All', 1, null, 'Asset', 'EGP', false],
        ['1100', 'الأصول المتداولة', 'All', 2, '1000', 'Asset', 'EGP', false],
        ['1101', 'صندوق نقدية - تيد كابيتال', 'TED Capital', 3, '1100', 'Asset', 'EGP', true],
        ['1102', 'صندوق نقدية - ديزاين كونسبت', 'Design Concept', 3, '1100', 'Asset', 'EGP', true],
        ['1103', 'صندوق نقدية - ماستر بيلدر', 'Master Builder', 3, '1100', 'Asset', 'EGP', true],
        ['1105', 'صندوق المصروفات النثرية', 'All', 3, '1100', 'Asset', 'EGP', true],
        ['1111', 'بنك CIB - تيد كابيتال', 'TED Capital', 3, '1100', 'Asset', 'EGP', true],
        ['1112', 'بنك الأهلي - ديزاين كونسبت', 'Design Concept', 3, '1100', 'Asset', 'EGP', true],
        ['1113', 'بنك مصر - ماستر بيلدر', 'Master Builder', 3, '1100', 'Asset', 'EGP', true],
        ['1120', 'عملاء (حسابات مدينة - AR)', 'All', 3, '1100', 'Asset', 'EGP', false],
        ['1130', 'مخزون خامات ومواد', 'All', 3, '1100', 'Asset', 'EGP', false],
        ['1150', 'ضريبة الخصم من المنبع', 'All', 3, '1100', 'Asset', 'EGP', true],
        ['1200', 'الأصول الثابتة (Fixed Assets)', 'All', 1, null, 'Asset', 'EGP', false],
        ['2000', 'الالتزامات (Liabilities)', 'All', 1, null, 'Liability', 'EGP', false],
        ['2100', 'الالتزامات المتداولة', 'All', 2, '2000', 'Liability', 'EGP', false],
        ['2110', 'موردين (حسابات دائنة - AP)', 'All', 3, '2100', 'Liability', 'EGP', false],
        ['2150', 'ضريبة القيمة المضافة', 'All', 3, '2100', 'Liability', 'EGP', true],
        ['2160', 'ضرائب الخصم والإضافة (WHT)', 'All', 3, '2100', 'Liability', 'EGP', false],
        ['2200', 'الضرائب والقيمة المضافة (VAT)', 'All', 2, '2100', 'Liability', 'EGP', false],
        ['3000', 'حقوق الملكية (Equity)', 'All', 1, null, 'Equity', 'EGP', false],
        ['4000', 'الإيرادات (Revenues)', 'All', 1, null, 'Revenue', 'EGP', false],
        ['4100', 'إيرادات مبيعات', 'All', 2, '4000', 'Revenue', 'EGP', true],
        ['5000', 'التكاليف المباشرة (COGS)', 'All', 1, null, 'Expense', 'EGP', false],
        ['5100', 'تكاليف المشروعات المباشرة', 'All', 1, null, 'Expense', 'EGP', false],
        ['6000', 'مصاريف عمومية وإدارية', 'All', 1, null, 'Expense', 'EGP', false],
        ['3900', 'حساب معلق - تسويات نظام', 'All', 3, '3000', 'Equity', 'EGP', true],
        ['6900', 'حساب تسويات الكسور', 'All', 3, '6000', 'Expense', 'EGP', true]
    ];

    for (const acc of defaultAccounts) {
        await runQuery(`COA Seed ${acc[0]}`, `
            INSERT INTO chart_of_accounts (account_code, account_name, company_entity, hierarchy_level, parent_account, account_type, currency, manual_entry_allowed) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (account_code) DO NOTHING
        `, acc);
    }

    // --- 6.1 GL Mappings (Rule Engine) ---
    await runQuery("GL Mappings Table", `CREATE TABLE IF NOT EXISTS gl_mappings (
        id SERIAL PRIMARY KEY,
        transaction_type VARCHAR(255) UNIQUE NOT NULL,
        debit_account VARCHAR(255),
        credit_account VARCHAR(255),
        cost_center_required BOOLEAN DEFAULT TRUE,
        is_deleted BOOLEAN DEFAULT FALSE,
        deleted_by VARCHAR(100),
        deleted_at TIMESTAMP,
        metadata JSONB DEFAULT '{}'::jsonb
    )`);

    const defaultMappings = [
        ['CUSTOMER_INVOICE', '1120', '4000', true], // AR | Revenue
        ['SUPPLIER_INVOICE', '1130', '2110', true], // Inventory | AP
        ['EXPENSE_PAYMENT', '6000', '1101', true], // General Expense | Cash
        ['PAYROLL_POSTING', '6000', '2110', true],  // Payroll Expense | Salaries Payable
        ['CUSTOMER_PAYMENT', '1101', '1120', false],
        ['SUPPLIER_PAYMENT', '2110', '1101', false],
        ['CASH_TRANSFER', '1101', '1111', false],
        ['INVENTORY_ADJUSTMENT', '5000', '1130', true]
    ];

    for (const m of defaultMappings) {
        await runQuery(`Seed GL Mapping ${m[0]}`, `
            INSERT INTO gl_mappings (transaction_type, debit_account, credit_account, cost_center_required) 
            VALUES ($1, $2, $3, $4) ON CONFLICT (transaction_type) DO NOTHING
        `, m);
    }

    // --- 7. Enterprise Structures (Dropdowns Support) ---
    await runQuery("Companies Table", `CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        base_currency VARCHAR(10) DEFAULT 'EGP',
        tax_number VARCHAR(100),
        commercial_reg VARCHAR(100),
        authorized_capital NUMERIC(15,2) DEFAULT 0,
        issued_capital NUMERIC(15,2) DEFAULT 0,
        legal_form VARCHAR(100),
        is_deleted BOOLEAN DEFAULT FALSE,
        deleted_by VARCHAR(100),
        deleted_at TIMESTAMP,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    const defaultCompanies = [
        [1, 'TED Capital', 'EGP'],
        [2, 'Design Concept', 'EGP'],
        [3, 'Master Builder', 'EGP']
    ];

    for (const comp of defaultCompanies) {
        await runQuery(`Seed Company ${comp[1]}`, `
            INSERT INTO companies (id, name, base_currency) 
            VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, base_currency = EXCLUDED.base_currency
        `, comp);
    }

    await runQuery("Backfill Projects Company ID", `
        UPDATE projects p
        SET company_id = c.id
        FROM companies c
        WHERE p.company_id IS NULL AND (UPPER(p.company) = UPPER(c.name) OR p.company ILIKE '%' || c.name || '%')
    `);

    await runQuery("Backfill Ledger Company ID", `
        UPDATE ledger l
        SET company_id = c.id, company = c.name
        FROM companies c
        WHERE (l.company_id IS NULL OR l.company IS NULL OR l.company = '') AND (UPPER(l.company) = UPPER(c.name) OR l.cost_center IN (SELECT name FROM projects WHERE company_id = c.id))
    `);

    await runQuery("Committees Table", `CREATE TABLE IF NOT EXISTS committees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery("Org Units Table", `CREATE TABLE IF NOT EXISTS org_units (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        type VARCHAR(50),
        parent_id INTEGER REFERENCES org_units(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery("User Org Units Table", `CREATE TABLE IF NOT EXISTS user_org_units (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        org_unit_id INTEGER REFERENCES org_units(id) ON DELETE CASCADE,
        is_primary BOOLEAN DEFAULT FALSE,
        PRIMARY KEY(user_id, org_unit_id)
    )`);

    // --- 8. Missing Columns for Dropdowns ---
    await runQuery("Customers Legal ID", `ALTER TABLE customers ADD COLUMN IF NOT EXISTS legal_id VARCHAR(100)`);
    await runQuery("Customers Type", `ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type VARCHAR(50) DEFAULT 'Individual'`);
    await runQuery("Customers Referral", `ALTER TABLE customers ADD COLUMN IF NOT EXISTS referral VARCHAR(255)`);
    await runQuery("Customers Since", `ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_since DATE DEFAULT CURRENT_DATE`);
    await runQuery("Customers Product", `ALTER TABLE customers ADD COLUMN IF NOT EXISTS product VARCHAR(255)`);

    await runQuery("Staff Salary", `ALTER TABLE staff ADD COLUMN IF NOT EXISTS salary DECIMAL(15,2) DEFAULT 0`);
    await runQuery("Staff Company", `ALTER TABLE staff ADD COLUMN IF NOT EXISTS company VARCHAR(255)`);

    await runQuery("Projects Company", `ALTER TABLE projects ADD COLUMN IF NOT EXISTS company VARCHAR(255)`);
    await runQuery("Ledger Company", `ALTER TABLE ledger ADD COLUMN IF NOT EXISTS company VARCHAR(255)`);

    await runQuery("Installments No", `ALTER TABLE installments ADD COLUMN IF NOT EXISTS installment_no VARCHAR(50)`);

    await runQuery("Payment Receipts Table", `CREATE TABLE IF NOT EXISTS payment_receipts (
        id SERIAL PRIMARY KEY,
        installment_id INTEGER REFERENCES installments(id),
        amount NUMERIC(15,2) DEFAULT 0,
        payment_date DATE DEFAULT CURRENT_DATE,
        reference_no VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // --- 9. Expense Management System ---
    await runQuery("Expense Categories Table", `CREATE TABLE IF NOT EXISTS expense_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    const defaultExpenseCats = [
        ['Operational Expenses', 'Direct costs for daily operations'],
        ['Administrative Expenses', 'General management and office costs'],
        ['Project Specific Costs', 'Costs directly attributed to a client project'],
        ['Marketing & Sales', 'Campaigns, ads, and lead generation'],
        ['Travel & Transportation', 'Fuel, tickets, and employee logistics'],
        ['Maintenance & Utilities', 'Electricity, water, and building upkeep'],
        ['Payroll & Benefits', 'Staff salaries and insurance premiums'],
        ['Taxes & Legal Fees', 'Government duties and professional fees']
    ];

    for (const cat of defaultExpenseCats) {
        await runQuery(`Seed Expense Category ${cat[0]}`, `
            INSERT INTO expense_categories (name, description) 
            VALUES ($1, $2) ON CONFLICT (name) DO NOTHING
        `, cat);
    }

    await runQuery("Company Expenses Table", `CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        description TEXT NOT NULL,
        amount NUMERIC(15,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'EGP',
        category_id INTEGER REFERENCES expense_categories(id),
        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        expense_date DATE DEFAULT CURRENT_DATE,
        payment_method VARCHAR(50) DEFAULT 'Cash',
        supplier_name VARCHAR(255),
        receipt_url TEXT,
        status VARCHAR(50) DEFAULT 'Pending',
        is_billable BOOLEAN DEFAULT FALSE,
        tax_amount NUMERIC(15,2) DEFAULT 0,
        company_entity VARCHAR(255),
        created_by INTEGER REFERENCES users(id),
        approved_by INTEGER REFERENCES users(id),
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery("Expenses Project ID Column", `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL`);
    await runQuery("Expenses Tax Amount Column", `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15,2) DEFAULT 0`);
    await runQuery("Expenses Company Entity Column", `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS company_entity VARCHAR(255)`);
    await runQuery("Expenses Company ID Column", `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id)`);
    await runQuery("Payroll Company ID Column", `ALTER TABLE payroll ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id)`);
    await runQuery("Journal Entries Company ID Column", `ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id)`);

    await runQuery("Inter-Company Transactions Table", `CREATE TABLE IF NOT EXISTS intercompany_transactions (
        id SERIAL PRIMARY KEY,
        source_company_id INTEGER REFERENCES companies(id),
        target_company_id INTEGER REFERENCES companies(id),
        amount NUMERIC(15,2) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'Pending',
        source_voucher VARCHAR(255),
        target_voucher VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Global Subcontractor Matrix Expansion
    await runQuery("Subcontractors Global Expansion", `
        ALTER TABLE subcontractors 
        ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS company VARCHAR(255),
        ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50),
        ADD COLUMN IF NOT EXISTS insurance_expiry DATE,
        ADD COLUMN IF NOT EXISTS license_number VARCHAR(100),
        ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active',
        ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb
    `);

    await runQuery("Subcontractors Unique Name", `
        ALTER TABLE subcontractors ADD CONSTRAINT subcontractors_name_unique UNIQUE (name)
    `);

    await runQuery("Subcontractor Contracts Table", `CREATE TABLE IF NOT EXISTS subcontractor_contracts (
        id SERIAL PRIMARY KEY,
        subcontractor_id INTEGER REFERENCES subcontractors(id) ON DELETE CASCADE,
        project_id INTEGER REFERENCES projects(id),
        contract_number VARCHAR(100) UNIQUE,
        total_value NUMERIC(15,2) NOT NULL,
        retention_percent NUMERIC(5,2) DEFAULT 0,
        advance_percent NUMERIC(5,2) DEFAULT 0,
        start_date DATE,
        end_date DATE,
        scope_of_work TEXT,
        status VARCHAR(50) DEFAULT 'Draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB DEFAULT '{}'::jsonb
    )`);

    await runQuery("Subcontractor Bonds Table", `CREATE TABLE IF NOT EXISTS subcontractor_bonds (
        id SERIAL PRIMARY KEY,
        subcontractor_id INTEGER REFERENCES subcontractors(id) ON DELETE CASCADE,
        contract_id INTEGER REFERENCES subcontractor_contracts(id),
        bond_type VARCHAR(50), -- Performance, Advance Payment, Maintenance
        bank_name VARCHAR(255),
        bond_amount NUMERIC(15,2),
        expiry_date DATE,
        reference_number VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery("Retention Releases Table", `CREATE TABLE IF NOT EXISTS retention_releases (
        id SERIAL PRIMARY KEY,
        subcontractor_id INTEGER REFERENCES subcontractors(id),
        contract_id INTEGER REFERENCES subcontractor_contracts(id),
        amount NUMERIC(15,2) NOT NULL,
        release_date DATE DEFAULT CURRENT_TIMESTAMP,
        description TEXT,
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery("Retention Releases Contract ID", `ALTER TABLE retention_releases ADD COLUMN IF NOT EXISTS contract_id INTEGER REFERENCES subcontractor_contracts(id)`);

    // --- Performance Optimization & Indexing ---
    await runQuery("Subcontractor Invoices Contract ID", `ALTER TABLE subcontractor_invoices ADD COLUMN IF NOT EXISTS contract_id INTEGER REFERENCES subcontractor_contracts(id)`);

    await runQuery("Index Subcontractor Contracts", `CREATE INDEX IF NOT EXISTS idx_sub_contracts_sub_id ON subcontractor_contracts(subcontractor_id)`);
    await runQuery("Index Subcontractor Invoices Sub", `CREATE INDEX IF NOT EXISTS idx_sub_invoices_sub_id ON subcontractor_invoices(subcontractor_id)`);
    await runQuery("Index Subcontractor Invoices Contract", `CREATE INDEX IF NOT EXISTS idx_sub_invoices_contract_id ON subcontractor_invoices(contract_id)`);
    await runQuery("Index Subcontractor Invoices Status", `CREATE INDEX IF NOT EXISTS idx_sub_invoices_status ON subcontractor_invoices(status)`);
    await runQuery("Index Subcontractor Bonds", `CREATE INDEX IF NOT EXISTS idx_sub_bonds_sub_id ON subcontractor_bonds(subcontractor_id)`);
    await runQuery("Index Subcontractor Releases", `CREATE INDEX IF NOT EXISTS idx_sub_releases_sub_id ON retention_releases(subcontractor_id)`);

    // --- Subcontractor Portal Auth Fields ---
    await runQuery("Subcontractors Auth Fields", `
        ALTER TABLE subcontractors 
        ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE,
        ADD COLUMN IF NOT EXISTS password_hash TEXT,
        ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
        ADD COLUMN IF NOT EXISTS portal_access_active BOOLEAN DEFAULT FALSE
    `);

    // --- Seed Default Warehouses ---
    const defaultWarehouses = [
        'Main Store',
        'branch 1',
        'branch 2',
        'branch 3',
        'branch 4',
        'branch 5',
        'branch 6',
        'branch 7',
        'branch 8'
    ];
    for (const w of defaultWarehouses) {
        await runQuery("Insert Default Warehouse", `
            INSERT INTO warehouses (name)
            SELECT $1::VARCHAR
            WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE name = $1)
        `, [w]);
    }

    console.log("✅ Granular Schema Synchronization & Performance Tuning Completed.");
};

module.exports = { applySchemaFixes };
