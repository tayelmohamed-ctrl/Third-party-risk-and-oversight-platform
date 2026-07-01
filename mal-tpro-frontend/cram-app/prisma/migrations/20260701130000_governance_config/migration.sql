-- Governance: open items register, config maker-checker, assessment provenance
ALTER TABLE "assessments" ADD COLUMN "model_version_id" TEXT;
ALTER TABLE "assessments" ADD COLUMN "boundary_set_used" TEXT;
ALTER TABLE "assessments" ADD COLUMN "library_versions" JSONB;

CREATE TABLE "open_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "where_field" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "disposition_needed" TEXT NOT NULL,
    "build_handling" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "decision" TEXT,
    "dispositioned_by" TEXT,
    "dispositioned_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "open_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "config_proposals" (
    "id" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "proposed_by" TEXT NOT NULL,
    "proposed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approval_ref" TEXT,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejected_reason" TEXT,

    CONSTRAINT "config_proposals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "config_proposals_table_name_status_idx" ON "config_proposals"("table_name", "status");

CREATE TABLE "config_versions" (
    "id" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "model_version_id" TEXT NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "approved_by" TEXT NOT NULL,
    "approved_at" TIMESTAMP(3) NOT NULL,
    "proposed_by" TEXT NOT NULL,
    "approval_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "config_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "config_versions_table_name_version_key" ON "config_versions"("table_name", "version");
CREATE INDEX "config_versions_table_name_effective_from_idx" ON "config_versions"("table_name", "effective_from");
