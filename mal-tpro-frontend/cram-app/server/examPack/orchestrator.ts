import { appendAudit, historyFor, latestByCustomer } from "../db/auditStore";
import { prisma } from "../db/client";
import { getModelGovernance } from "../db/validationStore";
import { listDrafts } from "../filings/store";
import { listCases } from "../investigations/store";
import { getExaminationReadiness } from "../examination/orchestrator";
import { getTrainingStats } from "../training/orchestrator";

export interface ExamPackCustomer {
  customerId: string;
  customerName: string;
  craRating: string;
  composite: number;
  mathBand: string;
  assessmentId: string;
  assessedAt: string;
  reviewDue: string;
  overrides: string[];
  historyCount: number;
  investigationCases: { caseNumber: string; status: string; disposition: string | null }[];
  filingDrafts: { id: string; status: string; filingType: string; templateId: string | null }[];
  auditEntries: number;
  checklist: { item: string; status: "complete" | "partial" | "missing" }[];
}

export interface ExamPackDocument {
  examRef: string;
  generatedAt: string;
  generatedBy: string;
  sampleSize: number;
  durationMs: number;
  targetHours: 2;
  methodology: string;
  programme: {
    modelVersion: string;
    validationStatus: string;
    trainingCompletionPct: number;
    examinationReadiness: number;
  };
  index: string[];
  customers: ExamPackCustomer[];
}

function uid(): string {
  return `exp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function examRef(): string {
  const d = new Date();
  return `EXAM-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

const CHECKLIST_ITEMS = [
  "Complete customer profile",
  "CRAM risk assessment with explainability",
  "CDD/EDD evidence file reference",
  "Alert history with disposition records",
  "Investigation notes & disposition",
  "STR/SAR history with FIU references",
  "Maker-checker sign-off trail",
  "STR narrative Who/What/When/Where/Why/How",
  "Post-STR action plan",
  "Immutable audit trail",
  "Screening history",
  "Model validation summary",
] as const;

export async function generateExamPack(
  actor: string,
  sampleSize = 25,
): Promise<{ runId: string; pack: ExamPackDocument }> {
  const started = Date.now();
  const all = await latestByCustomer();
  const size = Math.min(Math.max(sampleSize, 1), 50);
  const sample = all.slice(0, size);

  const [cases, drafts, gov, training, readiness] = await Promise.all([
    listCases({ limit: 500 }),
    listDrafts({ limit: 500 }),
    getModelGovernance().catch(() => null),
    getTrainingStats().catch(() => ({ completionPct: 0 })),
    getExaminationReadiness().catch(() => ({ readinessScore: 0 })),
  ]);

  const customers: ExamPackCustomer[] = [];

  for (const a of sample) {
    const hist = await historyFor(a.customerId);
    const customerCases = cases.filter((c) => c.customerId === a.customerId);
    const customerDrafts = drafts.filter((d) => d.customerId === a.customerId);
    const auditCount = await prisma.auditLog.count({
      where: { OR: [{ entityId: a.id }, { detail: { contains: a.customerId } }] },
    });

    const checklist = CHECKLIST_ITEMS.map((item) => {
      let status: "complete" | "partial" | "missing" = "missing";
      if (item.includes("CRAM") && a.rating) status = "complete";
      else if (item.includes("Investigation") && customerCases.length) status = "complete";
      else if (item.includes("STR/SAR") && customerDrafts.length) status = customerDrafts.some((d) => d.status === "submitted") ? "complete" : "partial";
      else if (item.includes("audit") && auditCount > 0) status = "partial";
      else if (item.includes("Maker-checker") && customerDrafts.some((d) => d.mlroBy)) status = "complete";
      else if (item.includes("Model validation") && gov) status = "partial";
      return { item, status };
    });

    customers.push({
      customerId: a.customerId,
      customerName: a.customerName,
      craRating: a.rating,
      composite: a.composite,
      mathBand: a.mathBand,
      assessmentId: a.id,
      assessedAt: a.at,
      reviewDue: a.reviewDue,
      overrides: a.overrides?.map((o) => o.id) ?? [],
      historyCount: hist.length,
      investigationCases: customerCases.map((c) => ({
        caseNumber: c.caseNumber,
        status: c.status,
        disposition: c.disposition,
      })),
      filingDrafts: customerDrafts.map((d) => ({
        id: d.id,
        status: d.status,
        filingType: d.filingType,
        templateId: d.templateId,
      })),
      auditEntries: auditCount,
      checklist,
    });
  }

  const ref = examRef();
  const pack: ExamPackDocument = {
    examRef: ref,
    generatedAt: new Date().toISOString(),
    generatedBy: actor,
    sampleSize: customers.length,
    durationMs: Date.now() - started,
    targetHours: 2,
    methodology: "CBUAE examination pack · CRAM-CBUAE-2026 · Thematic Review STR evidence index",
    programme: {
      modelVersion: gov?.modelVersionId ?? "CRAM-CBUAE-2026-05-FREEZE-01",
      validationStatus: gov?.status ?? "draft",
      trainingCompletionPct: training.completionPct,
      examinationReadiness: readiness.readinessScore,
    },
    index: [...CHECKLIST_ITEMS],
    customers,
  };

  const runId = uid();
  await prisma.examPackRun.create({
    data: {
      id: runId,
      examRef: ref,
      sampleSize: customers.length,
      customerIds: customers.map((c) => c.customerId),
      pack: pack as object,
      generatedBy: actor,
      durationMs: pack.durationMs,
    },
  });

  await appendAudit({
    actor,
    action: "exam_pack.generated",
    entity: "exam_pack_run",
    entityId: runId,
    detail: `${ref} · ${customers.length} customers · ${pack.durationMs}ms`,
    after: ref,
  });

  return { runId, pack };
}

export async function listExamPackRuns(limit = 20) {
  const rows = await prisma.examPackRun.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    examRef: r.examRef,
    sampleSize: r.sampleSize,
    generatedBy: r.generatedBy,
    durationMs: r.durationMs,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getExamPackRun(id: string) {
  const r = await prisma.examPackRun.findUnique({ where: { id } });
  if (!r) return null;
  return {
    id: r.id,
    examRef: r.examRef,
    sampleSize: r.sampleSize,
    customerIds: r.customerIds,
    pack: r.pack as ExamPackDocument,
    generatedBy: r.generatedBy,
    durationMs: r.durationMs,
    createdAt: r.createdAt.toISOString(),
  };
}
