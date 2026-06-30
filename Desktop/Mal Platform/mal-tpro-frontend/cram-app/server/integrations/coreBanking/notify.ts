/**
 * Outbound notifications to core banking (Phase 1b).
 */
import type { OnboardingCaseRecord } from "../../onboarding/types";

export type CoreBankingEvent = "onboarding.rating_ready" | "onboarding.blocked" | "onboarding.disposition_required";

export interface CoreBankingNotification {
  event: CoreBankingEvent;
  at: string;
  customerId: string;
  customerName: string;
  onboardingCaseId: string;
  state: string;
  finalRating?: string;
  composite?: number;
  blockReason?: string;
}

export async function notifyCoreBanking(payload: CoreBankingNotification): Promise<{ delivered: boolean; detail?: string }> {
  const url = process.env.CORE_BANKING_WEBHOOK_URL;
  if (!url) {
    console.info("[core-banking:mock]", JSON.stringify(payload));
    return { delivered: true, detail: "mock — logged to console (set CORE_BANKING_WEBHOOK_URL for live)" };
  }

  const secret = process.env.CORE_BANKING_WEBHOOK_SECRET ?? "";
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-CRAM-Event": payload.event,
  };
  if (secret) {
    const { createHmac } = await import("node:crypto");
    headers["X-CRAM-Signature"] = createHmac("sha256", secret).update(body).digest("hex");
  }

  try {
    const res = await fetch(url, { method: "POST", headers, body });
    return { delivered: res.ok, detail: res.ok ? undefined : await res.text() };
  } catch (e) {
    return { delivered: false, detail: String(e) };
  }
}

export function notificationFromCase(
  ob: OnboardingCaseRecord,
  event: CoreBankingEvent,
): CoreBankingNotification {
  return {
    event,
    at: new Date().toISOString(),
    customerId: ob.customerId,
    customerName: ob.customerName,
    onboardingCaseId: ob.id,
    state: ob.state,
    finalRating: ob.finalRating ?? undefined,
    composite: ob.composite ?? undefined,
    blockReason: ob.blockReason ?? undefined,
  };
}
