-- Phase 1b — Onboarding orchestration (Shufti KYC → Vital4 screening → CRAM score)

CREATE TABLE IF NOT EXISTS onboarding_cases (
  id                  TEXT PRIMARY KEY,
  customer_id         TEXT NOT NULL,
  customer_name       TEXT NOT NULL,
  license_region      TEXT NOT NULL DEFAULT 'UAE',
  mode                TEXT NOT NULL DEFAULT 'individual',
  state               TEXT NOT NULL DEFAULT 'INITIATED',
  shufti_reference    TEXT,
  shufti_status       TEXT,
  screening_case_id   TEXT,
  vital4_case_id      TEXT,
  kyc_context         JSONB,
  capture             JSONB,
  subject             JSONB NOT NULL,
  block_reason        TEXT,
  score_result        JSONB,
  final_rating        TEXT,
  composite           DOUBLE PRECISION,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS onboarding_cases_customer_idx ON onboarding_cases (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS onboarding_cases_state_idx ON onboarding_cases (state);
