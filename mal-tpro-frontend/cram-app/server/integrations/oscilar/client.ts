/**
 * Oscilar API client — mock mode when OSCILAR_API_KEY unset.
 */
import { vendorSubjectId } from "../../../src/config/partnerIntegration";
import type { OscilarWebhookPayload, SimulateOscilarAlertRequest } from "../../tm/types";

export function isOscilarMockMode(): boolean {
  return process.env.OSCILAR_MODE === "mock" || !process.env.OSCILAR_API_KEY;
}

export function buildOscilarAlertId(customerId: string): string {
  return vendorSubjectId("oscilar", customerId, Date.now().toString(36));
}

/** Build a mock webhook payload for dev / simulate endpoint. */
export function oscilarMockWebhookPayload(req: SimulateOscilarAlertRequest): OscilarWebhookPayload {
  const alertId = buildOscilarAlertId(req.customerId);
  const listHit = req.listHit ?? req.alertType === "transaction_screening";
  return {
    event_id: `ev-mock-${Date.now().toString(36)}`,
    event_type: "alert.created",
    alert_id: alertId,
    case_id: `case-${alertId.slice(-8)}`,
    customer_id: req.customerId,
    customer_name: req.customerName,
    timestamp: new Date().toISOString(),
    alert_type: req.alertType ?? (listHit ? "transaction_screening" : "transaction_monitoring"),
    severity: req.severity ?? (listHit ? "critical" : "high"),
    rule_id: req.ruleId ?? (listHit ? "OS-TM-010" : "OS-TM-003"),
    rule_name: req.ruleName ?? (listHit ? "Sanctions name proximity — realtime" : "Round-amount layering"),
    channel: req.channel ?? "transfer",
    amount: req.amount ?? (listHit ? 100000 : 200000),
    currency: req.currency ?? "AED",
    payment_ref: req.paymentRef ?? `PAY-${Date.now().toString(36)}`,
    list_hit: listHit,
    sanctions_signal: listHit ? "potential_match" : undefined,
    license_region: req.licenseRegion ?? "UAE",
    subject: { type: "individual", full_name: req.customerName, nationality: "AE", country: "AE" },
  };
}
