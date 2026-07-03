import { appendAudit } from "../db/auditStore";
import type { TmAlertRecord } from "../tm/types";
import {
  addCaseEvidence,
  createCase,
  disposeCase,
  findCaseById,
  findCaseByTmAlertId,
  listCases,
  updateCase,
  caseStats,
} from "./store";
import type {
  AddEvidenceInput,
  CreateCaseInput,
  DispositionInput,
  InvestigationCaseRecord,
  UpdateCaseInput,
} from "./types";

export function warrantsAutoCase(severity: string): boolean {
  return severity === "high" || severity === "critical";
}

export async function createCaseFromTmAlert(
  alert: TmAlertRecord,
  actor = "system:oscilar-webhook",
): Promise<InvestigationCaseRecord | null> {
  if (!warrantsAutoCase(alert.severity)) return null;

  const existing = await findCaseByTmAlertId(alert.id);
  if (existing) return existing;

  const title = alert.ruleName
    ? `${alert.ruleName} — ${alert.customerName}`
    : `TM alert — ${alert.customerName}`;

  const created = await createCase({
    title,
    customerId: alert.customerId,
    customerName: alert.customerName,
    source: "tm_alert",
    severity: alert.severity,
    tmAlertId: alert.id,
    ruleId: alert.ruleId ?? undefined,
    ruleName: alert.ruleName ?? undefined,
    summary: `Auto-opened from Oscilar alert ${alert.oscilarAlertId}`,
    metadata: {
      oscilarAlertId: alert.oscilarAlertId,
      channel: alert.channel,
      amount: alert.amount,
      currency: alert.currency,
      licenseRegion: alert.licenseRegion,
    },
  });

  await addCaseEvidence(created.id, {
    kind: "tm_alert",
    label: "Source TM alert",
    detail: alert.ruleName ?? alert.oscilarAlertId,
    payload: {
      oscilarAlertId: alert.oscilarAlertId,
      ruleId: alert.ruleId,
      severity: alert.severity,
      status: alert.status,
    },
  }, actor);

  await appendAudit({
    actor,
    action: "case.created.from_tm",
    entity: "investigation_case",
    entityId: created.id,
    detail: `${created.caseNumber} · ${alert.customerName} · ${alert.severity} · rule ${alert.ruleId ?? "—"}`,
    after: created.status,
  });

  return created;
}

export async function manualCreateCase(
  input: CreateCaseInput,
  actor: string,
): Promise<InvestigationCaseRecord> {
  const created = await createCase(input);
  await appendAudit({
    actor,
    action: "case.created.manual",
    entity: "investigation_case",
    entityId: created.id,
    detail: `${created.caseNumber} · ${input.customerName} · ${input.source}`,
  });
  return created;
}

export async function assignCase(
  id: string,
  assignedTo: string,
  actor: string,
): Promise<InvestigationCaseRecord | null> {
  const updated = await updateCase(id, { assignedTo, status: "assigned" });
  if (!updated) return null;
  await appendAudit({
    actor,
    action: "case.assigned",
    entity: "investigation_case",
    entityId: updated.id,
    detail: `Assigned to ${assignedTo}`,
    after: assignedTo,
  });
  return updated;
}

export async function advancePipelineStep(
  id: string,
  pipelineStep: number,
  actor: string,
): Promise<InvestigationCaseRecord | null> {
  const updated = await updateCase(id, {
    pipelineStep,
    status: pipelineStep >= 5 ? "pending_mlro" : "investigating",
  });
  if (!updated) return null;
  await appendAudit({
    actor,
    action: "case.pipeline_step",
    entity: "investigation_case",
    entityId: updated.id,
    detail: `Pipeline step ${pipelineStep}`,
    after: String(pipelineStep),
  });
  return updated;
}

export async function recordDisposition(
  id: string,
  input: DispositionInput,
  actor: string,
): Promise<InvestigationCaseRecord | null> {
  const updated = await disposeCase(id, input, actor);
  if (!updated) return null;
  await appendAudit({
    actor,
    action: "case.disposition",
    entity: "investigation_case",
    entityId: updated.id,
    detail: `${input.disposition}${input.notes ? ` · ${input.notes.slice(0, 80)}` : ""}`,
    after: input.disposition,
  });
  return updated;
}

export async function appendEvidence(
  id: string,
  input: AddEvidenceInput,
  actor: string,
): Promise<InvestigationCaseRecord | null> {
  const ev = await addCaseEvidence(id, input, actor);
  if (!ev) return null;
  await appendAudit({
    actor,
    action: "case.evidence.added",
    entity: "investigation_case",
    entityId: ev.caseId,
    detail: `${input.kind}: ${input.label}`,
  });
  return findCaseById(id);
}

export {
  listCases,
  findCaseById,
  caseStats,
};
