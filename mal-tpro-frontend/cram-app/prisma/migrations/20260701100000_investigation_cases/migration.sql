-- Investigation cases, evidence, filing drafts, training records (FFIEC Phase 1)

CREATE TABLE "investigation_cases" (
    "id" TEXT NOT NULL,
    "case_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "source" TEXT NOT NULL,
    "tm_alert_id" TEXT,
    "screening_case_id" TEXT,
    "onboarding_case_id" TEXT,
    "assigned_to" TEXT,
    "typology_id" TEXT,
    "rule_id" TEXT,
    "rule_name" TEXT,
    "cra_rating" TEXT,
    "sla_due_at" TIMESTAMP(3),
    "disposition" TEXT,
    "disposition_notes" TEXT,
    "disposed_by" TEXT,
    "disposed_at" TIMESTAMP(3),
    "pipeline_step" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investigation_cases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "investigation_cases_case_number_key" ON "investigation_cases"("case_number");
CREATE UNIQUE INDEX "investigation_cases_tm_alert_id_key" ON "investigation_cases"("tm_alert_id");
CREATE INDEX "investigation_cases_customer_id_created_at_idx" ON "investigation_cases"("customer_id", "created_at");
CREATE INDEX "investigation_cases_status_severity_idx" ON "investigation_cases"("status", "severity");

CREATE TABLE "case_evidence" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "detail" TEXT,
    "payload" JSONB,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_evidence_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "case_evidence_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "investigation_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "case_evidence_case_id_idx" ON "case_evidence"("case_id");

CREATE TABLE "filing_drafts" (
    "id" TEXT NOT NULL,
    "case_id" TEXT,
    "filing_type" TEXT NOT NULL,
    "template_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "customer_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "title" TEXT,
    "body" JSONB,
    "created_by" TEXT NOT NULL,
    "checker_by" TEXT,
    "mlro_by" TEXT,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "filing_drafts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "filing_drafts_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "investigation_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "filing_drafts_case_id_idx" ON "filing_drafts"("case_id");
CREATE INDEX "filing_drafts_status_filing_type_idx" ON "filing_drafts"("status", "filing_type");

CREATE TABLE "training_records" (
    "id" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "user_name" TEXT,
    "course_id" TEXT NOT NULL,
    "course_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "due_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "attested_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "training_records_user_email_status_idx" ON "training_records"("user_email", "status");
