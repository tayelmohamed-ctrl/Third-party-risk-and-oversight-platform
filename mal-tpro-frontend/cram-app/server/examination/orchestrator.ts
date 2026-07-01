import { FFIEC_EXAMINATION_MATRIX } from "../../src/config/ffiecExaminationMatrix";
import { appendAudit } from "../db/auditStore";
import { filingStats } from "../filings/store";
import { caseStats } from "../investigations/store";
import { ctrStats } from "../ctr/store";
import { computeRetentionStats } from "../retention/registry";
import { legalHoldCount } from "../retention/legalHold";
import { getModelGovernance } from "../db/validationStore";
import { getTrainingStats } from "../training/orchestrator";
import {
  examinationCount,
  listExaminationItems,
  findExaminationItem,
  updateExaminationItem,
  upsertExaminationItem,
} from "./store";
import type { ExaminationItemRecord, ExaminationReadiness, UpdateExaminationInput } from "./types";

interface LiveProbes {
  trainingPct: number;
  trainingOverdue: number;
  caseTotal: number;
  filingTotal: number;
  filingMlroApproved: number;
  ctrTotal: number;
  ctrFiled: number;
  ctrDraftCreated: number;
  retentionLastRun: boolean;
  retentionActiveHolds: number;
  retentionSchedulerRuns: number;
  validationFrozen: boolean;
  auditAvailable: boolean;
}

async function collectLiveProbes(): Promise<LiveProbes> {
  const [training, cases, filings, ctr, retention, holds, gov] = await Promise.all([
    getTrainingStats().catch(() => ({ completionPct: 0, overdue: 0 })),
    caseStats().catch(() => ({ total: 0 })),
    filingStats().catch(() => ({ total: 0, mlroApproved: 0 })),
    ctrStats().catch(() => ({ total: 0, filed: 0, draftCreated: 0, pending: 0, overdue: 0, dueSoon: 0 })),
    computeRetentionStats().catch(() => null),
    legalHoldCount().catch(() => 0),
    getModelGovernance().catch(() => null),
  ]);

  return {
    trainingPct: training.completionPct,
    trainingOverdue: training.overdue,
    caseTotal: cases.total,
    filingTotal: filings.total,
    filingMlroApproved: filings.mlroApproved,
    ctrTotal: ctr.total,
    ctrFiled: ctr.filed,
    ctrDraftCreated: ctr.draftCreated,
    retentionLastRun: !!retention?.lastRunAt,
    retentionActiveHolds: holds,
    retentionSchedulerRuns: retention?.lastRunAt ? 1 : 0,
    validationFrozen: gov?.status === "frozen",
    auditAvailable: true,
  };
}

function probeScore(probe: string | undefined, probes: LiveProbes): { score: number; suggested: "ready" | "in_progress" | "gap" | "not_started" } {
  switch (probe) {
    case "training":
      if (probes.trainingPct >= 90 && probes.trainingOverdue === 0) return { score: 100, suggested: "ready" };
      if (probes.trainingPct >= 70) return { score: probes.trainingPct, suggested: "in_progress" };
      if (probes.trainingPct > 0) return { score: probes.trainingPct, suggested: "gap" };
      return { score: 0, suggested: "not_started" };
    case "cases":
      if (probes.caseTotal >= 1) return { score: 85, suggested: "ready" };
      return { score: 0, suggested: "not_started" };
    case "filings":
      if (probes.filingMlroApproved >= 1) return { score: 100, suggested: "ready" };
      if (probes.filingTotal >= 1) return { score: 60, suggested: "in_progress" };
      return { score: 0, suggested: "not_started" };
    case "ctr":
      if (probes.ctrFiled >= 1) return { score: 100, suggested: "ready" };
      if (probes.ctrDraftCreated >= 1) return { score: 75, suggested: "in_progress" };
      if (probes.ctrTotal >= 1) return { score: 50, suggested: "in_progress" };
      return { score: 0, suggested: "not_started" };
    case "retention":
      if (probes.retentionLastRun && probes.retentionActiveHolds >= 0) return { score: 100, suggested: "ready" };
      return { score: 30, suggested: "gap" };
    case "validation":
      if (probes.validationFrozen) return { score: 100, suggested: "ready" };
      return { score: 40, suggested: "in_progress" };
    case "audit":
      if (probes.auditAvailable) return { score: 90, suggested: "ready" };
      return { score: 0, suggested: "not_started" };
    default:
      return { score: 50, suggested: "in_progress" };
  }
}

