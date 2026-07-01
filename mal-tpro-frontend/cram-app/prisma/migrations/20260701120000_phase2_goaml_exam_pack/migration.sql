-- Phase 2: FIU submissions + exam pack runs

CREATE TABLE "filing_submissions" (
    "id" TEXT NOT NULL,
    "filing_draft_id" TEXT NOT NULL,
    "fiu_system" TEXT NOT NULL,
    "fiu_reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'accepted',
    "payload" JSONB,
    "response" JSONB,
    "submitted_by" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "filing_submissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "filing_submissions_filing_draft_id_idx" ON "filing_submissions"("filing_draft_id");
CREATE INDEX "filing_submissions_fiu_reference_idx" ON "filing_submissions"("fiu_reference");

ALTER TABLE "filing_submissions" ADD CONSTRAINT "filing_submissions_filing_draft_id_fkey"
    FOREIGN KEY ("filing_draft_id") REFERENCES "filing_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "exam_pack_runs" (
    "id" TEXT NOT NULL,
    "exam_ref" TEXT NOT NULL,
    "sample_size" INTEGER NOT NULL,
    "customer_ids" JSONB NOT NULL,
    "pack" JSONB NOT NULL,
    "generated_by" TEXT NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_pack_runs_pkey" PRIMARY KEY ("id")
);
