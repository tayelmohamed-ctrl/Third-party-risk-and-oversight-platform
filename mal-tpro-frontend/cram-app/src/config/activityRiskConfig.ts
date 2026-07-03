/**
 * ISIC Rev.5 activity-risk configuration — Individual (NP) vs Entity (LP/MER).
 * Bound to model version CRAM-CBUAE-2026-05-FREEZE-01 · docs/06-ACTIVITY-RISK-ISIC.md
 */
import type { Score } from "../engine/types";
import { entityTypeScore as scoreFromRegister } from "./entityLegalTypes";

export type CustomerMode = "individual" | "entity";

export const ACTIVITY_LIBRARY_VERSION = "ISIC-REV5-AML-2026-05";

export interface ParameterConfig {
  key: string;
  label: string;
  weightInCustomerType: number;
  resolver: "resolveProfession" | "resolveActivity" | "entityLegalType";
  mandatory: boolean;
  description: string;
}

export interface ModeActivityConfig {
  mode: CustomerMode;
  segmentCode: string;
  segmentLabel: string;
  libraryVersion: string;
  parameters: ParameterConfig[];
  resolutionOrder: string[];
  prohibitionSource: string;
  auditFields: string[];
}

export const ACTIVITY_RISK_CONFIG: Record<CustomerMode, ModeActivityConfig> = {
  individual: {
    mode: "individual",
    segmentCode: "NP",
    segmentLabel: "Natural person",
    libraryVersion: ACTIVITY_LIBRARY_VERSION,
    parameters: [
      { key: "employment", label: "Employment status", weightInCustomerType: 0.12, resolver: "resolveProfession", mandatory: true, description: "Salaried / self-employed / unemployed typology" },
      { key: "profession", label: "Profession / occupation", weightInCustomerType: 0.18, resolver: "resolveProfession", mandatory: true, description: "profession.csv + isic_profession_guidance.csv + rule uplift" },
      { key: "activity", label: "Self-employed business activity (ISIC)", weightInCustomerType: 0.18, resolver: "resolveActivity", mandatory: false, description: "ISIC Rev.5 when customer is business owner / freelancer" },
      { key: "pep", label: "PEP status", weightInCustomerType: 0, resolver: "resolveProfession", mandatory: true, description: "Gate only — OVR-008/016 floors; excluded from composite" },
      { key: "segment", label: "Customer segment", weightInCustomerType: 0.12, resolver: "resolveProfession", mandatory: true, description: "Retail · HNW · Affluent" },
      { key: "expectedActivity", label: "Expected activity band", weightInCustomerType: 0.08, resolver: "resolveProfession", mandatory: true, description: "Onboarding declaration §12.5" },
      { key: "ubo", label: "UBO (n/a natural)", weightInCustomerType: 0.14, resolver: "resolveProfession", mandatory: false, description: "Natural person — fixed Low transparency" },
    ],
    resolutionOrder: [
      "Provided ISIC code → isic_aml_mapping (830)",
      "Typology shortcut → isic_activity_lookup (6)",
      "Title match → isic_aml_mapping",
      "Legacy nature_of_business.csv (169) — prohibition score 4",
      "Theme fallback → isic_risk_themes — never Low",
    ],
    prohibitionSource: "nature_of_business.csv score 4 + Category-A geo nexus",
    auditFields: ["declaredProfession", "declaredActivity", "resolvedIsicCode", "baseScore", "ruleIds", "basis", "cddEdd", "libraryVersion"],
  },
  entity: {
    mode: "entity",
    segmentCode: "LP/MER",
    segmentLabel: "Legal person / merchant",
    libraryVersion: ACTIVITY_LIBRARY_VERSION,
    parameters: [
      { key: "employment", label: "Authorised signatory role", weightInCustomerType: 0.10, resolver: "resolveProfession", mandatory: false, description: "Optional for LP" },
      { key: "profession", label: "Industry NA — use ISIC activity", weightInCustomerType: 0.08, resolver: "resolveProfession", mandatory: false, description: "Profession N/A for pure LP; retained for hybrid cases" },
      { key: "activity", label: "Registered business activity (ISIC Rev.5)", weightInCustomerType: 0.22, resolver: "resolveActivity", mandatory: true, description: "Primary LP/MER driver — ISIC class/group/division" },
      { key: "entityType", label: "Legal form / entity type", weightInCustomerType: 0.10, resolver: "entityLegalType", mandatory: true, description: "LLC · trust · SPV · MSB unregulated" },
      { key: "pep", label: "PEP / control person", weightInCustomerType: 0, resolver: "resolveProfession", mandatory: true, description: "Gate only — OVR-008/016; excluded from composite" },
      { key: "segment", label: "Customer segment", weightInCustomerType: 0.10, resolver: "resolveProfession", mandatory: true, description: "SME · Corporate · FI" },
      { key: "expectedActivity", label: "Expected turnover band", weightInCustomerType: 0.08, resolver: "resolveProfession", mandatory: true, description: "Merchant / corporate declared profile" },
      { key: "ubo", label: "UBO transparency", weightInCustomerType: 0.16, resolver: "resolveProfession", mandatory: true, description: "verified · complex · refused — OVR-004" },
    ],
    resolutionOrder: [
      "Provided ISIC code → isic_aml_mapping (830)",
      "Typology shortcut → isic_activity_lookup (MSB · casino · crypto · precious metals · auto · convenience)",
      "Title match → isic_aml_mapping",
      "Legacy nature_of_business.csv — prohibition score 4",
      "Theme fallback → isic_risk_themes (12 clusters)",
    ],
    prohibitionSource: "nature_of_business.csv score 4 + shell bank OVR-005 + Category-A geo",
    auditFields: ["declaredActivity", "providedIsicCode", "resolvedIsicCode", "level", "theme", "matchedRules", "basis", "suggestedControls", "libraryVersion"],
  },
};

/** Intra-customer-type weights used by scoreCustomer (must sum to 1.0). PEP excluded — gate only. */
export const CUSTOMER_TYPE_WEIGHTS = {
  individual: { employment: 0.146, profession: 0.220, natureOfBusiness: 0.220, segment: 0.146, expectedActivity: 0.098, ubo: 0.171 },
  entity: { employment: 0.119, profession: 0.095, natureOfBusiness: 0.262, entityType: 0.119, segment: 0.119, expectedActivity: 0.095, ubo: 0.190 },
} as const;

export function entityTypeScore(label: string | undefined): Score {
  return scoreFromRegister(label);
}

export function registerStats() {
  return {
    libraryVersion: ACTIVITY_LIBRARY_VERSION,
    isicMappingRows: 830,
    typologyShortcuts: 6,
    ruleLibraryRules: 18,
    professionGuidanceRows: 16,
    riskThemes: 12,
    natureOfBusinessLegacy: 169,
    professions: 736,
  };
}
