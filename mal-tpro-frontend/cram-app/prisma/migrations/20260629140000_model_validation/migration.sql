-- Model validation / governance (Theme 5 — SR 11-7 / CBUAE)
CREATE TABLE "model_governance" (
    "id" TEXT NOT NULL,
    "model_version_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "promoted_at" TIMESTAMP(3),
    "promoted_by" TEXT,

    CONSTRAINT "model_governance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "validation_runs" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "actor" TEXT NOT NULL,
    "run_type" TEXT NOT NULL,
    "model_version_id" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "golden_summary" JSONB NOT NULL,
    "backtest_summary" JSONB,
    "gates" JSONB NOT NULL,
    "report" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validation_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "validation_runs_at_idx" ON "validation_runs"("at");

INSERT INTO "model_governance" ("id", "model_version_id", "status", "updated_at")
VALUES ('current', 'CRAM-CBUAE-2026-05-FREEZE-01', 'draft', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
