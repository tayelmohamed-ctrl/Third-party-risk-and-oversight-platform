// Mal Bank Policy §12.2 (UBO), §12.5 (expected activity), §12.6 (inconsistency)
// Digital Onboarding Procedures §2 (UBO), §10 (expected activity profile)
import type { Score } from "./types";

export type CustomerLegalForm = "natural" | "legal" | "legal_arrangement";
export type UboVerificationStatus = "verified" | "complex_pending" | "refused" | "listed_exempt" | "na";

/** Inherent UBO / ownership-transparency score for customer-type factor (1=Low … 3=High). */
export function uboRiskScore(
  legalForm: CustomerLegalForm,
  uboStatus: UboVerificationStatus,
  uboLayers = 1,
): Score {
  if (legalForm === "natural") return 1;
  if (uboStatus === "listed_exempt") return 1;
  if (uboStatus === "verified" && uboLayers <= 2) return 1;
  if (uboStatus === "verified" && uboLayers >= 3) return 2;
  if (uboStatus === "complex_pending") return 3;
  if (uboStatus === "refused") return 3;
  return 2;
}

/** Policy §12.6 — material inconsistency between declared and observed activity. */
export function activityDeviationScore(expected: Score, actual: Score): Score {
  const delta = actual - expected;
  if (delta >= 2) return 3;
  if (delta >= 1 || delta <= -2) return 2;
  return 1;
}

export function isMaterialActivityDeviation(expected: Score, actual: Score): boolean {
  return actual - expected >= 2;
}

export function activityDeviationLabel(expected: Score, actual: Score): string {
  const delta = actual - expected;
  if (delta >= 2) return "Material exceedance — Compliance review (Policy §12.6)";
  if (delta >= 1) return "Moderate exceedance of expected profile";
  if (delta <= -2) return "Material under-activity vs declared profile";
  if (delta <= -1) return "Below expected profile";
  return "Aligned with expected activity profile";
}

/** AED band labels (UAE / mal_bank) aligned with onboarding procedure expected activity capture. */
export const MONTHLY_BAND_LABEL: Record<Score, string> = {
  1: "< AED 50k / month",
  2: "AED 50k–250k / month",
  3: "> AED 250k / month",
};

/** USD band labels (US / global_account) aligned with cramSuiteConfig.expectedUsd (15k/75k/150k). */
export const MONTHLY_BAND_LABEL_USD: Record<Score, string> = {
  1: "< USD 15k / month",
  2: "USD 15k–75k / month",
  3: "> USD 75k / month",
};