export async function seedExaminationIfEmpty(): Promise<number> {
  let added = 0;

  for (const item of FFIEC_EXAMINATION_MATRIX) {
    const existing = await findExaminationItem(item.id);
    if (existing) continue;
    await upsertExaminationItem({
      id: item.id,
      domainId: item.domainId,
      domainName: item.domainName,
      procedure: item.procedure,
      ffiecRef: item.ffiecRef,
      owner: item.owner,
      evidenceRoute: item.evidenceRoute,
      evidenceType: item.evidenceType,
      status: "not_started",
    });
    added++;
  }

  if (added === 0 && (await examinationCount()) > 0) return 0;

  if (added > 0) {
    await appendAudit({
      actor: "system",
      action: "examination.seed",
      entity: "examination_item",
      entityId: "seed",
      detail: `Seeded ${added} FFIEC examination matrix item(s)`,
      after: "seeded",
    });
  }

  return added;
}

export async function refreshExaminationProbes(): Promise<number> {
  const probes = await collectLiveProbes();
  const matrix = FFIEC_EXAMINATION_MATRIX;
  let updated = 0;

  for (const def of matrix) {
    if (!def.liveProbe) continue;
    const { score, suggested } = probeScore(def.liveProbe, probes);
    const existing = await findExaminationItem(def.id);
    if (!existing) continue;

    const manualOverride = existing.notes?.includes("[manual]");
    if (manualOverride) continue;

    await updateExaminationItem(def.id, {
      status: suggested,
      autoScore: score,
      lastReviewedAt: new Date().toISOString(),
      updatedBy: "system",
    });
    updated++;
  }

  return updated;
}

export async function getExaminationReadiness(): Promise<ExaminationReadiness> {
  await refreshExaminationProbes();
  const items = await listExaminationItems();
  const actionable = items.filter((i) => i.status !== "na");

  const ready = actionable.filter((i) => i.status === "ready").length;
  const inProgress = actionable.filter((i) => i.status === "in_progress").length;
  const gaps = actionable.filter((i) => i.status === "gap").length;
  const notStarted = actionable.filter((i) => i.status === "not_started").length;
  const total = actionable.length;

  const domainMap = new Map<string, { domainName: string; ready: number; total: number }>();
  for (const item of actionable) {
    const d = domainMap.get(item.domainId) ?? { domainName: item.domainName, ready: 0, total: 0 };
    d.total++;
    if (item.status === "ready") d.ready++;
    domainMap.set(item.domainId, d);
  }

  const domains = [...domainMap.entries()].map(([domainId, d]) => ({
    domainId,
    domainName: d.domainName,
    ready: d.ready,
    total: d.total,
    pct: d.total > 0 ? Math.round((d.ready / d.total) * 100) : 0,
  }));

  const scorePoints = actionable.reduce((sum, i) => {
    if (i.status === "ready") return sum + 100;
    if (i.status === "in_progress") return sum + (i.autoScore ?? 50);
    if (i.status === "gap") return sum + (i.autoScore ?? 25);
    return sum;
  }, 0);

  return {
    score: scorePoints,
    total: total * 100,
    ready,
    inProgress,
    gaps,
    notStarted,
    completionPct: total > 0 ? Math.round((ready / total) * 100) : 0,
    readinessScore: total > 0 ? Math.round(scorePoints / total) : 0,
    domains,
  };
}

export async function getExaminationItems(opts?: {
  domainId?: string;
  status?: string;
}): Promise<ExaminationItemRecord[]> {
  return listExaminationItems(opts);
}

export async function patchExaminationItem(
  id: string,
  input: UpdateExaminationInput,
  actor: string,
): Promise<ExaminationItemRecord | null> {
  const notes = input.notes ? `${input.notes} [manual]` : "[manual]";
  const updated = await updateExaminationItem(id, {
    ...input,
    notes: input.notes ?? notes,
    updatedBy: actor,
    lastReviewedAt: new Date().toISOString(),
  });
  if (!updated) return null;

  await appendAudit({
    actor,
    action: "examination.updated",
    entity: "examination_item",
    entityId: updated.id,
    detail: `${updated.procedure.slice(0, 60)} → ${updated.status}`,
    after: updated.status,
  });

  return updated;
}

export { FFIEC_EXAMINATION_MATRIX };
