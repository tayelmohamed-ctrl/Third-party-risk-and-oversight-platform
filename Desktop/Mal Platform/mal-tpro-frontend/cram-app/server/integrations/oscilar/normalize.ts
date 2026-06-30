/**
 * Oscilar webhook normalization — TM alerts + txn screening mirror decisions.
 * Oscilar NEVER writes CRAM screening fields directly (Phase 0 authority).
 */
import { SCREENING_AUTHORITY } from "../../../src/config/partnerIntegration";
import type {
  NormalizedOscilarAlert, OscilarAlertType, OscilarSeverity,
  OscilarWebhookPayload, OscilarSubject,
} from "../../tm/types";

function normSeverity(v: string | undefined): OscilarSeverity {
  const s = (v ?? "medium").toLowerCase();
  if (s === "critical") return "critical";
  if (s === "high") return "high";
  if (s === "low") return "low";
  return "medium";
}

function normAlertType(v: string | undefined): OscilarAlertType {
  const t = (v ?? "transaction_monitoring").toLowerCase();
  if (t.includes("screening")) return t.includes("monitoring") ? "both" : "transaction_screening";
  return "transaction_monitoring";
}

export function requiresVital4Mirror(payload: OscilarWebhookPayload): boolean {
  if (!SCREENING_AUTHORITY.oscilarTxnScreeningMirror) return false;
  const alertType = normAlertType(payload.alert_type);
  if (alertType === "transaction_screening" || alertType === "both") return true;
  if (payload.list_hit === true) return true;
  const sig = `${payload.sanctions_signal ?? ""} ${payload.pep_signal ?? ""} ${payload.watchlist_signal ?? ""}`.toLowerCase();
  return /hit|match|potential|true|confirmed/.test(sig);
}

export function buildHeadline(n: Pick<NormalizedOscilarAlert, "ruleName" | "ruleId" | "severity" | "channel" | "amount" | "currency" | "listHit">): string {
  const parts = [
    n.ruleName ?? n.ruleId ?? "Oscilar alert",
    n.channel ? `· ${n.channel}` : "",
    n.amount != null ? `· ${n.amount} ${n.currency ?? ""}`.trim() : "",
    n.listHit ? "· list hit (Vital4 mirror)" : "",
    `· ${n.severity}`,
  ];
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function normalizeOscilarWebhook(
  payload: OscilarWebhookPayload,
  customerId: string,
  customerName: string,
): NormalizedOscilarAlert {
  const alertType = normAlertType(payload.alert_type);
  const severity = normSeverity(payload.severity);
  const listHit = requiresVital4Mirror(payload);
  const subject: OscilarSubject = payload.subject ?? { full_name: customerName };

  const base: NormalizedOscilarAlert = {
    eventId: payload.event_id,
    alertId: payload.alert_id,
    caseId: payload.case_id ?? null,
    customerId,
    customerName,
    alertType,
    severity,
    ruleId: payload.rule_id ?? null,
    ruleName: payload.rule_name ?? null,
    channel: payload.channel ?? null,
    amount: payload.amount ?? null,
    currency: payload.currency ?? null,
    paymentRef: payload.payment_ref ?? null,
    licenseRegion: payload.license_region ?? "UAE",
    listHit,
    requiresVital4Mirror: listHit,
    subject,
    headline: "",
  };
  base.headline = buildHeadline(base);
  return base;
}

export function toFeedEventId(alertId: string): string {
  return `oscilar-${alertId}`;
}
