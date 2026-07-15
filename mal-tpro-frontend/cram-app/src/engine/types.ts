// Mal FinCrime OS — CRAM scoring engine types
// Pure, deterministic. No I/O. See docs/02-SCORING-ENGINE-CONTRACT.md

import type { CustomerLegalForm, UboVerificationStatus } from "./activityProfile";
import type { BehaviourStatus, BehaviourGateType } from "../config/behaviourGate";
import type { PepGateType } from "../config/pepGate";

export type Score = 1 | 2 | 3;
export type Band = "Low" | "Medium" | "High";
/**
 * Final customer rating. Three rating tiers only — Low / Medium / High (CRAM §2.2 / §3.1).
 * "Prohibited" is an override ACTION (reject / block / exit), not a fourth tier; the weighted
 * math band never produces it. Precedence: PROHIBITED > HIGH > MEDIUM > LOW (= math band).
 */
export type FinalRating = "Low" | "Medium" | "High" | "Prohibited";
export type Boundary = "calculator" | "cram";

export type PepStatus = "None" | "Domestic" | "Foreign" | "IO";
export type ScreenResult = "Clear" | "Potential Match" | "True Match";
export type AdverseResult = "None" | "Potential" | "True Match";

export interface OverrideHit {
  id: string;
  cls: "PROHIBITED" | "HIGH" | "MEDIUM";
  why: string;
  /** True for risk-appetite floors that are NOT regulation-mandated (e.g. OVR-011 Tier-3 country). */
  discretionary?: boolean;
}

export interface FactorOut {
  key: string;
  name: string;
  weight: number;
  score: number;       // 1..3
  /** Points added to composite (0 when audit-only sub-row) */
  contribution: number;
  /** Standalone score × weight — shown for audit when countsInComposite is false */
  auditContribution?: number;
  /** When false, row is transparency-only; composite uses worst-of pillar instead */
  countsInComposite?: boolean;
  /** Explainability hint (e.g. which sub-score drives max pillar) */
  compositeNote?: string;
}

export interface ProductServicePillar {
  productScore: Score;
  serviceScore: Score;
  combinedScore: Score;
  combinedWeight: number;
  contribution: number;
  drivenBy: "product" | "service";
}

export interface ChannelPillar {
  initiationScore: Score;
  deliveryScore: Score;
  combinedScore: Score;
  combinedWeight: number;
  contribution: number;
  drivenBy: "initiation" | "delivery";
}

export interface PepGateResult {
  status: PepStatus;
  score: Score;
  gateType: PepGateType;
  overrideHigh: boolean;
  mediumFloor: boolean;
  overrideId: "OVR-008" | "OVR-016" | null;
  eddTrigger: boolean;
  approvalNote: string;
  relationshipHighRisk: boolean;
  crossBorderExposure: boolean;
  /** Regulatory citation for audit trail (perimeter-aware) */
  regulatoryBasis?: string;
  cbuaeBasis: string;
  /** Legacy share — shown for audit; not in composite */
  auditShare?: number;
}

export interface BehaviourGateResult {
  status: BehaviourStatus;
  label: string;
  gateType: BehaviourGateType;
  reviewRequired: boolean;
  overrideHigh: boolean;
  transactionUplift: Score;
  /** TM band suggestion when analyst selects a different status */
  suggestedStatus?: BehaviourStatus;
}

export type { CustomerLegalForm, UboVerificationStatus };

