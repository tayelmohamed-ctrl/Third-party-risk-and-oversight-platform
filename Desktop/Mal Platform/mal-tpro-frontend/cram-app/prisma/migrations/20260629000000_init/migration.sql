-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "trigger" TEXT NOT NULL,
    "trigger_note" TEXT,
    "rating" TEXT NOT NULL,
    "prev_rating" TEXT,
    "composite" DOUBLE PRECISION NOT NULL,
    "math_band" TEXT NOT NULL,
    "boundary" TEXT NOT NULL,
    "overrides" JSONB NOT NULL,
    "review_due" TIMESTAMP(3) NOT NULL,
    "actor" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "feed_events" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "customer_name" TEXT,
    "at" TIMESTAMP(3) NOT NULL,
    "severity" TEXT,
    "payload" JSONB NOT NULL,
    "headline" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "prev_rating" TEXT,
    "new_rating" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "feed_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "before" TEXT,
    "after" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mlro_alerts" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "customer_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "prev_rating" TEXT NOT NULL,
    "new_rating" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mlro_alerts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vendor_identity" (
    "vendor_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendor_identity_pkey" PRIMARY KEY ("vendor_id","source")
);

CREATE TABLE "feed_queue" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    CONSTRAINT "feed_queue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "roles" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "feed_queue_event_id_key" ON "feed_queue"("event_id");
CREATE INDEX "assessments_customer_id_at_idx" ON "assessments"("customer_id", "at");
CREATE INDEX "audit_log_at_idx" ON "audit_log"("at");
CREATE INDEX "feed_queue_status_created_at_idx" ON "feed_queue"("status", "created_at");
CREATE UNIQUE INDEX "app_users_email_key" ON "app_users"("email");
