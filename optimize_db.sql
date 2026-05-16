CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_ledger_desc_trgm ON ledger USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ledger_ref_trgm ON ledger USING gin (reference_no gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_audit_details_trgm ON audit_logs USING gin (details gin_trgm_ops);
