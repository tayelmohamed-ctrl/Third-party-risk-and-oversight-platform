-- Record retention, legal hold, and evidence export governance

CREATE TABLE "legal_holds" (
    "id" TEXT NOT NULL,
    "scope_type" TEXT NOT NULL,
    "scope_id" TEXT,
    "customer_id" TEXT,
    "reason" TEXT NOT NULL,
    "matter_ref" TEXT,
    "placed_by" TEXT NOT NULL,
    "placed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_by" TEXT,
    "released_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_holds_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "legal_holds_status_customer_id_idx" ON "legal_holds"("status", "customer_id");
CREATE INDEX "legal_holds_scope_type_scope_id_idx" ON "legal_holds"("scope_type", "scope_id");

CREATE TABLE "evidence_export_runs" (
    "id" TEXT NOT NULL,
    "export_ref" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "scope_type" TEXT NOT NULL,
    "scope_id" TEXT,
    "customer_id" TEXT,
    "record_classes" JSONB NOT NULL,
    "record_count" INTEGER NOT NULL,
    "manifest" JSONB NOT NULL,
    "requested_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "legal_hold_checked" BOOLEAN NOT NULL DEFAULT true,
    "hold_blocked_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_export_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "evidence_export_runs_customer_id_created_at_idx" ON "evidence_export_runs"("customer_id", "created_at");
CREATE INDEX "evidence_export_runs_policy_id_status_idx" ON "evidence_export_runs"("policy_id", "status");

CREATE TABLE "retention_runs" (
    "id" TEXT NOT NULL,
    "run_at" TIMESTAMP(3) NOT NULL,
    "scanned" INTEGER NOT NULL,
    "active" INTEGER NOT NULL,
    "approaching_expiry" INTEGER NOT NULL,
    "eligible_archive" INTEGER NOT NULL,
    "on_hold" INTEGER NOT NULL,
    "by_class" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retention_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "retention_runs_run_at_idx" ON "retention_runs"("run_at");
