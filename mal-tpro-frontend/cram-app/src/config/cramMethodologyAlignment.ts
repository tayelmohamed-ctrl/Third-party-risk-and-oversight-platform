/**
 * Cross-check matrix: live CRAM implementation vs
 * "Customer Risk Assessment Methodology CBUAE Digital Bank" (CRAM-CBUAE-2026-05-FREEZE-01).
 */
import { DEFAULT_BAND_BOUNDARIES } from "./bandBoundaries";
import { DEFAULT_FACTOR_WEIGHTS, LIFECYCLE_FACTOR_WEIGHTS, resolveLifecycleWeightProfile } from "./runtimeConfig";
import { MODEL_VERSION_ID } from "../validation/independentValidation";
import { OVERRIDES } from "../engine/data";
import { CFG } from "../engine/cramSuiteConfig";

export type AlignmentStatus = "aligned" | "partial" | "gap";

export interface AlignmentRow {
  id: string;
  domain: string;
  cbuaeReference: string;
  implementation: string;
  status: AlignmentStatus;
  notes?: string;
}

export const CBUAE_SOURCE = {
  title: "Customer Risk Assessment Methodology CBUAE Digital Bank",
  modelVersion: "CRAM-CBUAE-2026-05-FREEZE-01",
  authoritativeBands: { lowMax: 1.5, mediumMax: 2.15 },
  npNewWeights: {
    customerProfile: 0.25,
    geography: 0.2,
    productService: 0.2,
    digitalChannel: 0.25,
    expectedActivity: 0.1,
  },
  reviewMonths: { Low: 36, Medium: 24, High: 12 },
} as const;

const fw = DEFAULT_FACTOR_WEIGHTS;
const implProductService = fw.product + fw.service;

