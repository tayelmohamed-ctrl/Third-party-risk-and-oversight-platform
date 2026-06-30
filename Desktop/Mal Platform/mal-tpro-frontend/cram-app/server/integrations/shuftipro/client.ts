/**
 * Shufti Pro — KYC only (Phase 1b). AML/list hits are ignored per Phase 0 authority matrix.
 */
import { vendorSubjectId } from "../../../src/config/partnerIntegration";
import type { OnboardingSubject } from "../../onboarding/types";

export interface ShuftiVerificationRequest {
  reference: string;
  callback_url: string;
  email?: string;
  country: string;
  language: string;
  verification_mode: string;
  document: { proof: string; supported_types: string[]; name?: { first_name: string; last_name: string } };
  face?: { proof: string };
}

export interface ShuftiVerificationResponse {
  reference: string;
  event: string;
  verification_url?: string;
}

export function isShuftiMockMode(): boolean {
  return process.env.SHUFTIPRO_MODE === "mock" || !process.env.SHUFTIPRO_API_KEY;
}

function callbackUrl(region: string): string {
  const base = region === "US"
    ? (process.env.WEBHOOK_BASE_US ?? "http://localhost:3010")
    : (process.env.WEBHOOK_BASE_UAE ?? "http://localhost:3010");
  return `${base}/webhooks/shuftipro`;
}

export function buildShuftiReference(customerId: string): string {
  return vendorSubjectId("shufti", customerId, Date.now().toString(36));
}

export async function shuftiCreateVerification(args: {
  customerId: string;
  licenseRegion: string;
  subject: OnboardingSubject;
}): Promise<ShuftiVerificationResponse> {
  const reference = buildShuftiReference(args.customerId);
  const country = args.subject.nationality?.slice(0, 2).toUpperCase() ?? "AE";

  if (isShuftiMockMode()) {
    return { reference, event: "request.pending" };
  }

  const base = process.env.SHUFTIPRO_API_BASE ?? "https://api.shuftipro.com";
  const [firstName, ...rest] = args.subject.fullName.split(" ");
  const body: ShuftiVerificationRequest = {
    reference,
    callback_url: callbackUrl(args.licenseRegion),
    country,
    language: "EN",
    verification_mode: "any",
    document: {
      proof: "",
      supported_types: ["id_card", "passport", "driving_license"],
      name: { first_name: firstName, last_name: rest.join(" ") || firstName },
    },
    face: { proof: "" },
  };

  const auth = Buffer.from(`${process.env.SHUFTIPRO_CLIENT_ID}:${process.env.SHUFTIPRO_API_KEY}`).toString("base64");
  const res = await fetch(`${base}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Shufti Pro verification failed (${res.status}): ${await res.text()}`);
  }

  return res.json() as Promise<ShuftiVerificationResponse>;
}

/** Mock webhook payload for dev auto-chain */
export function shuftiMockAcceptedPayload(reference: string): import("../../onboarding/types").ShuftiWebhookPayload {
  const now = new Date().toISOString();
  return {
    reference,
    event: "verification.accepted",
    verification_status: "accepted",
    timestamp: now,
    verification_result: {
      document: { name: "Mock User", dob: "1990-01-01" },
      face: { liveness_score: 0.99 },
    },
  };
}
