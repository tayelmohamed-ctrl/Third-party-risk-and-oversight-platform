/**
 * Risk explainability & transparency — auditable breakdown for MLRO / Compliance / regulators.
 */
import type { ScoreInput, ScoreResult, FinalRating } from "./types";
import type { GoldenThreadResult } from "./goldenThread";
import { FACTOR_WEIGHTS } from "./cram";
import { matchProfessionTypology, professionTriggersEdd } from "./professionRiskIntelligence";
import { entityLegalTypeSummary, entityTypeProhibited, entityTypeRequiresEdd } from "../config/entityLegalTypes";
import type { CustomerMode } from "./cramSuiteConfig";

export type RiskImpact = "increase" | "decrease" | "neutral" | "floor";

export interface RiskDriver {
  id: string;
  label: string;
  detail: string;
  impact: RiskImpact;
  score?: number;
  policyRef: string;
}

export interface FactorTransparencyRow {
  key: string;
  name: string;
  weight: number;
  score: number;
  contribution: number;
  auditContribution?: number;
  compositeNote?: string;
  policyRef: string;
}

export interface RiskAssessmentSummary {
  inherentScore: number;
  inherentRating: FinalRating;
  mathBand: string;
  overallRiskRating: FinalRating;
  residualScore: number;
  residualRating: string;
  dueDiligence: string;
  eddRequired: boolean;
  approvalAuthority: string;
  reviewMonths: number | null;
  nextReviewDate: string | null;
  monitoringIntensity: string;
  isicClassification: {
    code: string;
    title: string;
    rating: string;
    score: number;
    theme: string;
    typologyRules: string[];
  } | null;
  professionRisk: {
    score: number;
    basis: string;
    typologyDrivers: string[];
    eddTrigger: boolean;
  } | null;
  entityLegalType: {
    name: string;
    score: number;
    rating: string;
    rationale: string;
    prohibited: boolean;
    eddTrigger: boolean;
  } | null;
  behaviourGate: {
    status: string;
    label: string;
    gateType: string;
    reviewRequired: boolean;
    overrideHigh: boolean;
    suggestedStatus?: string;
  } | null;
  pepGate: {
    status: string;
    gateType: string;
    overrideId: string | null;
    overrideHigh: boolean;
    mediumFloor: boolean;
    approvalNote: string;
    auditShare?: number;
  } | null;
  drivers: RiskDriver[];
  factorBreakdown: FactorTransparencyRow[];
  overrides: { id: string; cls: string; why: string }[];
  policyAlignment: string[];
}

const FACTOR_POLICY: Record<string, string> = {
  customerType: "CRA Methodology §6.5 · Customer-type factor (25%) — PEP excluded",
  pep: "PEP gate only · OVR-008/016 floors · not in composite",
  geography: "CRA Methodology §6.4 · Geography — worst-of attributes (20%)",
  productService: "Product & service pillar · max(product, service) × 25% (non-dilution)",
  product: "Product risk library · audit sub-score (15% share)",
  service: "Service typology · audit sub-score (10% share)",
  channel: "Channel pillar · max(initiation, delivery) × 10% (non-dilution)",
  channelInit: "Initiation channel · audit sub-score (5% share)",
  channelDelivery: "Delivery channel · audit sub-score (5% share)",
  transaction: "Policy §12.6 · TM observed behaviour + light gate uplift (20%)",
  behaviourGate: "Expected-vs-actual behaviour gate · review / override workflow (Policy §12.6)",
};

