/** Onboarding orchestrator — Phase 1b state machine. */
import type { LicenseRegion } from "../../src/config/partnerIntegration";
import type { AssessmentCapture, KycQualityContext } from "../../src/engine/dataQualityGate";
import type { CustomerMode } from "../../src/config/activityRiskConfig";
import type { ScreeningSubject } from "../screening/types";

export type OnboardingState =
  | "INITIATED"
  | "KYC_PENDING"
  | "SCREENING_PENDING"
  | "DISPOSITION_REQUIRED"
  | "READY_TO_SCORE"
  | "SCORED"
  | "BLOCKED"
  | "CLEARED";

export interface OnboardingSubject extends ScreeningSubject {
  email?: string;
}

export interface StartOnboardingRequest {
  customerId: string;
  customerName: string;
  licenseRegion: LicenseRegion;
  mode: CustomerMode;
  subject: OnboardingSubject;
  /** Core banking pre-fill — merged into capture before score */
  capture?: Partial<AssessmentCapture>;
}

export interface ShuftiWebhookPayload {
  reference: string;
  event: string;
  verification_status?: string;
  declined_reason?: string;
  verification_result?: {
    document?: { name?: string; dob?: string; document_number?: string };
    face?: { liveness_score?: number };
  };
  timestamp?: string;
  [key: string]: unknown;
}

export interface OnboardingCaseRecord {
  id: string;
  customerId: string;
  customerName: string;
  licenseRegion: LicenseRegion;
  mode: CustomerMode;
  state: OnboardingState;
  shuftiReference: string | null;
  shuftiStatus: string | null;
  screeningCaseId: string | null;
  vital4CaseId: string | null;
  kycContext: KycQualityContext | null;
  capture: Partial<AssessmentCapture> | null;
  subject: OnboardingSubject;
  blockReason: string | null;
  finalRating: string | null;
  composite: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerSyncPayload {
  onboarding: OnboardingCaseRecord;
  kyc: KycQualityContext | null;
  screening: {
    sanctions: string;
    pep: string;
    adverse: string;
    watchlist: string;
    screeningCompletedAt: string;
  } | null;
}
