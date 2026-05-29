-- Schema Fix V30: Resolve 500 errors after Nuclear Reset

-- 1. Ledger Table Fixes
ALTER TABLE ledger ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE ledger ADD COLUMN IF NOT EXISTS company_id INT;
ALTER TABLE ledger ADD COLUMN IF NOT EXISTS project_id INT;

-- 2. Chart of Accounts Fixes
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- 3. Projects Table Fixes
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_id INT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_name VARCHAR(255);
UPDATE projects SET project_name = name WHERE project_name IS NULL;

-- 4. Customers Table Fixes
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id INT;

-- 5. Staff Table Fixes
ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS company_id INT;

-- 6. Purchase Orders Fixes
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS company_id INT;

-- 7. Inventory Items Fixes
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS company_id INT;

-- 8. Users Fixes
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- 9. Legal Entities Fixes
ALTER TABLE legal_entities ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- 10. Fix for missing preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Ensure all tables have is_deleted for Global Soft Delete
DO $$ 
DECLARE 
    t TEXT;
BEGIN 
    FOR t IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') LOOP
        BEGIN
            EXECUTE 'ALTER TABLE ' || t || ' ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not add is_deleted to %', t;
        END;
    END LOOP;
END $$;
