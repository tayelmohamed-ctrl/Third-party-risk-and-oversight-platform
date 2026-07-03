-- Screening Orchestrator (Phase 1a) — Vital4 authoritative screening cases

CREATE TABLE IF NOT EXISTS screening_cases (
  id                TEXT PRIMARY KEY,
  customer_id       TEXT NOT NULL,
  customer_name     TEXT NOT NULL,
  vendor            TEXT NOT NULL DEFAULT 'vital4',
  vendor_case_id    TEXT NOT NULL,
  screening_type    TEXT NOT NULL DEFAULT 'bundle',
  status            TEXT NOT NULL DEFAULT 'pending',
  license_region    TEXT NOT NULL DEFAULT 'UAE',
  sanctions         TEXT,
  pep               TEXT,
  adverse           TEXT,
  watchlist         TEXT,
  disposition       TEXT NOT NULL DEFAULT 'pending',
  disposition_notes TEXT,
  disposed_by       TEXT,
  disposed_at       TIMESTAMPTZ,
  sla_due_at        TIMESTAMPTZ,
  mirror_source     TEXT,
  oscilar_alert_id  TEXT,
  raw_payload       JSONB,
  snapshot          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS screening_cases_vendor_case_idx ON screening_cases (vendor, vendor_case_id);
CREATE INDEX IF NOT EXISTS screening_cases_customer_idx ON screening_cases (customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS case_links (
  id                 TEXT PRIMARY KEY,
  customer_id        TEXT NOT NULL,
  cram_screening_id  TEXT NOT NULL,
  vital4_case_id     TEXT NOT NULL,
  oscilar_alert_id   TEXT,
  oscilar_case_id    TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS case_links_customer_idx ON case_links (customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS case_links_vital4_idx ON case_links (vital4_case_id);

CREATE TABLE IF NOT EXISTS webhook_log (
  id           TEXT PRIMARY KEY,
  vendor       TEXT NOT NULL,
  event_id     TEXT NOT NULL,
  payload      JSONB NOT NULL,
  outcome      TEXT NOT NULL,
  detail       TEXT,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS webhook_log_event_idx ON webhook_log (vendor, event_id);
