/**
 * Risk-Based Methodology (RBM) — multi-factor inherent risk architecture.
 * Regulator-agnostic core types; policy profiles supply jurisdiction rules.
 */
import type { CompliancePerimeter } from "../../config/perimeters";
import type { CustomerMode } from "../../config/activityRiskConfig";

export type RiskBand = "Low" | "Medium" | "Medium High" | "High" | "Prohibited";
export type PolicyProfileId = "cbuae" | "us_baas";

/** Configurable component weights — sum to 100 for inherent score. */
export interface RbmComponentWeights {
  customer: number;
  product: number;
  businessActivity: number;
  useCase: number;
  corridor: number;
  deliveryChannel: number;
  expectedBehaviour: number;
}

export interface PolicyProfile {
  id: PolicyProfileId;
  label: string;
  regulator: string;
  perimeter: CompliancePerimeter;
  version: string;
  componentWeights: RbmComponentWeights;
  highRiskCountryCodes: string[];
  sanctionsProgrammes: string[];
  eddTriggers: string[];
  reviewCycles: { band: RiskBand; months: number }[];
  monitoringScenarios: { id: string; label: string; trigger: string }[];
  cddRules: string[];
  pepRules: string[];
  sarThresholds?: { currency: string; amount: number; label: string }[];
  ctrRules?: string[];
  travelRule?: boolean;
  beneficialOwnershipThreshold?: number;
  nraVersion?: string;
}

/** Structured business activity — ISIC is one attribute (~5% of logic). */
export interface StructuredBusinessActivity {
  id: string;
  label: string;
  isicCode: string;
  industry: string;
  fatfSector: string;
  baseRiskScore: number;
  baseRiskBand: RiskBand;
  cashIntensive: boolean;
  crossBorder: boolean;
  regulated: boolean;
  highRiskGeographyExposure: boolean;
  anonymousTransactions: "No" | "Possible" | "Yes";
  sanctionsExposure: RiskBand;
  fraudExposure: RiskBand;
  mlTypology: string;
  virtualAssetsExposure: boolean;
  msbExposure: boolean;
  tradeFinance: boolean;
  highRiskGoods: boolean;
  dualUseGoods: "No" | "Possible" | "Yes";
  governmentContracts: boolean;
  expectedAnnualTurnover?: string;
  expectedMonthlyVolume?: string;
  expectedMonthlyTransactions?: number;
  expectedAverageTransaction?: string;
  highValuePayments: boolean;
  thirdPartyPayments: "No" | "Allowed" | "Restricted";
  nestedPayments: "No" | "Possible" | "Yes";
  expectedSourceOfFunds?: string;
  expectedSourceOfWealth?: string;
  monitoringRules: string[];
  eddRequired: boolean;
  reviewCycleMonths: number;
  rationale: string;
  libraryVersion: string;
  /** NRA sector match — jurisdiction-specific */
  nraSectorId?: string;
  nraRating?: string;
  nraSource?: string;
  nraMatchDetail?: string;
}

export interface ProductRiskEntry {
  id: string;
  name: string;
  perimeter: CompliancePerimeter;
  license: string;
  settlement: string[];
  virtualIban: boolean;
  currencies: { code: string; enabled: boolean; primary?: boolean }[];
  correspondentBanking: boolean;
  swift: boolean;
  domesticClearing: boolean;
  cash: "No" | "Possible" | "Yes";
  crossBorderPct: number;
  cheque?: boolean;
  salary?: boolean;
  tradeFinance?: "No" | "Optional" | "Yes";
  inherentScore: number;
  inherentBand: RiskBand;
  monitoringRules: string[];
  rationale: string;
}

export interface CorridorRiskEntry {
  id: string;
  origin: string;
  destination: string;
  label: string;
  sanctionsScore: number;
  transparencyIndex: number;
  amlIndex: number;
  fatfStatus: string;
  currency: string;
  swift: boolean;
  nestedRisk: boolean;
  correspondentRisk: RiskBand;
  finalScore: number;
  finalBand: RiskBand;
  monitoringNote: string;
}

export interface UseCaseEntry {
  id: string;
  label: string;
  description: string;
  expectedParties: string[];
  thirdParty: boolean;
  crossBorder: "No" | "Optional" | "High";
  expectedMonthlyVolume?: string;
  expectedAverage?: string;
  expectedPattern: string;
  velocity: "Low" | "Medium" | "High";
  nested: "No" | "Possible" | "Yes";
  cash: boolean;
  inherentScore: number;
  inherentBand: RiskBand;
  monitoringRules: string[];
}

export interface ExpectedBehaviourProfile {
  useCaseId: string;
  currency: string;
  geography: string;
  frequency: string;
  monthlyTransactions: number;
  averageTransaction: number;
  allowedCounterparties: string[];
  prohibitedPatterns: string[];
}

export interface ActualBehaviourSnapshot {
  currency: string;
  geography: string;
  frequency: string;
  monthlyTransactions: number;
  averageTransaction: number;
  counterpartyTypes: string[];
  flags: string[];
}

export interface BehaviourDeviation {
  dimension: string;
  expected: string;
  actual: string;
  severity: "low" | "medium" | "high";
  scoreUplift: number;
  rationale: string;
}

export interface RbmComponentScore {
  key: keyof RbmComponentWeights | "controlEffectiveness";
  label: string;
  weight: number;
  rawScore: number;
  contribution: number;
  band: RiskBand;
  drivers: string[];
  policyRefs: string[];
}

export interface RbmRuleOverride {
  id: string;
  label: string;
  effect: "floor" | "uplift" | "prohibit" | "edd" | "monitoring";
  regulatoryBasis: string;
  scoreDelta?: number;
}

export interface RbmAssessmentInput {
  perimeter: CompliancePerimeter;
  mode: CustomerMode;
  customerTypeScore?: number;
  productId: string;
  activityId?: string;
  activity?: StructuredBusinessActivity;
  useCaseId: string;
  corridorId: string;
  deliveryChannelScore?: number;
  controlEffectiveness?: number;
  expectedBehaviour?: ExpectedBehaviourProfile;
  actualBehaviour?: ActualBehaviourSnapshot;
}

export interface RbmAssessmentResult {
  policyProfile: PolicyProfile;
  version: string;
  compositeScore: number;
  compositeBand: RiskBand;
  inherentScore: number;
  residualScore: number;
  components: RbmComponentScore[];
  overrides: RbmRuleOverride[];
  behaviourDeviations: BehaviourDeviation[];
  why: string[];
  eddRequired: boolean;
  reviewCycleMonths: number;
  monitoringScenarios: string[];
  approvalAuthority: string;
  activity?: StructuredBusinessActivity;
  product: ProductRiskEntry;
  corridor: CorridorRiskEntry;
  useCase: UseCaseEntry;
  prohibited: boolean;
}
