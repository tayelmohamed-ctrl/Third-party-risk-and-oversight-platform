/**
 * Oscilar TM orchestrator — Phase 2.
 * TM alerts → feed pipeline; txn screening list hits → Vital4 mirror (sole authority).
 */
import { appendAudit, appendMlroAlert } from "../db/auditStore";
import { upsertVendorMapping, resolveVendorIdentity } from "../identity/resolver";
import { ingestInboundEvent, type InboundFeedEvent } from "../pipeline";
import { initiateScreening } from "../screening/orchestrator";
import { logWebhook } from "../screening/store";
import { normalizeOscilarWebhook, toFeedEventId } from "../integrations/oscilar/normalize";
import { isOscilarMockMode } from "../integrations/oscilar/client";
import { SCREENING_AUTHORITY } from "../../src/config/partnerIntegration";
import {
  createTmAlert, findCaseLinkByOscilarAlert, findTmAlertById, findTmAlertByOscilarId,
  listTmAlerts, listTmAlertsForCustomer, updateTmAlert,
} from "./store";
import type { NormalizedOscilarAlert, OscilarWebhookPayload, TmAlertRecord } from "./types";

export function warrantsTmFeed(severity: NormalizedOscilarAlert["severity"]): boolean {
  return severity === "high" || severity === "critical";
}

async function resolveOscilarCustomer(
  payload: OscilarWebhookPayload,
): Promise<{ customerId: string; customerName: string } | { error: string }> {
  if (payload.customer_id) {
    return {
      customerId: payload.customer_id,
      customerName: payload.customer_name ?? payload.customer_id,
    };
  }
  if (payload.customer_ref) {
    return {
      customerId: payload.customer_ref,
      customerName: payload.customer_name ?? payload.customer_ref,
    };
  }
  const resolved = await resolveVendorIdentity(payload.alert_id, "transaction-monitoring");
  if ("reason" in resolved) {
    return { error: resolved.reason };
  }
  return {
    customerId: resolved.customerId,
    customerName: payload.customer_name ?? resolved.customerName,
  };
}

function screeningSubject(normalized: NormalizedOscilarAlert) {
  return {
    type: (normalized.subject.type ?? "individual") as "individual" | "entity",
    fullName: normalized.subject.full_name ?? normalized.customerName,
    nationality: normalized.subject.nationality,
    country: normalized.subject.country,
  };
}