export function buildRiskAssessmentSummary(
  mode: CustomerMode,
  input: ScoreInput,
  result: ScoreResult,
  gt: GoldenThreadResult,
): RiskAssessmentSummary {
  const drivers = buildRiskDrivers(mode, input, result, gt);
  const factorBreakdown = result.factors.map((f) => ({
    key: f.key,
    name: f.name,
    weight: f.weight,
    score: f.score,
    contribution: f.contribution,
    auditContribution: f.auditContribution,
    compositeNote: f.compositeNote,
    policyRef: FACTOR_POLICY[f.key] ?? "CRA Methodology",
  }));

  const act = result.activityResolution;
  const prof = result.professionResolution;
  const typo = input.declaredProfession ? matchProfessionTypology(input.declaredProfession) : undefined;

  return {
    inherentScore: result.composite,
    inherentRating: result.finalRating,
    mathBand: result.mathBand,
    overallRiskRating: result.finalRating,
    residualScore: gt.residual.residualScore,
    residualRating: String(gt.residual.residualLevel),
    dueDiligence: gt.dueDiligence,
    eddRequired: gt.eddRequired,
    approvalAuthority: gt.approval.who,
    reviewMonths: gt.reviewMonths,
    nextReviewDate: gt.nextReviewDate,
    monitoringIntensity: gt.monitoringIntensity,
    isicClassification: act ? {
      code: act.code,
      title: act.title,
      rating: act.rating,
      score: act.score,
      theme: act.theme,
      typologyRules: act.matchedRules,
    } : null,
    professionRisk: prof && mode === "individual" ? {
      score: prof.score,
      basis: prof.basis,
      typologyDrivers: typo?.drivers ?? [],
      eddTrigger: typo?.eddTrigger ?? false,
    } : null,
    entityLegalType: mode === "entity" && input.declaredEntityType
      ? entityLegalTypeSummary(input.declaredEntityType)
      : null,
    behaviourGate: result.behaviourGate ? {
      status: result.behaviourGate.status,
      label: result.behaviourGate.label,
      gateType: result.behaviourGate.gateType,
      reviewRequired: result.behaviourGate.reviewRequired,
      overrideHigh: result.behaviourGate.overrideHigh,
      suggestedStatus: result.behaviourGate.suggestedStatus,
    } : null,
    pepGate: result.pepGate ? {
      status: result.pepGate.status,
      gateType: result.pepGate.gateType,
      overrideId: result.pepGate.overrideId,
      overrideHigh: result.pepGate.overrideHigh,
      mediumFloor: result.pepGate.mediumFloor,
      approvalNote: result.pepGate.approvalNote,
      auditShare: result.pepGate.auditShare,
    } : null,
    drivers,
    factorBreakdown,
    overrides: result.overrides.map((o) => ({ id: o.id, cls: o.cls, why: o.why })),
    policyAlignment: buildPolicyAlignment(input, result, gt),
  };
}

