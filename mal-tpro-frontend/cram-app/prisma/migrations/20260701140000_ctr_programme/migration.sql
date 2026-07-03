-- US CTR programme — FinCEN Form 104 obligations & filing workflow
CREATE TABLE "ctr_obligations" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "cash_in" DOUBLE PRECISION,
    "cash_out" DOUBLE PRECISION,
    "aggregate_usd" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "channel" TEXT,
    "account_number" TEXT,
    "tin" TEXT,
    "branch_location" TEXT,
    "aggregated" BOOLEAN NOT NULL DEFAULT false,
    "aggregation_note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "filing_draft_id" TEXT,
    "tm_alert_id" TEXT,
    "license_region" TEXT NOT NULL DEFAULT 'US',
    "due_at" TIMESTAMP(3) NOT NULL,
    "filed_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ctr_obligations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ctr_obligations_customer_id_transaction_date_idx" ON "ctr_obligations"("customer_id", "transaction_date");
CREATE INDEX "ctr_obligations_status_due_at_idx" ON "ctr_obligations"("status", "due_at");