export interface ScoreInput {
  segment: string;
  lifecycle: "New" | "Existing";
  // customer-type drivers
  employmentScore: Score;
  professionScore: Score;
  natureOfBusinessScore: Score;
  pep: PepStatus;
  /**
   * Provenance of the PEP tier in `pep`. An RCA — a close relative or associate of a PEP —
   * inherits the principal PEP's tier (FATF/FinCEN RCA rule), so `pep` must hold that tier
   * (Foreign / IO) with `pepRelationship` set to "relative" or "associate". Default "self".
   * Does not change scoring — only the override provenance/audit and a capture-consistency guard.
   */
  pepRelationship?: "self" | "relative" | "associate";
  segmentScore: Score;
  /** @deprecated use expectedMonthlyBand — kept for assessment snapshot compat */
  monthlyValueScore?: Score;
  /** Declared at onboarding — expected activity profile (Policy §12.5) */
  expectedMonthlyBand?: Score;
  /** Observed from transaction monitoring — rolling actual (Policy §12.6) */
  actualMonthlyBand?: Score;
  /** Beneficial ownership / control transparency (Policy §12.2; OVR-004) */
  legalForm?: CustomerLegalForm;
  uboStatus?: UboVerificationStatus;
  uboLayers?: number;
  // geography (firm scores per attribute)
  residenceFirm: number;
  nationalityFirm: number;
  birthFirm: number;
  sowFirm: number;
  // C-1 BACKLOG: When the customer is a freelancer using a regulated platform (Upwork, Freelancer.com,
  // Fiverr), the platform itself is a documented SoW/SoF channel and should be treated as Medium (2)
  // rather than High (3) in the sowFirm/sofFirm capture, provided the platform is licenced and the
  // customer can evidence regular platform payouts.  UI guidance ticket: pending.
  sofFirm: number;
  residenceName: string;
  nationalityName?: string;
  birthName?: string;
  sowName?: string;
  sofName: string;
  incorpName?: string;
  uboName?: string;
  /** UAE Methodology §7.2 / B-3: expected transaction corridor firm score (0–4).
   *  If undefined, cram.ts proxies with max(sowFirm, sofFirm) pending full corridor model. */
  corridorFirm?: number;
  /** UAE Methodology §7.2 / B-3: digital geolocation risk signal (0–4 firm equiv).
   *  If undefined, cram.ts defaults to Medium (2) — conservative pending capture field. */
  digitalGeoFirm?: number;
  // product/service/channel
  productScore: Score;
  serviceScore: Score;
  /** Onboarding / relationship initiation channel (HTML init_channel) */
  initiationChannelScore: Score;
  /** Ongoing service delivery channel (HTML delivery_channel) */
  deliveryChannelScore: Score;
  /** @deprecated use initiationChannelScore — legacy capture alias */
  channelScore?: Score;
  /** @deprecated use deliveryChannelScore — legacy capture alias */
  interfaceScore?: Score;
  /** Expected-vs-actual behaviour gate (Policy §12.6) — drives review / override workflow */
  behaviourStatus?: BehaviourStatus;
  // transaction/behaviour
  investigationsScore: Score;
  strsScore: Score;
  // screening
  sanctions: ScreenResult;
  watchlist: "Clear" | "True Match";
  adverse: AdverseResult;
  /** Incorporation country firm score — entity geography (maps to birthFirm slot when entity) */
  incorpFirm?: number;
  // manual override
  manualOverride?: "" | Band;
  /** Individual vs entity — drives ISIC/profession resolution (docs/06) */
  customerMode?: "individual" | "entity";
  declaredProfession?: string;
  declaredActivity?: string;
  providedIsicCode?: string;
  entityTypeScore?: Score;
  /** Entity legal type label — 28-form register (CRAM Suite) */
  declaredEntityType?: string;
  selfEmployed?: boolean;
  /**
   * US perimeter (global_account) only — on-chain sanctioned-wallet exposure signal (OVR-003).
   * "direct_tagged"/"mixer" and "indirect_low" (≥10% within ≤5 hops to a lower-severity cluster)
   * → HIGH floor (CRAM §5.6/§7.3.3). A confirmed direct SDN / terrorism true-match is handled as a
   * Prohibited sanctions hit (OVR-001) via the sanctions field, not here. Undefined/"none" = inert.
   */
  walletExposure?: "none" | "indirect_low" | "direct_tagged" | "mixer";
  /** Master Risk Registry audit trail (optional — set by captureToScoreInput). */
  masterRegistryVersion?: string;
  masterRegistryActivityId?: string;
  masterRegistryProductId?: string;
  masterRegistryPerimeter?: import("../config/perimeters").CompliancePerimeter;
}

export interface ScoreResult {
  factors: FactorOut[];
  composite: number;     // final risk factor 1..3 (4dp)
  mathBand: Band;
  overrides: OverrideHit[];
  floor: "PROHIBITED" | "HIGH" | "MEDIUM" | null;
  finalRating: FinalRating;
  overridden: boolean;
  boundary: Boundary;
  /** Policy-aligned sub-factor notes (UBO score, activity deviation) — not override floors */
  profileNotes: string[];
  /** ISIC / profession resolution audit block (docs/06 §6) */
  activityResolution?: import("./activityRisk").ActivityResolution;
  professionResolution?: import("./activityRisk").ProfessionResolution;
  /** Product & service worst-of pillar audit (max score × combined 25% weight) */
  productServicePillar?: ProductServicePillar;
  /** Channel worst-of pillar audit (max(initiation, delivery) × combined 10% weight) */
  channelPillar?: ChannelPillar;
  /** Behaviour gate resolution — review vs High override (Policy §12.6) */
  behaviourGate?: BehaviourGateResult;
  /** PEP gate — categorical floor only; excluded from composite (OVR-008 / OVR-016) */
  pepGate?: PepGateResult;
}
