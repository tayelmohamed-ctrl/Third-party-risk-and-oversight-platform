/** Screening Orchestrator — normalized types (Vital4 → CRAM). */
import type { AdverseResult, PepStatus, ScreenResult } from "../../src/engine/types";
import type { LicenseRegion } from "../../src/config/partnerIntegration";

export type ScreeningDisposition = "pending" | "clear" | "false_positive" | "true_match";
export type ScreeningCaseStatus = "pending" | "potential" | "true_match" | "clear" | "false_positive";
export type ScreeningType = "sanctions" | "pep" | "adverse_media" | "watchlist" | "bundle";

export interface ScreeningSnapshot {
  sanctions: ScreenResult;
  pep: PepStatus;
  adverse: AdverseResult;
  watchlist: "Clear" | "True Match";
  screenedAt: string;
  vendorCaseId: string;
  disposition: ScreeningDisposition;
}

export interface ScreeningSubject {
  type: "individual" | "entity";
  fullName: string;
  dateOfBirth?: string;
  nationality?: string;
  country?: string;
  registrationNumber?: string;
}

export interface InitiateScreeningRequest {
  customerId: string;
  customerName: string;
  licenseRegion: LicenseRegion;
  subject: ScreeningSubject;
  screeningType?: ScreeningType;
  /** Phase 2 — Oscilar txn screening mirror */
  mirrorSource?: "oscilar";
  oscilarAlertId?: string;
}

export interface Vital4WebhookPayload {
  event_id: string;
  event_type: string;
  case_id: string;
  reference?: string;
  customer_id?: string;
  status: string;
  match_type?: string;
  results?: {
    sanctions?: string;
    pep?: string;
    adverse_media?: string;
    watchlist?: string;
  };
  timestamp?: string;
  [key: string]: unknown;
}

export interface DispositionRequest {
  disposition: "clear" | "false_positive" | "true_match";
  notes?: string;
}

export interface ScreeningCaseRecord {
  id: string;
  customerId: string;
  customerName: string;
  vendor: string;
  vendorCaseId: string;
  screeningType: ScreeningType;
  status: ScreeningCaseStatus;
  licenseRegion: LicenseRegion;
  sanctions: ScreenResult | null;
  pep: PepStatus | null;
  adverse: AdverseResult | null;
  watchlist: "Clear" | "True Match" | null;
  disposition: ScreeningDisposition;
  dispositionNotes: string | null;
  disposedBy: string | null;
  disposedAt: string | null;
  slaDueAt: string | null;
  mirrorSource: string | null;
  oscilarAlertId: string | null;
  snapshot: ScreeningSnapshot | null;
  createdAt: string;
  updatedAt: string;
}
