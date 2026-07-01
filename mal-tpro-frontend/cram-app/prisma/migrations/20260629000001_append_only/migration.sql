-- Append-only enforcement: application role may INSERT + SELECT only on audit tables.
-- Run as superuser during migration (docker postgres default user has sufficient rights).

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'cram_app') THEN
    CREATE ROLE cram_app LOGIN PASSWORD 'cram_app';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE cram TO cram_app;
GRANT USAGE ON SCHEMA public TO cram_app;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA public TO cram_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cram_app;

-- Immutable tables: no UPDATE or DELETE for application role
REVOKE UPDATE, DELETE ON assessments FROM cram_app;
REVOKE UPDATE, DELETE ON feed_events FROM cram_app;
REVOKE UPDATE, DELETE ON audit_log FROM cram_app;
REVOKE UPDATE, DELETE ON mlro_alerts FROM cram_app;

-- Queue needs status updates; vendor_identity may need upsert for admin API
GRANT UPDATE ON feed_queue TO cram_app;
GRANT UPDATE, DELETE ON vendor_identity TO cram_app;
GRANT UPDATE ON mlro_alerts TO cram_app;

-- Block direct mutation of append-only tables even if credentials leak
CREATE OR REPLACE FUNCTION deny_audit_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'append-only table %: UPDATE and DELETE are forbidden', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assessments_no_update BEFORE UPDATE ON assessments
  FOR EACH ROW EXECUTE FUNCTION deny_audit_mutation();
CREATE TRIGGER assessments_no_delete BEFORE DELETE ON assessments
  FOR EACH ROW EXECUTE FUNCTION deny_audit_mutation();
CREATE TRIGGER feed_events_no_update BEFORE UPDATE ON feed_events
  FOR EACH ROW EXECUTE FUNCTION deny_audit_mutation();
CREATE TRIGGER feed_events_no_delete BEFORE DELETE ON feed_events
  FOR EACH ROW EXECUTE FUNCTION deny_audit_mutation();
CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION deny_audit_mutation();
CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION deny_audit_mutation();
