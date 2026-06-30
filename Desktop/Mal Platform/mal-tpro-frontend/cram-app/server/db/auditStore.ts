import type { Assessment } from "../../src/engine/rerating";
import type { ProcessedEvent } from "../../src/pipeline/triggerEngine";
import { prisma } from "./client";

export interface AuditLogEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  detail: string;
  before?: string;
  after?: string;
}

export interface MlroAlert {
  id: string;
  at: string;
  customerId: string;
  customerName: string;
  prevRating: string;
  newRating: string;
  trigger: string;
  headline: string;
  source: string;
  status: "open" | "acknowledged";
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function rowToAssessment(r: {
  id: string; customerId: string; customerName: string; at: Date; trigger: string;
  triggerNote: string | null; rating: string; prevRating: string | null; composite: number;
  mathBand: string; boundary: string; overrides: unknown; reviewDue: Date; actor: string; input: unknown;
  governance?: unknown; overrideJustification?: string | null; handoff?: unknown;
}): Assessment {
  return {
    id: r.id, customerId: r.customerId, customerName: r.customerName,
    at: r.at.toISOString(), trigger: r.trigger as Assessment["trigger"],
    triggerNote: r.triggerNote ?? undefined, rating: r.rating as Assessment["rating"],
    prevRating: (r.prevRating ?? undefined) as Assessment["prevRating"],
    composite: r.composite, mathBand: r.mathBand as Assessment["mathBand"],
    boundary: r.boundary as Assessment["boundary"],
    overrides: r.overrides as Assessment["overrides"],
    reviewDue: r.reviewDue.toISOString(), actor: r.actor,
    input: r.input as Assessment["input"],
    overrideJustification: r.overrideJustification ?? undefined,
    governance: (r.governance ?? undefined) as Assessment["governance"],
    handoff: (r.handoff ?? undefined) as Assessment["handoff"],
  };
}

export async function appendAssessment(a: Assessment) {
  await prisma.assessment.create({
    data: {
      id: a.id, customerId: a.customerId, customerName: a.customerName,
      at: new Date(a.at), trigger: a.trigger, triggerNote: a.triggerNote ?? null,
      rating: a.rating, prevRating: a.prevRating ?? null, composite: a.composite,
      mathBand: a.mathBand, boundary: a.boundary,
      overrides: a.overrides as object, reviewDue: new Date(a.reviewDue),
      actor: a.actor, input: a.input as object,
      governance: a.governance ? (a.governance as object) : null,
      handoff: a.handoff ? (a.handoff as object) : null,
      overrideJustification: a.overrideJustification ?? null,
    },
  });
  await appendAudit({
    actor: a.actor, action: "assessment.appended", entity: "assessment", entityId: a.id,
    detail: `${a.customerName} (${a.customerId}) · ${a.trigger} · ${a.prevRating ?? "—"} → ${a.rating}`,
    before: a.prevRating, after: a.rating,
  });
  if (a.governance) {
    await appendAudit({
      actor: a.governance.approvedBy,
      action: "override.applied",
      entity: "assessment",
      entityId: a.id,
      detail: `MLRO override ${a.governance.requestedBand} · math=${a.governance.mathBand} · floor=${a.governance.floor ?? "none"} · ${a.governance.justification.slice(0, 120)}`,
      before: a.mathBand,
      after: a.rating,
    });
  }
  if (a.handoff?.ops?.deployed) {
    await appendAudit({
      actor: a.actor,
      action: "monitoring.deployed",
      entity: "assessment",
      entityId: a.id,
      detail: `TM profile deployed · ${a.handoff.monitoringIntensity} · ${a.handoff.disposition}`,
      after: a.handoff.monitoringIntensity,
    });
  }
}

export async function appendFeedEvent(e: ProcessedEvent) {
  await prisma.feedEvent.create({
    data: {
      id: e.id, source: e.source, kind: e.kind, customerId: e.customerId,
      customerName: e.customerName ?? null, at: new Date(e.at), severity: e.severity ?? null,
      payload: e.payload as object, headline: e.headline, outcome: e.outcome, detail: e.detail,
      prevRating: e.prevRating ?? null, newRating: e.newRating ?? null,
    },
  });
  await appendAudit({
    actor: `feed:${e.source}`, action: "feed.processed", entity: "feed_event", entityId: e.id,
    detail: `${e.outcome}: ${e.headline}`, before: e.prevRating, after: e.newRating,
  });
}

export async function appendAudit(partial: Omit<AuditLogEntry, "id" | "at">) {
  await prisma.auditLog.create({
    data: {
      id: uid("aud"), at: new Date(), actor: partial.actor, action: partial.action,
      entity: partial.entity, entityId: partial.entityId, detail: partial.detail,
      before: partial.before ?? null, after: partial.after ?? null,
    },
  });
}

export async function appendMlroAlert(partial: Omit<MlroAlert, "id" | "at" | "status">) {
  const alert: MlroAlert = {
    id: uid("mlro"), at: new Date().toISOString(), status: "open", ...partial,
  };
  await prisma.mlroAlert.create({
    data: {
      id: alert.id, at: new Date(alert.at), customerId: alert.customerId,
      customerName: alert.customerName, prevRating: alert.prevRating, newRating: alert.newRating,
      trigger: alert.trigger, headline: alert.headline, source: alert.source, status: alert.status,
    },
  });
  await appendAudit({
    actor: "pipeline", action: "mlro.alert.raised", entity: "mlro_alert", entityId: alert.id,
    detail: `${partial.customerName}: ${partial.prevRating} → ${partial.newRating} (${partial.trigger})`,
    before: partial.prevRating, after: partial.newRating,
  });
  return alert;
}

export async function allAssessments(): Promise<Assessment[]> {
  const rows = await prisma.assessment.findMany({ orderBy: { at: "asc" } });
  return rows.map(rowToAssessment);
}

export async function latestByCustomer(): Promise<Assessment[]> {
  const rows = await prisma.assessment.findMany({ orderBy: [{ customerId: "asc" }, { at: "asc" }] });
  const map = new Map<string, Assessment>();
  for (const r of rows) map.set(r.customerId, rowToAssessment(r));
  return [...map.values()].sort((a, b) => a.customerName.localeCompare(b.customerName));
}

export async function historyFor(customerId: string): Promise<Assessment[]> {
  const rows = await prisma.assessment.findMany({
    where: { customerId }, orderBy: { at: "asc" },
  });
  return rows.map(rowToAssessment);
}

export async function allFeedEvents(): Promise<ProcessedEvent[]> {
  const rows = await prisma.feedEvent.findMany({ orderBy: { at: "desc" } });
  return rows.map((r) => ({
    id: r.id, source: r.source as ProcessedEvent["source"], kind: r.kind as ProcessedEvent["kind"],
    customerId: r.customerId, customerName: r.customerName ?? undefined, at: r.at.toISOString(),
    severity: (r.severity ?? undefined) as ProcessedEvent["severity"],
    payload: r.payload as ProcessedEvent["payload"], headline: r.headline,
    outcome: r.outcome as ProcessedEvent["outcome"], detail: r.detail,
    prevRating: r.prevRating ?? undefined, newRating: r.newRating ?? undefined,
  }));
}

export async function processedIds(): Promise<Set<string>> {
  const rows = await prisma.feedEvent.findMany({ select: { id: true } });
  return new Set(rows.map((r) => r.id));
}

export async function allAuditLog(): Promise<AuditLogEntry[]> {
  const rows = await prisma.auditLog.findMany({ orderBy: { at: "desc" } });
  return rows.map((r) => ({
    id: r.id, at: r.at.toISOString(), actor: r.actor, action: r.action,
    entity: r.entity, entityId: r.entityId, detail: r.detail,
    before: r.before ?? undefined, after: r.after ?? undefined,
  }));
}

export async function openMlroAlerts(): Promise<MlroAlert[]> {
  const rows = await prisma.mlroAlert.findMany({ where: { status: "open" }, orderBy: { at: "desc" } });
  return rows.map((r) => ({
    id: r.id, at: r.at.toISOString(), customerId: r.customerId, customerName: r.customerName,
    prevRating: r.prevRating, newRating: r.newRating, trigger: r.trigger,
    headline: r.headline, source: r.source, status: r.status as MlroAlert["status"],
  }));
}

export async function storeEmpty(): Promise<boolean> {
  return (await prisma.assessment.count()) === 0;
}

export const pgStore = {
  latestByCustomer,
  addAssessment: appendAssessment,
};
