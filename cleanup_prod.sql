DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
              AND tablename NOT IN (
                'users', 'roles', 'permissions', 'role_permissions', 'user_roles', 
                'org_units', 'user_org_units', 'elite_security_matrix', 'security_audit_trail', 
                'active_sessions', 'system_parameters', 'chart_of_accounts', 'gl_mappings', 
                'backups_log', 'audit_logs', 'user_preferences', 'settings', 'system_config',
                'refresh_tokens', 'metadata_fields'
              )) LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
    END LOOP;
END $$;
