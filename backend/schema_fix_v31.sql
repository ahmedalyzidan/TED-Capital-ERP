-- Schema Fix v31: Performance Optimization & Reliability
-- Date: 2026-05-16
-- Purpose: Add missing indices for critical queries and ensure schema parity.

-- 1. Ledger Indices (Critical for Sidebar Stats & Reports)
CREATE INDEX IF NOT EXISTS idx_ledger_account_name ON ledger (account_name);
CREATE INDEX IF NOT EXISTS idx_ledger_cost_center ON ledger (cost_center);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON ledger (created_at);
CREATE INDEX IF NOT EXISTS idx_ledger_is_deleted ON ledger (is_deleted);
CREATE INDEX IF NOT EXISTS idx_ledger_source_module ON ledger (source_module);

-- 2. Purchase Orders Indices (Procurement Dashboard)
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders (supplier);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders (status);
CREATE INDEX IF NOT EXISTS idx_po_created_at ON purchase_orders (created_at);
CREATE INDEX IF NOT EXISTS idx_po_is_deleted ON purchase_orders (is_deleted);

-- 3. Inventory Indices (Intelligence Engine)
CREATE INDEX IF NOT EXISTS idx_inventory_item_name ON inventory_items (item_name);
CREATE INDEX IF NOT EXISTS idx_inventory_project_name ON inventory_items (project_name);
CREATE INDEX IF NOT EXISTS idx_inventory_is_deleted ON inventory_items (is_deleted);

-- 4. Audit Logs (Tracing)
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (timestamp);

-- 5. Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications (is_read);

-- 6. Ensure users table has status column for login logic
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='status') THEN
        ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'Active';
    END IF;
END $$;