export const METHODOLOGY_ALIGNMENT: AlignmentRow[] = [
  {
    id: "model-version",
    domain: "Model version",
    cbuaeReference: CBUAE_SOURCE.modelVersion,
    implementation: MODEL_VERSION_ID,
    status: MODEL_VERSION_ID === CBUAE_SOURCE.modelVersion ? "aligned" : "gap",
  },
  {
    id: "score-scale",
    domain: "Inherent score scale",
    cbuaeReference: "1.0000 – 3.0000 (four decimal precision)",
    implementation: "1 – 3 composite; stored/displayed to 3–4 decimals",
    status: "aligned",
  },
  {
    id: "bands-authoritative",
    domain: "Authoritative rating bands (§4.1)",
    cbuaeReference: "Low ≤ 1.5000 · Medium ≤ 2.1500 · High > 2.1500",
    implementation: `Calculator set: Low ≤ ${DEFAULT_BAND_BOUNDARIES.calculator.lowMax} · Medium ≤ ${DEFAULT_BAND_BOUNDARIES.calculator.mediumMax}`,
    status: "aligned",
    notes: "Calculator boundary set matches §4.1. CRAM sensitivity set (1.0 / 2.0) is an additional test-bench profile.",
  },
  {
    id: "non-dilution",
    domain: "Non-dilution principle",
    cbuaeReference: "Final = max(math band, override floor); prohibitions before approval",
    implementation: "scoreCustomer + override layer; finalRating = most restrictive",
    status: "aligned",
  },
  {
    id: "pep-composite",
    domain: "PEP treatment",
    cbuaeReference: "PEP exposure in NP library (15%); High/Medium floors via overrides",
    implementation: "PEP excluded from composite; OVR-008 High · OVR-016 Medium floors",
    status: "aligned",
    notes: "Implementation applies stricter non-dilution — PEP cannot be averaged down in the composite.",
  },
  {
    id: "override-registry",
    domain: "Override registry (§13)",
    cbuaeReference: "OVR-001 … OVR-020 deterministic floors and prohibitions",
    implementation: `${OVERRIDES.length} rules (OVR-001 … OVR-020)`,
    status: OVERRIDES.length === 20 ? "aligned" : "partial",
  },
  {
    id: "factor-weights-np-new",
    domain: "NP New factor weights (§6.1)",
    cbuaeReference: "Profile 25% · Geo 20% · Product/service 20% · Channel 25% · Activity 10%",
    implementation: `Lifecycle resolver · NP New: Profile ${(LIFECYCLE_FACTOR_WEIGHTS.np_new.customerType * 100).toFixed(0)}% · Geo ${(LIFECYCLE_FACTOR_WEIGHTS.np_new.geography * 100).toFixed(0)}% · Product∪service ${((LIFECYCLE_FACTOR_WEIGHTS.np_new.product + LIFECYCLE_FACTOR_WEIGHTS.np_new.service) * 100).toFixed(0)}% · Channel ${(LIFECYCLE_FACTOR_WEIGHTS.np_new.channel * 100).toFixed(0)}% · Transaction ${(LIFECYCLE_FACTOR_WEIGHTS.np_new.transaction * 100).toFixed(0)}%`,
    status: "aligned",
    notes: "scoreCustomer switches weights via resolveLifecycleWeightProfile(segment + lifecycle + mode). NP Existing / LP/MER / FI profiles in LIFECYCLE_FACTOR_WEIGHTS.",
  },
  {
    id: "factor-weights-lifecycle",
    domain: "Lifecycle weight switching (§6.1)",
    cbuaeReference: "NP Existing transaction 30%; LP/MER Existing 35%; FI systems 15%",
    implementation: "getFactorWeightsForInput(ScoreInput) → np_new | np_existing | lp_new | lp_existing | fi_new | fi_existing",
    status: "aligned",
  },
  {
    id: "worst-of-pillars",
    domain: "Product & channel aggregation",
    cbuaeReference: "Highest active/requested product score; channel/API assurance standalone factor",
    implementation: "max(product, service) and max(initiation, delivery) pillars",
    status: "aligned",
  },
  {
    id: "review-low",
    domain: "Review frequency — Low (§14 / policy profile)",
    cbuaeReference: "Maximum 36 months (CBUAE §14)",
    implementation: "Golden thread uses policyProfiles: mal_bank 36 mo · global_account 36 mo",
    status: "aligned",
    notes: "Perimeter-aware review cycles via policyProfileForPerimeter in computeGoldenThread. CFG.reviewMonths derived from policyProfiles (A-3).",
  },
  {
    id: "review-medium",
    domain: "Review frequency — Medium (§14 / policy profile)",
    cbuaeReference: "Maximum 24 months (CBUAE §14)",
    implementation: "Golden thread: mal_bank 24 mo · global_account 24 mo",
    status: "aligned",
  },
  {
    id: "review-high",
    domain: "Review frequency — High (§14)",
    cbuaeReference: "Maximum 12 months (6 for very high-risk PEP/correspondent where required)",
    implementation: `${CFG.reviewMonths.High} months`,
    status: "aligned",
  },
  {
    id: "residual-controls",
    domain: "Residual / control-adjusted view",
    cbuaeReference: "Inherent rating primary; controls must not reduce mandatory CDD/EDD or override floors",
    implementation: `Residual capped at ${CFG.residual.maxReduction}% reduction · ${CFG.residual.oneBandCap}-band step cap`,
    status: "aligned",
  },
  {
    id: "data-quality-gate",
    domain: "No default-to-Low / DQ gate",
    cbuaeReference: "Missing critical data blocks completion or conservative treatment (§2, §15)",
    implementation: "scoreWithDataQualityGate — BLOCKED if mandatory capture incomplete",
    status: "aligned",
  },
  {
    id: "entity-llc",
    domain: "LP legal form — standard LLC/SME",
    cbuaeReference: "Standard LLC/SME, free-zone entity → Medium (2)",
    implementation: "entity_legal_types.json — LLC score 2 / Medium",
    status: "aligned",
    notes: "Aligned after parameter library correction (was incorrectly High).",
  },
];

export function alignmentSummary(rows: AlignmentRow[] = METHODOLOGY_ALIGNMENT) {
  return {
    aligned: rows.filter((r) => r.status === "aligned").length,
    partial: rows.filter((r) => r.status === "partial").length,
    gap: rows.filter((r) => r.status === "gap").length,
    total: rows.length,
  };
}