export async function handleOscilarWebhook(payload: OscilarWebhookPayload): Promise<{
  ok: boolean;
  duplicate?: boolean;
  alert?: TmAlertRecord;
  error?: string;
}> {
  const eventId = payload.event_id;
  if (!eventId || !payload.alert_id) {
    return { ok: false, error: "missing event_id or alert_id" };
  }

  const logged = await logWebhook("oscilar", eventId, payload, "processing");
  if (!logged) {
    const existing = await findTmAlertByOscilarId(payload.alert_id);
    return { ok: true, duplicate: true, alert: existing ?? undefined };
  }

  const existingAlert = await findTmAlertByOscilarId(payload.alert_id);
  if (existingAlert) {
    return { ok: true, duplicate: true, alert: existingAlert };
  }

  const customer = await resolveOscilarCustomer(payload);
  if ("error" in customer) {
    await logWebhook("oscilar", `${eventId}-fail`, payload, "error", customer.error);
    return { ok: false, error: customer.error };
  }

  const normalized = normalizeOscilarWebhook(payload, customer.customerId, customer.customerName);

  const alert = await createTmAlert({
    oscilarAlertId: normalized.alertId,
    oscilarCaseId: normalized.caseId ?? undefined,
    customerId: normalized.customerId,
    customerName: normalized.customerName,
    alertType: normalized.alertType,
    severity: normalized.severity,
    ruleId: normalized.ruleId ?? undefined,
    ruleName: normalized.ruleName ?? undefined,
    channel: normalized.channel ?? undefined,
    amount: normalized.amount ?? undefined,
    currency: normalized.currency ?? undefined,
    licenseRegion: normalized.licenseRegion,
    listHit: normalized.listHit,
    paymentRef: normalized.paymentRef ?? undefined,
    rawPayload: payload,
  });

  await upsertVendorMapping(
    normalized.alertId,
    "transaction-monitoring",
    normalized.customerId,
    normalized.customerName,
  );

  let vital4CaseId: string | null = null;
  let cramScreeningId: string | null = null;

  if (normalized.requiresVital4Mirror) {
    const linked = await findCaseLinkByOscilarAlert(normalized.alertId);
    if (!linked) {
      try {
        const screening = await initiateScreening(
          {
            customerId: normalized.customerId,
            customerName: normalized.customerName,
            licenseRegion: normalized.licenseRegion,
            subject: screeningSubject(normalized),
            screeningType: "bundle",
            mirrorSource: "oscilar",
            oscilarAlertId: normalized.alertId,
          },
          "system:oscilar-webhook",
        );
        vital4CaseId = screening.vendorCaseId;
        cramScreeningId = screening.id;
        await updateTmAlert(alert.id, {
          status: "mirrored",
          vital4CaseId: screening.vendorCaseId,
          cramScreeningId: screening.id,
        });
      } catch (e) {
        await logWebhook("oscilar", `${eventId}-mirror-fail`, payload, "error", String(e));
      }
    }
  }

  let feedEventId: string | null = null;
  let feedOutcome: string | null = null;

  if (warrantsTmFeed(normalized.severity)) {
    const inbound: InboundFeedEvent = {
      id: toFeedEventId(normalized.alertId),
      source: "transaction-monitoring",
      kind: "transaction_alert",
      customerId: normalized.customerId,
      customerName: normalized.customerName,
      at: payload.timestamp ?? new Date().toISOString(),
      severity: normalized.severity,
      headline: normalized.headline,
      payload: {
        oscilarAlertId: normalized.alertId,
        ruleId: normalized.ruleId,
        ruleName: normalized.ruleName,
        channel: normalized.channel,
        amount: normalized.amount,
        currency: normalized.currency,
        listHit: normalized.listHit,
        paymentRef: normalized.paymentRef,
      },
    };

    const feedResult = await ingestInboundEvent(inbound);
    if ("error" in feedResult) {
      await logWebhook("oscilar", `${eventId}-feed-fail`, payload, "error", feedResult.error);
    } else {
      feedEventId = feedResult.id;
      feedOutcome = feedResult.outcome;
      await updateTmAlert(alert.id, {
        status: "feed_processed",
        feedEventId: feedResult.id,
        feedOutcome: feedResult.outcome,
      });

      if (normalized.severity === "critical" && feedResult.outcome === "re-rated") {
        await appendMlroAlert({
          customerId: normalized.customerId,
          customerName: normalized.customerName,
          prevRating: feedResult.prevRating ?? "?",
          newRating: feedResult.newRating ?? "?",
          trigger: "transaction_alert",
          headline: normalized.headline,
          source: "transaction-monitoring",
        });
      }
    }
  }

  await appendAudit({
    actor: "system:oscilar-webhook",
    action: "tm.alert.received",
    entity: "tm_alert",
    entityId: alert.id,
    detail: [
      normalized.headline,
      normalized.listHit ? "Vital4 mirror" : "TM only",
      feedOutcome ? `feed:${feedOutcome}` : "no feed",
      vital4CaseId ? `V4:${vital4CaseId}` : "",
    ].filter(Boolean).join(" · "),
  });

  const updated = await findTmAlertByOscilarId(normalized.alertId);
  return { ok: true, alert: updated ?? alert };
}

export async function getTmAlertQueue() {
  return listTmAlerts({ limit: 200 });
}

export async function getTmAlert(id: string) {
  const byId = await findTmAlertById(id);
  if (byId) return byId;
  return findTmAlertByOscilarId(id);
}

export async function getCustomerTmAlerts(customerId: string) {
  return listTmAlertsForCustomer(customerId);
}

export function tmIntegrationMeta() {
  return {
    oscilarMode: isOscilarMockMode() ? "mock" as const : "live" as const,
    tmWebhook: "/webhooks/oscilar",
    vital4MirrorEnabled: SCREENING_AUTHORITY.oscilarTxnScreeningMirror === "vital4",
    tmEndpoints: [
      "GET /api/v1/crr/tm/alerts",
      "POST /api/v1/crr/tm/simulate",
    ],
  };
}
