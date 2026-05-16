-- Seed Admin Role and Assign to Admin User
INSERT INTO roles (name, is_system_role, description) 
VALUES ('Admin', true, 'System Administrator with full access') 
ON CONFLICT (name) DO NOTHING;

INSERT INTO user_roles (user_id, role_id) 
SELECT 1, id FROM roles WHERE name = 'Admin' 
ON CONFLICT DO NOTHING;

-- Seed Basic Permissions if missing
INSERT INTO permissions (code, name, module) VALUES 
('FIN_VIEW_LEDGER', 'عرض دفتر الأستاذ', 'Finance'),
('FIN_POST_ENTRY', 'ترحيل القيود', 'Finance'),
('HR_VIEW_STAFF', 'عرض الموظفين', 'HR'),
('INV_MANAGE_STOCK', 'إدارة المخزون', 'Inventory'),
('IAM_MANAGE_ROLES', 'إدارة الأدوار', 'IAM')
ON CONFLICT (code) DO NOTHING;

-- Assign all permissions to Admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'Admin'
ON CONFLICT DO NOTHING;
