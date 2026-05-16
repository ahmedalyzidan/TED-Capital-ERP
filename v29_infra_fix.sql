-- COMPREHENSIVE INFRASTRUCTURE FIX V29
-- This script ensures all tables referenced in DynamicController exist and have minimum required columns

-- 1. Projects & Finance Core
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    budget NUMERIC(15,2) DEFAULT 0,
    expected_profit_percent NUMERIC(5,2) DEFAULT 0,
    actual_profit_percent NUMERIC(5,2) DEFAULT 0,
    project_manager VARCHAR(255),
    company VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id SERIAL PRIMARY KEY,
    account_code VARCHAR(50) UNIQUE NOT NULL,
    account_name VARCHAR(255) UNIQUE NOT NULL,
    account_type VARCHAR(50),
    company_entity VARCHAR(100),
    hierarchy_level INTEGER,
    parent_account VARCHAR(50),
    currency VARCHAR(10) DEFAULT 'EGP',
    manual_entry_allowed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ledger (
    id SERIAL PRIMARY KEY,
    account_name VARCHAR(255) REFERENCES chart_of_accounts(account_name),
    debit NUMERIC(15,2) DEFAULT 0,
    credit NUMERIC(15,2) DEFAULT 0,
    description TEXT,
    cost_center VARCHAR(255),
    reference_no VARCHAR(100),
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Partners & Transactions
CREATE TABLE IF NOT EXISTS partners (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    project_name VARCHAR(255) REFERENCES projects(name),
    partner_type VARCHAR(50) DEFAULT 'Partner',
    company VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS partner_transactions (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
    project_name VARCHAR(255),
    type VARCHAR(50),
    amount NUMERIC(15,2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Real Estate & Contracts
CREATE TABLE IF NOT EXISTS property_units (
    id SERIAL PRIMARY KEY,
    project_name VARCHAR(255) REFERENCES projects(name),
    unit_no VARCHAR(50),
    type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Available',
    price NUMERIC(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    unit_id INTEGER REFERENCES property_units(id),
    customer_id INTEGER REFERENCES customers(id),
    contract_date DATE DEFAULT CURRENT_DATE,
    total_amount NUMERIC(15,2),
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS installments (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
    amount NUMERIC(15,2) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_receipts (
    id SERIAL PRIMARY KEY,
    installment_id INTEGER REFERENCES installments(id),
    amount NUMERIC(15,2),
    payment_date DATE DEFAULT CURRENT_DATE,
    project_name VARCHAR(255),
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Audit & Columns Sync
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget NUMERIC(15,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS expected_profit_percent NUMERIC(5,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS actual_profit_percent NUMERIC(5,2) DEFAULT 0;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS partner_type VARCHAR(50) DEFAULT 'Partner';

-- 5. Missing Relation Fixes (from logs)
CREATE TABLE IF NOT EXISTS client_delayed_payments (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES customers(id),
    amount NUMERIC(15,2),
    due_date DATE,
    status VARCHAR(50) DEFAULT 'Delayed'
);

-- 6. COA Index fix
CREATE INDEX IF NOT EXISTS idx_coa_code ON chart_of_accounts(account_code);
CREATE INDEX IF NOT EXISTS idx_ledger_acc ON ledger(account_name);
