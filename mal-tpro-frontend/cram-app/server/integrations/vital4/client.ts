/**
 * Vital4 API client — production calls + mock mode for local dev.
 * Set VITAL4_API_KEY for live; omit or VITAL4_MODE=mock for sandbox responses.
 */
import type { InitiateScreeningRequest } from "../screening/types";
import { vendorSubjectId } from "../../../src/config/partnerIntegration";

export interface Vital4ScreenRequest {
  reference: string;
  subject_type: "individual" | "entity";
  full_name: string;
  date_of_birth?: string;
  nationality?: string;
  country?: string;
  registration_number?: string;
  screening_types: string[];
}

export interface Vital4ScreenResponse {
  case_id: string;
  status: string;
  reference: string;
}

function mockCaseId(): string {
  return `V4MOCK-${Date.now().toString(36)}`;
}

export function isVital4MockMode(): boolean {
  return process.env.VITAL4_MODE === "mock" || !process.env.VITAL4_API_KEY;
}

export function buildVital4Request(req: InitiateScreeningRequest): Vital4ScreenRequest {
  const ref = vendorSubjectId("vital4", req.customerId, Date.now().toString(36));
  return {
    reference: ref,
    subject_type: req.subject.type,
    full_name: req.subject.fullName,
    date_of_birth: req.subject.dateOfBirth,
    nationality: req.subject.nationality,
    country: req.subject.country,
    registration_number: req.subject.registrationNumber,
    screening_types: req.screeningType && req.screeningType !== "bundle"
      ? [req.screeningType]
      : ["sanctions", "pep", "adverse_media", "watchlist"],
  };
}

/** Initiate screening — POST Vital4 /v1/screen (mock when no API key). */
export async function vital4CreateScreen(req: InitiateScreeningRequest): Promise<Vital4ScreenResponse> {
  const body = buildVital4Request(req);

  if (isVital4MockMode()) {
    const caseId = mockCaseId();
    return { case_id: caseId, status: "pending", reference: body.reference };
  }

  const base = process.env.VITAL4_API_BASE ?? "https://api.vital4.net";
  const res = await fetch(`${base}/v1/screen`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VITAL4_API_KEY}`,
      "X-License-Region": req.licenseRegion,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vital4 screen failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<Vital4ScreenResponse>;
}

/** Mirror Oscilar txn screening hit into Vital4 (Phase 2 prep — callable from orchestrator). */
export async function vital4MirrorFromOscilar(args: {
  customerId: string;
  customerName: string;
  licenseRegion: InitiateScreeningRequest["licenseRegion"];
  oscilarAlertId: string;
  subject: InitiateScreeningRequest["subject"];
  paymentRef?: string;
}): Promise<Vital4ScreenResponse> {
  if (isVital4MockMode()) {
    return {
      case_id: mockCaseId(),
      status: "pending",
      reference: vendorSubjectId("vital4", args.customerId, args.oscilarAlertId),
    };
  }

  const base = process.env.VITAL4_API_BASE ?? "https://api.vital4.net";
  const res = await fetch(`${base}/v1/screen/mirror`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VITAL4_API_KEY}`,
    },
    body: JSON.stringify({
      reference: vendorSubjectId("vital4", args.customerId, args.oscilarAlertId),
      oscilar_alert_id: args.oscilarAlertId,
      payment_ref: args.paymentRef,
      subject: args.subject,
      license_region: args.licenseRegion,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vital4 mirror failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<Vital4ScreenResponse>;
}
