-- =========================================================================
-- TED CAPITAL ERP - MASTER SUPABASE SCHEMA (ENTERPRISE EDITION)
-- Build Date: 2026-05-08
-- Purpose: Complete restoration/initialization of PostgreSQL database
-- =========================================================================

-- 0. EXTENSIONS & SEQUENCES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SEQUENCE IF NOT EXISTS project_serial_seq START 1;

-- 1. IDENTITY & ACCESS MANAGEMENT (IAM)
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

-- 2. LEGAL ENTITIES & GLOBAL OPS
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

-- 3. HUMAN CAPITAL MANAGEMENT (HCM)
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

CREATE TABLE IF NOT EXISTS payroll (
    id SERIAL PRIMARY KEY, 
    staff_id INT REFERENCES staff(id), 
    project_name VARCHAR(255), 
    basic_salary NUMERIC(15,2) DEFAULT 0,
    incentives NUMERIC(15,2) DEFAULT 0,
    commissions NUMERIC(15,2) DEFAULT 0,
    expenses NUMERIC(15,2) DEFAULT 0,
    profit_share NUMERIC(15,2) DEFAULT 0,
    deductions NUMERIC(15,2) DEFAULT 0,
    advance_deduction NUMERIC(15,2) DEFAULT 0,
    net_salary NUMERIC(15,2) DEFAULT 0,
    month INTEGER,
    year INTEGER,
    period VARCHAR(50), 
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    status VARCHAR(50)
);

-- 4. CHART OF ACCOUNTS & LEDGER
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

-- 5. PROJECTS & REAL ESTATE
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

-- 6. INVENTORY & PROCUREMENT
CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    master_po_no VARCHAR(100),
    supplier VARCHAR(255),
    item_description TEXT,
    qty NUMERIC(15,2),
    estimated_cost NUMERIC(15,2),
    fx_rate NUMERIC(12,4) DEFAULT 1,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id SERIAL PRIMARY KEY,
    po_id INTEGER REFERENCES purchase_orders(id),
    item_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(15,2) DEFAULT 0,
    remaining_qty NUMERIC(15,2) DEFAULT 0,
    avg_cost NUMERIC(15,2) DEFAULT 0,
    warehouse VARCHAR(100) DEFAULT 'Main Store',
    project_name VARCHAR(255),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS inventory_sales (
    id SERIAL PRIMARY KEY,
    inventory_id INTEGER REFERENCES inventory_items(id),
    client_id INTEGER,
    qty NUMERIC(15,2),
    sell_price NUMERIC(15,2),
    payment_method VARCHAR(50) DEFAULT 'Cash',
    reference_no VARCHAR(100),
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. CUSTOMERS & CRM
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY, 
    name VARCHAR(255) NOT NULL, 
    company_name VARCHAR(255),
    phone VARCHAR(100), 
    email VARCHAR(255), 
    status VARCHAR(50) DEFAULT 'Active', 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crm_leads (
    id SERIAL PRIMARY KEY, 
    company_name VARCHAR(255), 
    contact_person VARCHAR(255), 
    status VARCHAR(50) DEFAULT 'New', 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. PARTNERS & EQUITY
CREATE TABLE IF NOT EXISTS partners (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    partner_type VARCHAR(50) DEFAULT 'Partner',
    company VARCHAR(255),
    investment_amount NUMERIC(18,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS partner_transactions (
    id SERIAL PRIMARY KEY, 
    partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
    type VARCHAR(50), 
    amount NUMERIC(18,2),
    currency VARCHAR(10) DEFAULT 'EGP',
    date DATE DEFAULT CURRENT_DATE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. WORKFLOW & SYSTEM LOGS
CREATE TABLE IF NOT EXISTS workflow_definitions (
    id SERIAL PRIMARY KEY,
    module_name VARCHAR(100),
    event_trigger VARCHAR(100),
    steps JSONB,
    is_active BOOLEAN DEFAULT TRUE
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

-- 10. SYSTEM SEEDING
-- Seed Super Admin (Password: admin123)
-- Hash: $2a$10$7R.xGZpI... (using standard placeholder)
INSERT INTO users (username, email, password_hash, role, status, permissions)
VALUES ('admin', 'admin@tedcapital.com', '$2y$10$hB6hY6Oa8u7e8Y/W7iXjV.yG3L9Z8v7.w8o5E7/r.e1.f4.c4.d2.e', 'Admin', 'Active', '{"screens":["ALL"],"tables":{"ALL":["read","create","update","delete","approve","export","import","print","audit"]}}')
ON CONFLICT (username) DO NOTHING;

-- Seed Legal Entities
INSERT INTO legal_entities (name, base_currency, is_holding) VALUES ('TED Capital Holding', 'EGP', TRUE) ON CONFLICT DO NOTHING;
INSERT INTO legal_entities (name, base_currency, parent_id) VALUES ('TED Capital Egypt', 'EGP', 1) ON CONFLICT DO NOTHING;
INSERT INTO legal_entities (name, base_currency, parent_id) VALUES ('Design Concept', 'EGP', 1) ON CONFLICT DO NOTHING;

-- Seed Base Chart of Accounts
INSERT INTO chart_of_accounts (account_code, account_name, company_entity, hierarchy_level, account_type, currency, manual_entry_allowed) VALUES
('1000', 'الأصول (Assets)', 'All', 1, 'Asset', 'EGP', false),
('1100', 'الأصول المتداولة', 'All', 2, 'Asset', 'EGP', false),
('2000', 'الالتزامات (Liabilities)', 'All', 1, 'Liability', 'EGP', false),
('3000', 'حقوق الملكية (Equity)', 'All', 1, 'Equity', 'EGP', false),
('4000', 'الإيرادات (Revenues)', 'All', 1, 'Revenue', 'EGP', false),
('5000', 'التكاليف المباشرة (COGS)', 'All', 1, 'Expense', 'EGP', false),
('6000', 'مصاريف عمومية وإدارية', 'All', 1, 'Expense', 'EGP', false)
ON CONFLICT (account_code) DO NOTHING;

-- LEDGER INTEGRITY TRIGGER
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
