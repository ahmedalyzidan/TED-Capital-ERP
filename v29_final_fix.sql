-- FINAL SCHEMA FIX V29
-- Fixing all 500 errors by adding missing columns used in apiRoutes.js and dropdowns

-- 1. Customers Table Fixes
ALTER TABLE customers ADD COLUMN IF NOT EXISTS legal_id VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type VARCHAR(50) DEFAULT 'Individual';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referral VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_since DATE DEFAULT CURRENT_DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS product VARCHAR(255);

-- 2. Staff Table Fixes
ALTER TABLE staff ADD COLUMN IF NOT EXISTS salary NUMERIC(15,2) DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS company VARCHAR(255);

-- 3. Projects Table Fixes
ALTER TABLE projects ADD COLUMN IF NOT EXISTS company VARCHAR(255);

-- 4. Subcontractors Fixes
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS company VARCHAR(255);

-- 5. RFQ Fixes
ALTER TABLE rfq ADD COLUMN IF NOT EXISTS company VARCHAR(255);

-- 6. Ensure Core Tables for Dropdowns exist
CREATE TABLE IF NOT EXISTS system_parameters (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    value VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed basic units if missing
INSERT INTO system_parameters (category, value) VALUES 
('Unit', 'L.S'), ('Unit', 'S.QM'), ('Unit', 'LM'), ('Unit', 'PCS'), ('Unit', 'Job')
ON CONFLICT DO NOTHING;

-- 7. Ensure Invoices & Installments have correct links
ALTER TABLE ar_invoices ADD COLUMN IF NOT EXISTS qr_code TEXT;

-- 8. Fix for 'legal_id' missing in some dropdown queries
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'customers' AND n.nspname = 'public') THEN
        CREATE TABLE customers (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL);
    END IF;
END $$;

-- 9. Final check for Notifications naming
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'system_notifications') THEN
        ALTER TABLE system_notifications RENAME TO notifications;
    END IF;
EXCEPTION WHEN OTHERS THEN 
    -- Ignore if already renamed
END $$;
