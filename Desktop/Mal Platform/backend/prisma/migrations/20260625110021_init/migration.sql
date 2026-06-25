-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERVISOR', 'CO', 'MLRO', 'ANALYST', 'PARTNER');

-- CreateEnum
CREATE TYPE "ControlStatus" AS ENUM ('OPERATING', 'PARTIAL', 'GAP', 'NOT_IMPLEMENTED');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'PENDING_QA', 'SAR_FILED', 'CLOSED_NO_SAR', 'ESCALATED');

-- CreateEnum
CREATE TYPE "Disposition" AS ENUM ('SAR', 'NO_SAR', 'ESCALATE');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('P1', 'P2', 'P3');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Control" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "requirement" TEXT NOT NULL,
    "expected" TEXT NOT NULL,
    "citation" TEXT NOT NULL,
    "risk" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "cadenceMo" INTEGER NOT NULL,
    "status" "ControlStatus" NOT NULL DEFAULT 'GAP',
    "lastTested" TIMESTAMP(3),
    "bsaPillar" TEXT NOT NULL DEFAULT '',
    "fatf" TEXT[],
    "wolfsberg" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Control_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "uri" TEXT,
    "addedBy" TEXT NOT NULL DEFAULT 'seed',
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlTest" (
    "id" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "testedBy" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" "ControlStatus" NOT NULL,

    CONSTRAINT "ControlTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Typology" (
    "id" TEXT NOT NULL,
    "jur" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "redFlags" TEXT NOT NULL,
    "crossBorder" BOOLEAN NOT NULL DEFAULT false,
    "defence" TEXT[],

    CONSTRAINT "Typology_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "source" TEXT NOT NULL,
    "customerRef" TEXT NOT NULL,
    "corridor" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "typologyId" TEXT,
    "controls" TEXT[],
    "assigneeId" TEXT,
    "disposition" "Disposition",
    "rationale" TEXT,
    "reviewerId" TEXT,
    "reviewerName" TEXT,
    "approvedAt" TIMESTAMP(3),
    "sarClockStart" TIMESTAMP(3),
    "narrative" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DplEntry" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "who" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DplEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sar" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "typology" TEXT NOT NULL,
    "narrative" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "filedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegChange" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "controls" TEXT[],
    "typologies" TEXT[],

    CONSTRAINT "RegChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpactTask" (
    "id" TEXT NOT NULL,
    "regChangeId" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "owner" TEXT NOT NULL,

    CONSTRAINT "ImpactTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" BIGSERIAL NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "prevHash" TEXT,
    "hash" TEXT NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Sar_caseId_key" ON "Sar"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "ImpactTask_regChangeId_key" ON "ImpactTask"("regChangeId");

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlTest" ADD CONSTRAINT "ControlTest_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DplEntry" ADD CONSTRAINT "DplEntry_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sar" ADD CONSTRAINT "Sar_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactTask" ADD CONSTRAINT "ImpactTask_regChangeId_fkey" FOREIGN KEY ("regChangeId") REFERENCES "RegChange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
