-- V29 Missing Tables Migration
-- Run this on the production database to support the New Design 29

-- 1. IAM & Sessions
CREATE TABLE IF NOT EXISTS active_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    token_hash TEXT UNIQUE,
    expires_at TIMESTAMP,
    is_valid BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS org_units (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    type VARCHAR(50),
    parent_id INTEGER REFERENCES org_units(id),
    tenant_id VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255),
    module VARCHAR(50),
    description TEXT
);

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER,
    role_id INTEGER REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS user_org_units (
    user_id INTEGER,
    org_unit_id INTEGER REFERENCES org_units(id),
    is_primary BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (user_id, org_unit_id)
);

-- 2. Audit & Security
CREATE TABLE IF NOT EXISTS security_audit_trail (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    username VARCHAR(100),
    action VARCHAR(100),
    resource VARCHAR(255),
    impact_level VARCHAR(20),
    ip_address VARCHAR(50),
    user_agent TEXT,
    details JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Core Services
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) DEFAULT 'ar',
    theme_mode VARCHAR(20) DEFAULT 'light',
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
    sidebar_collapsed BOOLEAN DEFAULT FALSE,
    dashboard_layout JSONB DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    source_module VARCHAR(50) NOT NULL,
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_notifications (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50),
    title VARCHAR(255),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    link VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Invoicing & Settings
CREATE TABLE IF NOT EXISTS ar_invoices (
    id SERIAL PRIMARY KEY,
    invoice_no VARCHAR(50) UNIQUE,
    client_id INTEGER REFERENCES customers(id),
    project_id INTEGER REFERENCES projects(id),
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal NUMERIC(15,2),
    tax_amount NUMERIC(15,2) DEFAULT 0,
    total_amount NUMERIC(15,2),
    status VARCHAR(50) DEFAULT 'Draft',
    source_module VARCHAR(50) DEFAULT 'General',
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Columns fixes
ALTER TABLE ar_invoices ADD COLUMN IF NOT EXISTS total_amount NUMERIC(15,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS company VARCHAR(255);
