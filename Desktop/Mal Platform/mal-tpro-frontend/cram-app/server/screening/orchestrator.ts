/**
 * Screening Orchestrator — Vital4 sole authority (Phase 1a).
 */
import { SCREENING_SLA } from "../../src/config/partnerIntegration";
import { appendAudit, appendMlroAlert } from "../db/auditStore";
import { upsertVendorMapping } from "../identity/resolver";
import { vital4CreateScreen, vital4MirrorFromOscilar } from "../integrations/vital4/client";
import {
  normalizeVital4Webhook, slaDueAtForStatus, deriveCaseStatus,
} from "./normalize";
import {
  applyDisposition, createCaseLink, createScreeningCase, findCaseById,
  latestScreeningForCustomer, listScreeningForCustomer, listScreeningQueue, logWebhook,
  updateScreeningFromWebhook,
} from "./store";
import type {
  DispositionRequest, InitiateScreeningRequest, ScreeningCaseRecord,
  ScreeningSnapshot, Vital4WebhookPayload,
} from "./types";

export async function initiateScreening(
  req: InitiateScreeningRequest,
  actor: string,
): Promise<ScreeningCaseRecord> {
  let vital4Res;

  if (req.mirrorSource === "oscilar" && req.oscilarAlertId) {
    vital4Res = await vital4MirrorFromOscilar({
      customerId: req.customerId,
      customerName: req.customerName,
      licenseRegion: req.licenseRegion,
      oscilarAlertId: req.oscilarAlertId,
      subject: req.subject,
    });
  } else {
    vital4Res = await vital4CreateScreen(req);
  }

  await upsertVendorMapping(vital4Res.case_id, "sanctions-list", req.customerId, req.customerName);

  const record = await createScreeningCase({
    customerId: req.customerId,
    customerName: req.customerName,
    vendorCaseId: vital4Res.case_id,
    screeningType: req.screeningType ?? "bundle",
    licenseRegion: req.licenseRegion,
    status: "pending",
    mirrorSource: req.mirrorSource ?? null,
    oscilarAlertId: req.oscilarAlertId ?? null,
    rawPayload: vital4Res,
    slaDueAt: slaDueAtForStatus("pending"),
  });

  if (req.oscilarAlertId) {
    await createCaseLink({
      customerId: req.customerId,
      cramScreeningId: record.id,
      vital4CaseId: vital4Res.case_id,
      oscilarAlertId: req.oscilarAlertId,
    });
  }

  await appendAudit({
    actor,
    action: "screening.initiated",
    entity: "screening_case",
    entityId: record.id,
    detail: `Vital4 case ${vital4Res.case_id} · ${req.customerName} (${req.customerId}) · region ${req.licenseRegion}`,
  });

  return record;
}

export async function handleVital4Webhook(payload: Vital4WebhookPayload): Promise<{
  ok: boolean;
  duplicate?: boolean;
  case?: ScreeningCaseRecord;
  error?: string;
}> {
  const eventId = payload.event_id;
  if (!eventId || !payload.case_id) {
    return { ok: false, error: "missing event_id or case_id" };
  }

  const logged = await logWebhook("vital4", eventId, payload, "processing");
  if (!logged) {
    return { ok: true, duplicate: true };
  }

  const normalized = normalizeVital4Webhook(payload);
  const slaDue = slaDueAtForStatus(normalized.status);

  let record = await updateScreeningFromWebhook(payload.case_id, {
    status: normalized.status,
    snapshot: normalized.snapshot,
    rawPayload: payload,
    slaDueAt: slaDue,
  });

  if (!record && payload.customer_id) {
    record = await createScreeningCase({
      customerId: payload.customer_id,
      customerName: payload.customer_id,
      vendorCaseId: payload.case_id,
      licenseRegion: "UAE",
      status: normalized.status,
      snapshot: normalized.snapshot,
      rawPayload: payload,
      slaDueAt: slaDue,
    });
  }

  if (!record) {
    await logWebhook("vital4", `${eventId}-fail`, payload, "error", "case not found");
    return { ok: false, error: "screening case not found" };
  }

  if (normalized.status === "true_match") {
    await appendMlroAlert({
      customerId: record.customerId,
      customerName: record.customerName,
      prevRating: "—",
      newRating: "Prohibited/High",
      trigger: "SANCTIONS_LIST_UPDATE",
      headline: `Vital4 true match · case ${payload.case_id}`,
      source: "sanctions-list",
    });
  }

  await appendAudit({
    actor: "vital4:webhook",
    action: "screening.updated",
    entity: "screening_case",
    entityId: record.id,
    detail: `Vital4 ${payload.event_type ?? "update"} · status ${normalized.status} · ${payload.case_id}`,
  });

  const { advanceOnboardingFromScreening } = await import("../onboarding/orchestrator");
  await advanceOnboardingFromScreening(record);

  return { ok: true, case: record };
}

export async function disposeScreeningCase(
  caseId: string,
  body: DispositionRequest,
  actor: string,
): Promise<ScreeningCaseRecord | null> {
  const updated = await applyDisposition(caseId, body.disposition, actor, body.notes);
  if (!updated) return null;

  await appendAudit({
    actor,
    action: "screening.disposition",
    entity: "screening_case",
    entityId: caseId,
    detail: `${body.disposition}${body.notes ? ` — ${body.notes}` : ""}`,
  });

  if (body.disposition === "true_match") {
    await appendMlroAlert({
      customerId: updated.customerId,
      customerName: updated.customerName,
      prevRating: "—",
      newRating: "High",
      trigger: "MANUAL_REVIEW",
      headline: `Screening disposition: true match · ${updated.vendorCaseId}`,
      source: "sanctions-list",
    });
  }

  const { onScreeningDisposition } = await import("../onboarding/orchestrator");
  await onScreeningDisposition(updated);

  return updated;
}

/** Latest Vital4-normalized snapshot for CRAM capture (sole screening authority). */
export async function getCustomerScreeningSnapshot(customerId: string): Promise<ScreeningSnapshot | null> {
  const latest = await latestScreeningForCustomer(customerId);
  return latest?.snapshot ?? null;
}

export function snapshotToCaptureFields(snap: ScreeningSnapshot) {
  return {
    sanctions: snap.sanctions,
    pep: snap.pep,
    adverse: snap.adverse,
    watchlist: snap.watchlist,
    screeningCompletedAt: snap.screenedAt,
  };
}

export async function getCustomerScreeningHistory(customerId: string) {
  return listScreeningForCustomer(customerId);
}

export async function getScreeningCase(caseId: string) {
  return findCaseById(caseId);
}

export async function getScreeningQueue() {
  return listScreeningQueue();
}

/** SLA check — cases past due for MLRO dashboard (Phase 1c UI). */
export function isSlaBreached(record: ScreeningCaseRecord): boolean {
  if (!record.slaDueAt || record.disposition !== "pending") return false;
  return new Date(record.slaDueAt).getTime() < Date.now();
}

export { SCREENING_SLA, deriveCaseStatus };
