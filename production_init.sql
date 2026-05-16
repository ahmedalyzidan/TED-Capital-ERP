-- =========================================================================
-- TED CAPITAL ERP - PRODUCTION INITIALIZATION SCHEMA (V2)
-- Purpose: Comprehensive database setup to cover all legacy and enterprise tables
-- =========================================================================

-- 0. EXTENSIONS & SEQUENCES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SEQUENCE IF NOT EXISTS project_serial_seq START 1;

-- 1. CORE SYSTEM TABLES
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Engineer',
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    permissions JSONB DEFAULT '{"screens":["ALL"],"tables":{"ALL":["read","create","update","delete","approve","export","import","print","audit"]}}'::jsonb,
    linked_company VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_parameters (
    id SERIAL PRIMARY KEY, 
    category VARCHAR(255), 
    value VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS system_backups (
    id SERIAL PRIMARY KEY,
    backup_name VARCHAR(255) UNIQUE NOT NULL,
    file_path TEXT NOT NULL,
    backup_type VARCHAR(50),
    size_bytes BIGINT,
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS backups_log (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE,
    size VARCHAR(50),
    source VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attachments (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100),
    record_id INT,
    file_name VARCHAR(255),
    file_path TEXT,
    uploaded_by VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY, 
    username VARCHAR(255), 
    action VARCHAR(100), 
    table_name VARCHAR(100), 
    record_id VARCHAR(100), 
    details TEXT, 
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. ENTITIES & STAFF
CREATE TABLE IF NOT EXISTS legal_entities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    tax_id VARCHAR(100),
    base_currency VARCHAR(10) DEFAULT 'EGP',
    is_holding BOOLEAN DEFAULT FALSE,
    parent_id INTEGER REFERENCES legal_entities(id),
    metadata JSONB,
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY, 
    name VARCHAR(255) NOT NULL, 
    company_name VARCHAR(255),
    phone VARCHAR(100), 
    email VARCHAR(255), 
    address TEXT,
    status VARCHAR(50) DEFAULT 'Active', 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    job_title VARCHAR(255),
    department VARCHAR(255),
    company VARCHAR(255),
    salary DECIMAL(15,2) DEFAULT 0,
    leave_balance NUMERIC(4,1) DEFAULT 21,
    status VARCHAR(50) DEFAULT 'Active',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff_advances (
    id SERIAL PRIMARY KEY, 
    staff_id INT REFERENCES staff(id), 
    amount DECIMAL(15,2) DEFAULT 0, 
    request_date DATE DEFAULT CURRENT_DATE, 
    deduction_per_month DECIMAL(15,2) DEFAULT 0, 
    remaining_balance DECIMAL(15,2) DEFAULT 0, 
    status VARCHAR(50) DEFAULT 'Pending',
    repayment_method VARCHAR(100) DEFAULT 'Payroll Deduction'
);

CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY, 
    staff_id INT REFERENCES staff(id), 
    project_name VARCHAR(255), 
    check_in TIMESTAMP, 
    check_out TIMESTAMP, 
    location_lat DECIMAL(10,8), 
    location_lng DECIMAL(11,8), 
    ip_address VARCHAR(50), 
    device_info TEXT, 
    status VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS payroll (
    id SERIAL PRIMARY KEY, 
    staff_id INT REFERENCES staff(id), 
    project_name VARCHAR(255), 
    basic_salary DECIMAL(15,2) DEFAULT 0,
    incentives DECIMAL(15,2) DEFAULT 0,
    commissions DECIMAL(15,2) DEFAULT 0,
    expenses DECIMAL(15,2) DEFAULT 0,
    profit_share DECIMAL(15,2) DEFAULT 0,
    deductions DECIMAL(15,2) DEFAULT 0,
    advance_deduction DECIMAL(15,2) DEFAULT 0,
    net_salary DECIMAL(15,2) DEFAULT 0,
    month INTEGER,
    year INTEGER,
    period VARCHAR(50), 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- 3. PROJECTS & REAL ESTATE
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    project_serial VARCHAR(50) UNIQUE,
    budget NUMERIC(15,2) DEFAULT 0,
    company VARCHAR(255),
    project_manager VARCHAR(255),
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'In Progress',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS property_units (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id),
    unit_number VARCHAR(100) NOT NULL,
    building_no VARCHAR(100),
    area_sqm NUMERIC(10,2),
    price_sqm NUMERIC(15,2),
    total_price NUMERIC(15,2),
    status VARCHAR(50) DEFAULT 'Available',
    UNIQUE(project_id, unit_number)
);

CREATE TABLE IF NOT EXISTS unit_history (
    id SERIAL PRIMARY KEY, 
    unit_id INTEGER REFERENCES property_units(id), 
    old_status VARCHAR(50), 
    new_status VARCHAR(50), 
    changed_by VARCHAR(100), 
    notes TEXT, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. FINANCIALS
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id SERIAL PRIMARY KEY, 
    account_code VARCHAR(100) UNIQUE, 
    account_name VARCHAR(255), 
    account_type VARCHAR(100), 
    hierarchy_level INT, 
    parent_account VARCHAR(100), 
    company_entity VARCHAR(255), 
    currency VARCHAR(50) DEFAULT 'EGP', 
    manual_entry_allowed BOOLEAN DEFAULT true, 
    status VARCHAR(50) DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS ledger (
    id SERIAL PRIMARY KEY, 
    date DATE DEFAULT CURRENT_DATE, 
    account_name VARCHAR(255), 
    cost_center VARCHAR(255), 
    debit NUMERIC(18,2) DEFAULT 0, 
    credit NUMERIC(18,2) DEFAULT 0, 
    description TEXT, 
    reference_no VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Authorized',
    created_by VARCHAR(100), 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ar_invoices (
    id SERIAL PRIMARY KEY,
    invoice_no VARCHAR(100) UNIQUE,
    client_id INTEGER REFERENCES customers(id),
    amount NUMERIC(15,2),
    status VARCHAR(50) DEFAULT 'Draft',
    qr_code TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS client_payment_history (
    id SERIAL PRIMARY KEY, 
    client_id INTEGER REFERENCES customers(id), 
    amount_paid NUMERIC(15,2), 
    payment_method VARCHAR(50) DEFAULT 'Cash', 
    reference_no VARCHAR(100), 
    payment_date DATE DEFAULT CURRENT_DATE,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS payment_allocations (
    id SERIAL PRIMARY KEY, 
    payment_id INTEGER, 
    debt_id INTEGER, 
    allocated_amount NUMERIC(15,2), 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fixed_assets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    category VARCHAR(100),
    purchase_date DATE,
    purchase_value NUMERIC(15,2),
    current_book_value NUMERIC(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Active'
);

-- 5. PROCUREMENT & INVENTORY
CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    master_po_no VARCHAR(100),
    supplier VARCHAR(255),
    item_description TEXT,
    qty NUMERIC(15,2),
    estimated_cost NUMERIC(15,2),
    fx_rate NUMERIC(12,4) DEFAULT 1,
    status VARCHAR(50) DEFAULT 'Pending',
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY, 
    name VARCHAR(255) UNIQUE, 
    location TEXT, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id SERIAL PRIMARY KEY,
    po_id INTEGER REFERENCES purchase_orders(id),
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    quantity NUMERIC(15,2) DEFAULT 0,
    remaining_qty NUMERIC(15,2) DEFAULT 0,
    avg_cost NUMERIC(15,2) DEFAULT 0,
    buy_price NUMERIC(15,2) DEFAULT 0,
    warehouse_id INTEGER REFERENCES warehouses(id),
    project_name VARCHAR(255),
    master_po_no VARCHAR(100),
    min_stock_level NUMERIC(15,2) DEFAULT 5,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS po_ddp_lcy_charges (
    id SERIAL PRIMARY KEY, 
    po_id INT REFERENCES purchase_orders(id), 
    date DATE, 
    amount_fcy NUMERIC DEFAULT 0, 
    fx_rate NUMERIC DEFAULT 1, 
    amount NUMERIC DEFAULT 0, 
    description VARCHAR(255), 
    expense_name VARCHAR(255),
    currency VARCHAR(10) DEFAULT 'EGP',
    payment_method VARCHAR(50) DEFAULT 'Cash',
    reference_no VARCHAR(100),
    created_by VARCHAR(100), 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_sales (
    id SERIAL PRIMARY KEY,
    inventory_id INTEGER REFERENCES inventory_items(id),
    client_id INTEGER REFERENCES customers(id),
    qty NUMERIC(15,2),
    sell_price NUMERIC(15,2),
    payment_method VARCHAR(50) DEFAULT 'Cash',
    reference_no VARCHAR(100),
    month INTEGER,
    year INTEGER,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS inventory_bookings (
    id SERIAL PRIMARY KEY,
    inventory_id INTEGER REFERENCES inventory_items(id),
    client_id INTEGER REFERENCES customers(id),
    qty NUMERIC(12,2),
    sell_price NUMERIC(12,2),
    deposit_amount NUMERIC(12,2) DEFAULT 0,
    remaining_amount NUMERIC(12,2) DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'Cash',
    reference_no VARCHAR(100),
    month INTEGER,
    year INTEGER,
    status VARCHAR(50) DEFAULT 'Pending',
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS inventory_transfers (
    id SERIAL PRIMARY KEY, 
    item_id INTEGER REFERENCES inventory_items(id), 
    from_warehouse VARCHAR(255), 
    to_warehouse VARCHAR(255), 
    qty NUMERIC(15,2), 
    status VARCHAR(50) DEFAULT 'Completed', 
    transfer_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    created_by VARCHAR(100)
);

-- 6. PARTNERS
CREATE TABLE IF NOT EXISTS partners (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    partner_type VARCHAR(50) DEFAULT 'Partner',
    company VARCHAR(255),
    investment_amount NUMERIC(18,2) DEFAULT 0,
    investment_percentage NUMERIC(5,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS partner_transactions (
    id SERIAL PRIMARY KEY, 
    partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
    type VARCHAR(50), 
    amount NUMERIC(18,2),
    currency VARCHAR(10) DEFAULT 'EGP',
    exchange_rate NUMERIC(12,4) DEFAULT 1,
    amount_fc NUMERIC(15,2) DEFAULT 0,
    date DATE DEFAULT CURRENT_DATE,
    description TEXT,
    project_name VARCHAR(255),
    reference_no VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS partner_deposits (
    id SERIAL PRIMARY KEY, 
    partner_id INTEGER REFERENCES partners(id), 
    amount NUMERIC(15,2), 
    date DATE, 
    payment_method VARCHAR(50), 
    reference_no VARCHAR(100), 
    created_by VARCHAR(100), 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS partner_withdrawals (
    id SERIAL PRIMARY KEY, 
    partner_id INTEGER REFERENCES partners(id), 
    amount NUMERIC(15,2), 
    date DATE, 
    payment_method VARCHAR(50), 
    reference_no VARCHAR(100), 
    created_by VARCHAR(100), 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. CRM & EXTERNAL
CREATE TABLE IF NOT EXISTS subcontractors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rfq (
    id SERIAL PRIMARY KEY,
    item_description TEXT,
    qty NUMERIC(15,2),
    project_name VARCHAR(255),
    company VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crm_leads (
    id SERIAL PRIMARY KEY, 
    company_name VARCHAR(255), 
    contact_person VARCHAR(255), 
    email VARCHAR(255), 
    phone VARCHAR(50), 
    source VARCHAR(100), 
    status VARCHAR(50) DEFAULT 'New', 
    assigned_to VARCHAR(100), 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS crm_opportunities (
    id SERIAL PRIMARY KEY, 
    lead_id INTEGER REFERENCES crm_leads(id), 
    title VARCHAR(255) NOT NULL, 
    expected_value NUMERIC(15,2), 
    probability INTEGER, 
    stage VARCHAR(50) DEFAULT 'Qualification', 
    expected_closing_date DATE, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS crm_interactions (
    id SERIAL PRIMARY KEY, 
    lead_id INTEGER REFERENCES crm_leads(id), 
    type VARCHAR(50), 
    notes TEXT, 
    interaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    created_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS client_interactions (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    type VARCHAR(50),
    summary TEXT,
    interaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    next_follow_up DATE,
    created_by VARCHAR(255)
);

-- 8. WORKFLOW & SYSTEM
CREATE TABLE IF NOT EXISTS system_notifications (
    id SERIAL PRIMARY KEY, 
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(50), 
    title VARCHAR(255), 
    message TEXT, 
    is_read BOOLEAN DEFAULT FALSE, 
    link VARCHAR(255), 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_definitions (
    id SERIAL PRIMARY KEY,
    module_name VARCHAR(100),
    event_trigger VARCHAR(100),
    steps JSONB,
    conditions JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflows (
    id SERIAL PRIMARY KEY, 
    module_name VARCHAR(100), 
    step_name VARCHAR(255), 
    required_role VARCHAR(50), 
    min_amount NUMERIC(15,2) DEFAULT 0, 
    is_final_step BOOLEAN DEFAULT FALSE, 
    next_step_id INTEGER, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_instances (
    id SERIAL PRIMARY KEY,
    definition_id INTEGER REFERENCES workflow_definitions(id),
    record_id VARCHAR(100),
    current_step INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_history (
    id SERIAL PRIMARY KEY, 
    workflow_id INTEGER REFERENCES workflows(id), 
    record_id INTEGER, 
    status VARCHAR(50), 
    comments TEXT, 
    action_by VARCHAR(100), 
    action_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approval_history (
    id SERIAL PRIMARY KEY,
    instance_id INTEGER REFERENCES workflow_instances(id),
    step_number INTEGER,
    approver_id INTEGER,
    action VARCHAR(50), 
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. TRIGGERS
CREATE OR REPLACE FUNCTION check_ledger_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM ledger 
        WHERE reference_no = NEW.reference_no 
        AND status = 'Authorized'
        GROUP BY reference_no 
        HAVING ABS(SUM(debit) - SUM(credit)) > 0.01
    ) THEN
        RAISE EXCEPTION 'Ledger Inconsistency Detected: Reference % is unbalanced.', NEW.reference_no;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ledger_integrity ON ledger;
CREATE CONSTRAINT TRIGGER trg_ledger_integrity
AFTER INSERT OR UPDATE ON ledger
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_ledger_balance();

-- 10. INITIAL SEEDING
INSERT INTO users (username, email, password_hash, role, status, permissions)
VALUES ('admin', 'admin@tedcapital.com', '$2y$10$hB6hY6Oa8u7e8Y/W7iXjV.yG3L9Z8v7.w8o5E7/r.e1.f4.c4.d2.e', 'Admin', 'Active', '{"screens":["ALL"],"tables":{"ALL":["read","create","update","delete","approve","export","import","print","audit"]}}')
ON CONFLICT (username) DO NOTHING;

INSERT INTO chart_of_accounts (account_code, account_name, company_entity, hierarchy_level, account_type, currency, manual_entry_allowed) VALUES
('1000', 'الأصول (Assets)', 'All', 1, 'Asset', 'EGP', false),
('1100', 'الأصول المتداولة', 'All', 2, 'Asset', 'EGP', false),
('2000', 'الالتزامات (Liabilities)', 'All', 1, 'Liability', 'EGP', false),
('3000', 'حقوق الملكية (Equity)', 'All', 1, 'Equity', 'EGP', false),
('4000', 'الإيرادات (Revenues)', 'All', 1, 'Revenue', 'EGP', false),
('5000', 'التكاليف المباشرة (COGS)', 'All', 1, 'Expense', 'EGP', false),
('6000', 'مصاريف عمومية وإدارية', 'All', 1, 'Expense', 'EGP', false)
ON CONFLICT (account_code) DO NOTHING;

INSERT INTO legal_entities (name, base_currency, is_holding) VALUES ('TED Capital Holding', 'EGP', TRUE) ON CONFLICT DO NOTHING;
INSERT INTO legal_entities (name, base_currency, parent_id) VALUES ('TED Capital Egypt', 'EGP', 1) ON CONFLICT DO NOTHING;
INSERT INTO legal_entities (name, base_currency, parent_id) VALUES ('Design Concept', 'EGP', 1) ON CONFLICT DO NOTHING;
