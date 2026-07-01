import { prisma } from "../db/client";
import {
  computeDisposition,
  policyForClass,
  retentionUntil,
  type RecordClass,
} from "../../src/config/retentionPolicy";
import { activeLegalHolds, matchingHoldIds } from "./legalHold";
import type { RetentionRecordSummary, RetentionStats } from "./types";

function summarize(
  recordClass: RecordClass,
  entityType: string,
  entityId: string,
  anchorDate: Date,
  ctx: { customerId?: string | null; customerName?: string | null; caseId?: string | null; filingId?: string | null },
  holds: Awaited<ReturnType<typeof activeLegalHolds>>,
  asOf: Date,
): RetentionRecordSummary | null {
  const policy = policyForClass(recordClass);
  if (!policy) return null;
  const end = retentionUntil(anchorDate, policy.retentionYears);
  const holdIds = matchingHoldIds(holds, ctx);
  const onHold = holdIds.length > 0;
  return {
    recordClass,
    entityType,
    entityId,
    customerId: ctx.customerId ?? null,
    customerName: ctx.customerName ?? null,
    anchorDate: anchorDate.toISOString(),
    retentionUntil: end.toISOString(),
    disposition: computeDisposition(end, onHold, asOf),
    onHold,
    holdIds,
    policyRef: policy.policyRef,
    immutable: policy.immutable,
  };
}

