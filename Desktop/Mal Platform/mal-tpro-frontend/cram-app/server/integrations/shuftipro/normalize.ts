/**
 * Shufti Pro → KycQualityContext (identity only — no AML fields).
 */
import type { KycQualityContext } from "../../../src/engine/dataQualityGate";
import type { ShuftiWebhookPayload } from "../../onboarding/types";
import { SCREENING_AUTHORITY } from "../../../src/config/partnerIntegration";

export function isShuftiAccepted(payload: ShuftiWebhookPayload): boolean {
  const status = (payload.verification_status ?? payload.event ?? "").toLowerCase();
  return status.includes("accepted") || status === "verification.accepted";
}

export function isShuftiDeclined(payload: ShuftiWebhookPayload): boolean {
  const status = (payload.verification_status ?? payload.event ?? "").toLowerCase();
  return status.includes("declined") || status.includes("timeout") || status.includes("cancelled");
}

/** Map Shufti webhook to KycQualityContext — ignores any AML/list data in payload. */
export function shuftiToKycContext(payload: ShuftiWebhookPayload, at: Date = new Date()): KycQualityContext {
  const accepted = isShuftiAccepted(payload);
  const liveness = (payload.verification_result?.face?.liveness_score ?? 0) >= 0.5;
  const issued = new Date(at);
  issued.setFullYear(issued.getFullYear() - 1);

  return {
    identitySource: "emirates_id",
    identityVerified: accepted,
    documentIssuedAt: issued.toISOString().slice(0, 10),
    lastKycRefreshAt: at.toISOString().slice(0, 10),
    screeningCompletedAt: "", // set only when Vital4 completes — sole screening authority
    livenessPass: accepted && liveness,
  };
}

/** Log if Shufti payload contains AML data we intentionally ignore */
export function logIgnoredShuftiAml(payload: ShuftiWebhookPayload): string | null {
  if (!SCREENING_AUTHORITY.shuftiAmlIgnored) return null;
  const keys = Object.keys(payload).filter((k) =>
    /aml|sanction|pep|watchlist|adverse/i.test(k),
  );
  return keys.length ? `Ignored Shufti AML fields (Vital4 authority): ${keys.join(", ")}` : null;
}
