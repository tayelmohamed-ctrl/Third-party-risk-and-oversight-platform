-- FFIEC examination matrix items (Phase 1 Step 4)

CREATE TABLE "examination_items" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "domain_name" TEXT NOT NULL,
    "procedure" TEXT NOT NULL,
    "ffiec_ref" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "owner" TEXT,
    "evidence_route" TEXT,
    "evidence_type" TEXT,
    "notes" TEXT,
    "auto_score" INTEGER,
    "last_reviewed_at" TIMESTAMP(3),
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "examination_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "examination_items_domain_id_status_idx" ON "examination_items"("domain_id", "status");