export async function scanRetentionRegistry(opts?: {
  customerId?: string;
  disposition?: string;
  limit?: number;
  asOf?: Date;
}): Promise<RetentionRecordSummary[]> {
  const asOf = opts?.asOf ?? new Date();
  const holds = await activeLegalHolds();
  const out: RetentionRecordSummary[] = [];
  const limit = opts?.limit ?? 500;

  const assessments = await prisma.assessment.findMany({
    where: opts?.customerId ? { customerId: opts.customerId } : undefined,
    orderBy: { at: "desc" },
    take: limit,
  });
  for (const a of assessments) {
    const s = summarize("cram_assessment", "assessment", a.id, a.at, {
      customerId: a.customerId,
      customerName: a.customerName,
    }, holds, asOf);
    if (s) out.push(s);
  }

  const filings = await prisma.filingDraft.findMany({
    where: opts?.customerId ? { customerId: opts.customerId } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  for (const f of filings) {
    const anchor = f.submittedAt ?? f.createdAt;
    const s = summarize("filing_draft", "filing_draft", f.id, anchor, {
      customerId: f.customerId,
      customerName: f.customerName,
      caseId: f.caseId ?? undefined,
      filingId: f.id,
    }, holds, asOf);
    if (s) out.push(s);
  }

  const submissions = await prisma.filingSubmission.findMany({
    orderBy: { submittedAt: "desc" },
    take: limit,
    include: { draft: true },
  });
  for (const sub of submissions) {
    if (opts?.customerId && sub.draft.customerId !== opts.customerId) continue;
    const s = summarize("filing_submission", "filing_submission", sub.id, sub.submittedAt, {
      customerId: sub.draft.customerId,
      customerName: sub.draft.customerName,
      filingId: sub.filingDraftId,
    }, holds, asOf);
    if (s) out.push(s);
  }

  const cases = await prisma.investigationCase.findMany({
    where: opts?.customerId ? { customerId: opts.customerId } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { evidence: true },
  });
  for (const c of cases) {
    const anchor = c.disposedAt ?? c.createdAt;
    const cs = summarize("investigation_case", "investigation_case", c.id, anchor, {
      customerId: c.customerId,
      customerName: c.customerName,
      caseId: c.id,
    }, holds, asOf);
    if (cs) out.push(cs);
    for (const ev of c.evidence) {
      const es = summarize("case_evidence", "case_evidence", ev.id, ev.createdAt, {
        customerId: c.customerId,
        customerName: c.customerName,
        caseId: c.id,
      }, holds, asOf);
      if (es) out.push(es);
    }
  }

  const ctrRows = await prisma.ctrObligation.findMany({
    where: opts?.customerId ? { customerId: opts.customerId } : undefined,
    orderBy: { transactionDate: "desc" },
    take: limit,
  });
  for (const ctr of ctrRows) {
    const anchor = ctr.filedAt ?? ctr.transactionDate;
    const s = summarize("ctr_obligation", "ctr_obligation", ctr.id, anchor, {
      customerId: ctr.customerId,
      customerName: ctr.customerName,
      filingId: ctr.filingDraftId ?? undefined,
    }, holds, asOf);
    if (s) out.push(s);
  }

  const screening = await prisma.screeningCase.findMany({
    where: opts?.customerId ? { customerId: opts.customerId } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  for (const sc of screening) {
    const s = summarize("screening_case", "screening_case", sc.id, sc.createdAt, {
      customerId: sc.customerId,
      customerName: sc.customerName,
    }, holds, asOf);
    if (s) out.push(s);
  }

  const training = await prisma.trainingRecord.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
  });
  for (const t of training) {
    const anchor = t.completedAt ?? t.createdAt;
    const s = summarize("training_record", "training_record", t.id, anchor, {
      customerId: null,
      customerName: t.userName,
    }, holds, asOf);
    if (s) out.push(s);
  }

  const auditRows = await prisma.auditLog.findMany({
    orderBy: { at: "desc" },
    take: Math.min(limit, 1000),
  });
  for (const a of auditRows) {
    const s = summarize("audit_log", "audit_log", a.id, a.at, {
      customerId: null,
      customerName: null,
    }, holds, asOf);
    if (s) out.push(s);
  }

  const examPacks = await prisma.examPackRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  for (const ep of examPacks) {
    const s = summarize("exam_pack", "exam_pack", ep.id, ep.createdAt, {
      customerId: null,
      customerName: null,
    }, holds, asOf);
    if (s) out.push(s);
  }

  if (opts?.disposition) {
    return out.filter((r) => r.disposition === opts.disposition);
  }
  return out;
}

export async function computeRetentionStats(asOf: Date = new Date()): Promise<RetentionStats> {
  const records = await scanRetentionRegistry({ limit: 5000, asOf });
  const byClass: RetentionStats["byClass"] = {};
  let active = 0;
  let approachingExpiry = 0;
  let eligibleArchive = 0;
  let onHold = 0;

  for (const r of records) {
    const bc = byClass[r.recordClass] ?? { scanned: 0, onHold: 0, eligibleArchive: 0 };
    bc.scanned++;
    if (r.onHold) bc.onHold++;
    if (r.disposition === "eligible_archive") bc.eligibleArchive++;
    byClass[r.recordClass] = bc;

    if (r.disposition === "active") active++;
    else if (r.disposition === "approaching_expiry") approachingExpiry++;
    else if (r.disposition === "eligible_archive") eligibleArchive++;
    else if (r.disposition === "on_hold") onHold++;
  }

  const [activeLegalHolds, exportRuns, lastRun] = await Promise.all([
    prisma.legalHold.count({ where: { status: "active" } }),
    prisma.evidenceExportRun.count(),
    prisma.retentionRun.findFirst({ orderBy: { runAt: "desc" } }),
  ]);

  return {
    scanned: records.length,
    active,
    approachingExpiry,
    eligibleArchive,
    onHold,
    activeLegalHolds,
    exportRuns,
    lastRunAt: lastRun?.runAt.toISOString() ?? null,
    byClass,
  };
}

export async function persistRetentionRun(asOf: Date = new Date()): Promise<string> {
  const stats = await computeRetentionStats(asOf);
  const id = `ret_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  await prisma.retentionRun.create({
    data: {
      id,
      runAt: asOf,
      scanned: stats.scanned,
      active: stats.active,
      approachingExpiry: stats.approachingExpiry,
      eligibleArchive: stats.eligibleArchive,
      onHold: stats.onHold,
      byClass: stats.byClass as object,
    },
  });
  return id;
}

export async function listRetentionRuns(limit = 20) {
  const rows = await prisma.retentionRun.findMany({
    orderBy: { runAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    runAt: r.runAt.toISOString(),
    scanned: r.scanned,
    active: r.active,
    approachingExpiry: r.approachingExpiry,
    eligibleArchive: r.eligibleArchive,
    onHold: r.onHold,
    byClass: r.byClass,
  }));
}
