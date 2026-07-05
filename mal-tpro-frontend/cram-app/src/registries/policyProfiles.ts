/**
 * Regulatory policy profiles — loaded by perimeter selection.
 * Single source of truth for CDD, EDD, monitoring, review cycles, sanctions.
 */
import type { CompliancePerimeter } from "../config/perimeters";
import type { PolicyProfile, PolicyProfileId } from "../engine/rbm/types";

export const POLICY_PROFILES: Record<PolicyProfileId, PolicyProfile> = {
  cbuae: {
    id: "cbuae",
    label: "CBUAE Banking Policy",
    regulator: "Central Bank of the UAE",
    perimeter: "mal_bank",
    version: "CBUAE-RBM-2026.07",
    componentWeights: {
      customer: 12,
      product: 18,
      businessActivity: 20,
      useCase: 8,
      corridor: 9,
      deliveryChannel: 2,
      expectedBehaviour: 2,
    },
    highRiskCountryCodes: ["IR", "KP", "SY", "AF", "MM"],
    sanctionsProgrammes: ["UAE Local Terrorist List", "UN Consolidated", "OFAC SDN (dual-use)"],
    eddTriggers: [
      "High inherent risk score ≥ 70",
      "PEP or PEP associate",
      "Trade finance or dual-use goods",
      "High-risk corridor",
      "Complex ownership",
    ],
    reviewCycles: [
      { band: "Low", months: 60 },
      { band: "Medium", months: 36 },
      { band: "Medium High", months: 12 },
      { band: "High", months: 12 },
    ],
    monitoringScenarios: [
      { id: "TM-101", label: "Domestic salary pattern", trigger: "Payroll use case" },
      { id: "TM-501", label: "Trade-based ML", trigger: "Trade finance activity" },
      { id: "TM-214", label: "Cross-border velocity", trigger: "Corridor score ≥ 55" },
    ],
    cddRules: ["Source of Funds", "Source of Wealth", "Beneficial ownership ≥ 25%"],
    pepRules: ["Domestic PEP EDD", "Foreign PEP EDD", "PEP associate review"],
    beneficialOwnershipThreshold: 25,
    nraVersion: "UAE-NRA-2018-2024",
  },
  us_baas: {
    id: "us_baas",
    label: "US MSB / BaaS Policy",
    regulator: "FinCEN · OFAC · State MSB",
    perimeter: "global_account",
    version: "US-BaaS-RBM-2026.07",
    componentWeights: {
      customer: 12,
      product: 18,
      businessActivity: 20,
      useCase: 8,
      corridor: 9,
      deliveryChannel: 2,
      expectedBehaviour: 2,
    },
    highRiskCountryCodes: ["IR", "KP", "RU", "BY", "SY", "CU"],
    sanctionsProgrammes: ["OFAC SDN", "OFAC Sectoral", "FinCEN 311", "BIS Entity List"],
    eddTriggers: [
      "High inherent risk score ≥ 65",
      "MSB or VA exposure",
      "Nested payments enabled",
      "High-risk jurisdiction corridor",
      "Beneficial ownership opacity",
    ],
    reviewCycles: [
      { band: "Low", months: 36 },
      { band: "Medium", months: 24 },
      { band: "Medium High", months: 12 },
      { band: "High", months: 6 },
    ],
    monitoringScenarios: [
      { id: "TM-214", label: "Cross-border velocity", trigger: "Global account product" },
      { id: "TM-301", label: "Third-party beneficiary", trigger: "Third-party payments enabled" },
      { id: "TM-402", label: "Nested payment chain", trigger: "Nested payments possible" },
    ],
    cddRules: ["CDD Rule (FinCEN)", "Beneficial ownership ≥ 25%", "Customer identification program"],
    pepRules: ["PEP identification", "Senior foreign political figure EDD"],
    sarThresholds: [{ currency: "USD", amount: 5000, label: "SAR structuring review" }],
    ctrRules: ["Currency Transaction Report > USD 10,000"],
    travelRule: true,
    beneficialOwnershipThreshold: 25,
    nraVersion: "US-NRA-2022",
  },
};

export const RBM_ENGINE_VERSION = "RBM-1.0.0";

export function policyProfileForPerimeter(perimeter: CompliancePerimeter): PolicyProfile {
  return perimeter === "mal_bank" ? POLICY_PROFILES.cbuae : POLICY_PROFILES.us_baas;
}

export function policyProfileById(id: PolicyProfileId): PolicyProfile {
  return POLICY_PROFILES[id];
}

export function reviewMonthsForBand(profile: PolicyProfile, band: string): number {
  const row = profile.reviewCycles.find((r: { band: string; months: number }) => r.band === band);
  if (row) return row.months;
  const fallback = profile.reviewCycles.find((r: { band: string; months: number }) => r.band === "Medium");
  return fallback?.months ?? 36;
}
