-- Phase 2: Oscilar TM alerts
CREATE TABLE IF NOT EXISTS tm_alerts (
  id                 TEXT PRIMARY KEY,
  oscilar_alert_id   TEXT NOT NULL UNIQUE,
  oscilar_case_id    TEXT,
  customer_id        TEXT NOT NULL,
  customer_name      TEXT NOT NULL,
  alert_type         TEXT NOT NULL DEFAULT 'transaction_monitoring',
  severity           TEXT NOT NULL DEFAULT 'medium',
  rule_id            TEXT,
  rule_name          TEXT,
  channel            TEXT,
  amount             DOUBLE PRECISION,
  currency           TEXT,
  license_region     TEXT NOT NULL DEFAULT 'UAE',
  status             TEXT NOT NULL DEFAULT 'open',
  list_hit           BOOLEAN NOT NULL DEFAULT false,
  vital4_case_id     TEXT,
  cram_screening_id  TEXT,
  feed_event_id      TEXT,
  feed_outcome       TEXT,
  payment_ref        TEXT,
  raw_payload        JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tm_alerts_customer_idx ON tm_alerts (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tm_alerts_status_idx ON tm_alerts (status, severity);