function buildRiskDrivers(
  mode: CustomerMode,
  input: ScoreInput,
  result: ScoreResult,
  gt: GoldenThreadResult,
): RiskDriver[] {
  const d: RiskDriver[] = [];

  if (+input.employmentScore >= 2 && mode === "individual") {
    d.push({ id: "emp", label: "Self-employed / business owner", detail: "Employment status triggers ISIC activity scoring", impact: "increase", policyRef: "Onboarding §10 · NP self-employed" });
  }

  if (result.activityResolution && result.activityResolution.score >= 3) {
    d.push({
      id: "isic", label: `Industry / ISIC: ${result.activityResolution.title}`,
      detail: `${result.activityResolution.basis} · score ${result.activityResolution.score}/3`,
      impact: "increase", score: result.activityResolution.score, policyRef: "docs/06 · ISIC Rev.5 mapping",
    });
  }
  if (result.activityResolution?.prohibited) {
    d.push({ id: "prohib", label: "Prohibited business activity", detail: result.activityResolution.basis, impact: "floor", policyRef: "OVR-002 · nature_of_business score 4" });
  }

  if (mode === "entity" && input.declaredEntityType) {
    const et = entityLegalTypeSummary(input.declaredEntityType);
    if (et) {
      d.push({
        id: "etype",
        label: `Entity legal type: ${et.name}`,
        detail: `${et.rationale} · score ${et.score}/4`,
        impact: et.prohibited ? "floor" : et.score >= 3 ? "increase" : et.score === 1 ? "decrease" : "neutral",
        score: Math.min(et.score, 3),
        policyRef: et.prohibited ? "OVR-006 · Unregulated MSB prohibition" : "Entity legal-form register · 10% customer-type weight",
      });
    }
  }

  if (result.professionResolution && result.professionResolution.score >= 2 && mode === "individual") {
    const typo = input.declaredProfession ? matchProfessionTypology(input.declaredProfession) : undefined;
    d.push({
      id: "prof", label: `Profession: ${input.declaredProfession || "—"}`,
      detail: typo ? typo.drivers.join(" · ") : result.professionResolution.basis,
      impact: result.professionResolution.score >= 3 ? "increase" : "neutral",
      score: result.professionResolution.score,
      policyRef: typo?.policyRef ?? "profession.csv + guidance",
    });
  }

  const geoScore = result.factors.find((f) => f.key === "geography")?.score ?? 1;
  d.push({
    id: "geo", label: "Country / geography risk",
    detail: `Worst-of geography firm score → internal band ${geoScore}/3`,
    impact: geoScore >= 3 ? "increase" : geoScore === 1 ? "decrease" : "neutral",
    score: geoScore,
    policyRef: "Country risk library · Category-A prohibition separate",
  });

  if (input.pep !== "None") {
    d.push({
      id: "pep",
      label: `PEP gate: ${input.pep}`,
      detail: result.pepGate?.approvalNote ?? "Politically exposed person — categorical controls",
      impact: result.pepGate?.overrideHigh ? "floor" : result.pepGate?.mediumFloor ? "increase" : "neutral",
      policyRef: result.pepGate?.overrideId ? `${result.pepGate.overrideId} · gate only (not in composite)` : "PEP register",
    });
  }

  d.push({
    id: "scr_s", label: "Sanctions screening",
    detail: input.sanctions === "Clear" ? "No matches" : input.sanctions,
    impact: input.sanctions === "True Match" ? "floor" : input.sanctions === "Potential Match" ? "increase" : "neutral",
    policyRef: "OVR-001 / HOLD",
  });
  d.push({
    id: "scr_w", label: "Watchlist screening",
    detail: input.watchlist === "Clear" ? "Clear" : "True match",
    impact: input.watchlist === "True Match" ? "floor" : "neutral",
    policyRef: "OVR-002 internal watchlist",
  });
  d.push({
    id: "adv", label: "Adverse media",
    detail: input.adverse === "None" ? "No material adverse media" : input.adverse,
    impact: input.adverse === "True Match" ? "increase" : "neutral",
    policyRef: "OVR-009",
  });

  if (input.investigationsScore >= 3 || input.strsScore >= 3) {
    d.push({ id: "str", label: "STR / investigation", detail: "Confirmed suspicion or active investigation", impact: "floor", policyRef: "OVR-010" });
  }

  if (input.legalForm !== "natural" && input.uboStatus !== "verified") {
    d.push({ id: "ubo", label: "UBO transparency gap", detail: `Status: ${input.uboStatus}`, impact: "increase", policyRef: "Policy §12.2 · OVR-004" });
  }

  const dev = (input.actualMonthlyBand ?? 1) - (input.expectedMonthlyBand ?? 1);
  const beh = result.behaviourGate;
  if (beh?.overrideHigh) {
    d.push({
      id: "beh_ovr",
      label: "Behaviour gate — override",
      detail: beh.label,
      impact: "floor",
      policyRef: "Policy §12.6 · OVR-020 High floor",
    });
  } else if (beh?.gateType === "flag") {
    d.push({
      id: "beh_flag",
      label: "Behaviour gate — review flag",
      detail: beh.label,
      impact: "increase",
      policyRef: "Policy §12.6 · compliance review (no automatic High floor)",
    });
  } else if (dev >= 2) {
    d.push({ id: "dev", label: "Material activity deviation", detail: "Observed TM exceeds declared profile by ≥2 bands", impact: "increase", policyRef: "Policy §12.6" });
  } else if (dev > 0) {
    d.push({ id: "dev", label: "Moderate activity deviation", detail: "Observed activity above declared profile", impact: "neutral", policyRef: "Policy §12.6" });
  }

  for (const o of result.overrides) {
    if (!d.some((x) => x.id === o.id)) {
      d.push({ id: o.id, label: o.id, detail: o.why, impact: o.cls === "PROHIBITED" ? "floor" : "increase", policyRef: "Override register" });
    }
  }

  if (result.productServicePillar) {
    const ps = result.productServicePillar;
    d.push({
      id: "ps_pillar",
      label: "Product & service (worst-of pillar)",
      detail: `Product ${ps.productScore}/3 · Service ${ps.serviceScore}/3 → max ${ps.combinedScore}/3 drives ${(ps.combinedWeight * 100).toFixed(0)}% weight (${ps.drivenBy})`,
      impact: ps.combinedScore >= 3 ? "increase" : ps.combinedScore === 1 ? "decrease" : "neutral",
      score: ps.combinedScore,
      policyRef: "CRA Methodology · non-dilution max(product, service)",
    });
  }

  if (result.channelPillar) {
    const ch = result.channelPillar;
    d.push({
      id: "ch_pillar",
      label: "Channel (worst-of pillar)",
      detail: `Initiation ${ch.initiationScore}/3 · Delivery ${ch.deliveryScore}/3 → max ${ch.combinedScore}/3 drives ${(ch.combinedWeight * 100).toFixed(0)}% weight (${ch.drivenBy})`,
      impact: ch.combinedScore >= 3 ? "increase" : ch.combinedScore === 1 ? "decrease" : "neutral",
      score: ch.combinedScore,
      policyRef: "CRA Methodology · non-dilution max(initiation, delivery)",
    });
  }

  if (input.serviceScore >= 3) {
    d.push({ id: "svc", label: "High-risk service typology", detail: "Cross-border / correspondent / VA service", impact: "increase", score: input.serviceScore, policyRef: "Service typology · EDD trigger" });
  }

  if (input.deliveryChannelScore >= 3) {
    d.push({ id: "ch_del", label: "High-risk delivery channel", detail: "API / correspondent / nested delivery exposure", impact: "increase", score: input.deliveryChannelScore, policyRef: "Channel typology · CBUAE digital/API" });
  }

  if (mode === "individual" && input.declaredProfession && professionTriggersEdd(input.declaredProfession)) {
    d.push({ id: "typo_edd", label: "Occupation EDD typology", detail: matchProfessionTypology(input.declaredProfession)?.drivers.join(" · ") ?? "", impact: "increase", policyRef: matchProfessionTypology(input.declaredProfession)?.policyRef ?? "AML Policy §12" });
  }

  if (gt.eddRequired) {
    d.push({ id: "edd", label: "Enhanced Due Diligence required", detail: gt.dispositionText, impact: "increase", policyRef: "AML Policy · EDD procedures" });
  }
  if (gt.approval.cls === "HIGH" || gt.approval.cls === "PROHIBITED") {
    d.push({ id: "appr", label: "Senior approval required", detail: gt.approval.who, impact: "neutral", policyRef: "Internal approval matrix" });
  }

  if (result.overridden && input.manualOverride) {
    d.push({ id: "mo", label: `Manual override → ${input.manualOverride}`, detail: "MLRO manual adjustment (non-dilution applies)", impact: input.manualOverride === "Low" ? "decrease" : "increase", policyRef: "Override governance · MLRO only" });
  }

  return d;
}

function buildPolicyAlignment(input: ScoreInput, result: ScoreResult, gt: GoldenThreadResult): string[] {
  const lines: string[] = [
    `CRA composite ${result.composite.toFixed(2)} → ${result.finalRating} (math band ${result.mathBand})`,
    `Six-factor model · PEP gate-only (excluded from customer-type composite) · behaviour gate drives review/override`,
  ];
  if (gt.eddRequired) lines.push("EDD triggered — Enhanced Due Diligence per AML Policy before onboarding");
  else lines.push("Standard CDD pathway — no mandatory EDD triggers active");
  lines.push(`Review cycle: ${gt.reviewMonths ? `${gt.reviewMonths} months` : "N/A"} · Monitoring: ${gt.monitoringIntensity}`);
  if (gt.residual.controlGap) lines.push("Control gap flagged — weak controls vs High inherent risk (Policy appetite)");
  if (input.sanctions === "Potential Match") lines.push("Sanctions hold active — 4h disposition window");
  return lines;
}
