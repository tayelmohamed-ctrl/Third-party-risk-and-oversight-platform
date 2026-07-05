// Mal FinCrime OS — pure CRAM scoring engine.
// AI prepares; humans decide. Non-dilution: final = most restrictive.
import type { ScoreInput, ScoreResult, FactorOut, OverrideHit, Band, Boundary, FinalRating, Score, ProductServicePillar, ChannelPillar, BehaviourGateResult, PepGateResult } from "./types";
import { resolveBehaviourGate, suggestBehaviourStatus, type BehaviourStatus } from "../config/behaviourGate";
import { pepAuditShare, pepOverrideRationale, resolvePepGate } from "../config/pepGate";
import { firmToScore, clampScore, SANCTIONS_A } from "./data";
import {
  uboRiskScore, activityDeviationScore, isMaterialActivityDeviation, activityDeviationLabel,
} from "./activityProfile";
import { normalizeScoreInput } from "./normalizeInput";
import {
  resolveCustomerTypeActivityScores,
  type ActivityResolution,
  type ProfessionResolution,
} from "./activityRisk";
import { CUSTOMER_TYPE_WEIGHTS, ACTIVITY_LIBRARY_VERSION } from "../config/activityRiskConfig";
import { entityTypeNpoFlag, entityTypeProhibited } from "../config/entityLegalTypes";
import { getFactorWeightsForInput, getFactorWeights, DEFAULT_FACTOR_WEIGHTS } from "../config/runtimeConfig";
import { bandFromScore } from "../config/bandBoundaries";

// Six-factor weights (sum = 1.0). Product + service (25%) apply via worst-of pillar — see productServicePillar.
export const FACTOR_WEIGHTS = DEFAULT_FACTOR_WEIGHTS;

export function activeFactorWeights(input?: import("./types").ScoreInput) {
  return getFactorWeightsForInput(input);
}

/** Combined product & service pillar weight — non-dilution: max(product, service) × this weight */
export function productServiceCombinedWeight() {
  const w = getFactorWeights();
  return w.product + w.service;
}

/** Combined channel pillar weight — non-dilution: max(initiation, delivery) × this weight */
export function channelCombinedWeight() {
  return getFactorWeights().channel;
}

export function channelInitAuditWeight() {
  return channelCombinedWeight() / 2;
}

export function channelDeliveryAuditWeight() {
  return channelCombinedWeight() / 2;
}

export function channelCombinedScore(initiation: Score, delivery: Score): Score {
  return clampScore(Math.max(initiation, delivery)) as Score;
}

function buildChannelFactors(initiation: Score, delivery: Score, fw = getFactorWeightsForInput()): {
  factors: FactorOut[];
  pillar: ChannelPillar;
} {
  const combined = channelCombinedScore(initiation, delivery);
  const drivenBy: "initiation" | "delivery" = delivery > initiation ? "delivery" : "initiation";
  const chWeight = fw.channel;
  const chInitW = chWeight / 2;
  const chDelW = chWeight / 2;
  const contribution = combined * chWeight;
  const pillar: ChannelPillar = {
    initiationScore: initiation,
    deliveryScore: delivery,
    combinedScore: combined,
    combinedWeight: chWeight,
    contribution,
    drivenBy,
  };
  const factors: FactorOut[] = [
    {
      key: "channelInit",
      name: "Initiation channel",
      weight: chInitW,
      score: initiation,
      contribution: 0,
      auditContribution: initiation * chInitW,
      countsInComposite: false,
      compositeNote: drivenBy === "initiation" ? "Drives channel pillar (max)" : "Audit sub-score",
    },
    {
      key: "channelDelivery",
      name: "Delivery channel",
      weight: chDelW,
      score: delivery,
      contribution: 0,
      auditContribution: delivery * chDelW,
      countsInComposite: false,
      compositeNote: drivenBy === "delivery" ? "Drives channel pillar (max)" : "Audit sub-score",
    },
    {
      key: "channel",
      name: "Channel (worst-of)",
      weight: chWeight,
      score: combined,
      contribution,
      compositeNote: `max(initiation, delivery) · driven by ${drivenBy}`,
    },
  ];
  return { factors, pillar };
}

function buildBehaviourGate(i: ReturnType<typeof normalizeScoreInput>): BehaviourGateResult {
  const expected = i.expectedMonthlyBand;
  const actual = i.actualMonthlyBand;
  const suggested = suggestBehaviourStatus(expected, actual, i.lifecycle);
  const status = (i.behaviourStatus ?? suggested) as BehaviourStatus;
  const def = resolveBehaviourGate(status);
  return {
    status,
    label: def.label,
    gateType: def.gateType,
    reviewRequired: def.gateType === "flag" || def.gateType === "override",
    overrideHigh: def.gateType === "override",
    transactionUplift: def.transactionUplift,
    suggestedStatus: i.behaviourStatus && i.behaviourStatus !== suggested ? suggested : undefined,
  };
}

export function productServiceCombinedScore(product: Score, service: Score): Score {
  return clampScore(Math.max(product, service)) as Score;
}

function buildProductServiceFactors(product: Score, service: Score, fw = getFactorWeightsForInput()): {
  factors: FactorOut[];
  pillar: ProductServicePillar;
} {
  const combined = productServiceCombinedScore(product, service);
  const drivenBy: "product" | "service" = service > product ? "service" : "product";
  const psWeight = fw.product + fw.service;
  const contribution = combined * psWeight;
  const pillar: ProductServicePillar = {
    productScore: product,
    serviceScore: service,
    combinedScore: combined,
    combinedWeight: psWeight,
    contribution,
    drivenBy,
  };
  const factors: FactorOut[] = [
    {
      key: "product",
      name: "Product risk",
      weight: fw.product,
      score: product,
      contribution: 0,
      auditContribution: product * fw.product,
      countsInComposite: false,
      compositeNote: drivenBy === "product" ? "Drives product & service pillar (max)" : "Audit sub-score",
    },
    {
      key: "service",
      name: "Service risk",
      weight: fw.service,
      score: service,
      contribution: 0,
      auditContribution: service * fw.service,
      countsInComposite: false,
      compositeNote: drivenBy === "service" ? "Drives product & service pillar (max)" : "Audit sub-score",
    },
    {
      key: "productService",
      name: "Product & service (worst-of)",
      weight: psWeight,
      score: combined,
      contribution,
      compositeNote: `max(product, service) · driven by ${drivenBy}`,
    },
  ];
  return { factors, pillar };
}

export function bandFor(score: number, boundary: Boundary): Band {
  return bandFromScore(score, boundary);
}

const ORDER: Record<Band, number> = { Low: 1, Medium: 2, High: 3 };

function snapshotActivityResolutions(
  mode: "individual" | "entity",
  professionScore: Score,
  natureOfBusinessScore: Score,
): {
  professionScore: Score;
  natureOfBusinessScore: Score;
  activityResolution: ActivityResolution;
  professionResolution: ProfessionResolution;
} {
  return {
    professionScore,
    natureOfBusinessScore,
    activityResolution: {
      declaredText: "",
      mode,
      code: "—",
      level: "Snapshot",
      title: "Pre-scored assessment input",
      theme: "—",
      rating: natureOfBusinessScore === 3 ? "High" : natureOfBusinessScore === 1 ? "Low" : "Medium",
      score: natureOfBusinessScore,
      baseScore: natureOfBusinessScore,
      ruleScore: 1,
      matchedRules: [],
      basis: "Assessment snapshot — ISIC resolved at capture",
      cddEdd: "Per composite outcome",
      suggestedControls: "—",
      prohibited: false,
      remediationRequired: false,
      libraryVersion: ACTIVITY_LIBRARY_VERSION,
      sourceUrl: "",
    },
    professionResolution: {
      declaredText: "",
      score: professionScore,
      professionLibraryScore: professionScore,
      guidanceScore: 1,
      ruleScore: 1,
      matchedRules: [],
      basis: "Assessment snapshot — profession resolved at capture",
      cddTreatment: "Per composite outcome",
      remediationRequired: false,
      libraryVersion: ACTIVITY_LIBRARY_VERSION,
    },
  };
}

export function scoreCustomer(raw: ScoreInput, boundary: Boundary = "calculator"): ScoreResult {
  const i = normalizeScoreInput(raw);
  const perimeter = i.masterRegistryPerimeter ?? "mal_bank";
  const uboScore = uboRiskScore(i.legalForm, i.uboStatus, i.uboLayers);
  const deviationScore = activityDeviationScore(i.expectedMonthlyBand, i.actualMonthlyBand);

  const mode = i.customerMode ?? (i.legalForm === "natural" ? "individual" : "entity");
  const hasDeclaration = !!(i.declaredProfession?.trim() || i.declaredActivity?.trim() || i.providedIsicCode?.trim());
  const activityScores = hasDeclaration
    ? resolveCustomerTypeActivityScores({
        mode,
        declaredProfession: i.declaredProfession ?? "",
        declaredActivity: i.declaredActivity ?? "",
        providedIsicCode: i.providedIsicCode,
        entityTypeScore: i.entityTypeScore,
        selfEmployed: i.selfEmployed ?? (+i.employmentScore >= 2),
        perimeter,
      })
    : snapshotActivityResolutions(mode, i.professionScore, i.natureOfBusinessScore);

  // Pre-computed registry scores from captureToScoreInput — do not re-resolve without registry
  const profScore = i.professionScore;
  const nobScore = i.natureOfBusinessScore;
  const w = CUSTOMER_TYPE_WEIGHTS[mode];

  // Customer-type factor — PEP excluded (gate only via OVR-008/016)
  const customerType = clampScore(
    i.employmentScore * w.employment + profScore * w.profession + nobScore * w.natureOfBusiness +
    i.segmentScore * w.segment + i.expectedMonthlyBand * w.expectedActivity + uboScore * w.ubo
    + (mode === "entity" && "entityType" in w ? (i.entityTypeScore ?? 2) * (w as typeof CUSTOMER_TYPE_WEIGHTS.entity).entityType : 0)
  );

  // Geography: highest-risk attribute drives (entity: opco · incorp · UBO · SoW · SoF)
  const geoFirms = mode === "entity"
    ? [i.residenceFirm, i.incorpFirm ?? i.birthFirm, i.nationalityFirm, i.sowFirm, i.sofFirm]
    : [i.residenceFirm, i.nationalityFirm, i.birthFirm, i.sowFirm, i.sofFirm];
  const geoFirmMax = Math.max(...geoFirms);
  const geography = clampScore(firmToScore(geoFirmMax));

  const product = clampScore(i.productScore) as Score;
  const service = clampScore(i.serviceScore) as Score;
  const fw = getFactorWeightsForInput(i);
  const { factors: psFactors, pillar: productServicePillar } = buildProductServiceFactors(product, service, fw);
  const initiation = clampScore(i.initiationChannelScore) as Score;
  const delivery = clampScore(i.deliveryChannelScore) as Score;
  const { factors: chFactors, pillar: channelPillar } = buildChannelFactors(initiation, delivery, fw);
  const behaviourGate = buildBehaviourGate(i);
  const isNewCustomer = i.lifecycle === "New";
  const investigationsForTxn = isNewCustomer ? (1 as Score) : i.investigationsScore;
  const strsForTxn = isNewCustomer ? (1 as Score) : i.strsScore;
  // Transaction factor — TM observed data + light behaviour uplift (gate drives review/override — §12.6)
  const transaction = clampScore(Math.max(
    i.actualMonthlyBand, investigationsForTxn, strsForTxn, behaviourGate.transactionUplift,
  ));

  const factors: FactorOut[] = [
    { key: "customerType", name: "Customer-type risk", weight: fw.customerType, score: customerType, contribution: customerType * fw.customerType },
    {
      key: "pep",
      name: "PEP status (gate only)",
      weight: 0,
      score: 1,
      contribution: 0,
      countsInComposite: false,
      compositeNote: perimeter === "global_account"
        ? "Resolved after composite — FinCEN/BSA PEP"
        : "Resolved after composite — CBUAE Art. 15(14)",
    },
    { key: "geography", name: "Geography / country risk", weight: fw.geography, score: geography, contribution: geography * fw.geography },
    ...psFactors,
    ...chFactors,
    { key: "transaction", name: "Transaction / behaviour risk", weight: fw.transaction, score: transaction, contribution: transaction * fw.transaction },
  ];

  const composite = factors.reduce((a, f) => a + f.contribution, 0);
  const mathBand = bandFor(composite, boundary);

  const pepGateRaw = resolvePepGate(i.pep, { mathBand, input: i }, perimeter);
  const pepGate: PepGateResult = {
    ...pepGateRaw,
    regulatoryBasis: pepGateRaw.regulatoryBasis ?? pepGateRaw.cbuaeBasis,
    auditShare: pepAuditShare(i.pep, mode, pepGateRaw.score),
  };
  const pepFactorIdx = factors.findIndex((f) => f.key === "pep");
  if (pepFactorIdx >= 0) {
    factors[pepFactorIdx] = {
      ...factors[pepFactorIdx],
      score: pepGate.score,
      auditContribution: pepGate.auditShare,
      compositeNote: pepGate.overrideId
        ? `${pepGate.overrideId} ${pepGate.overrideHigh ? "High" : "Medium"} floor — not in composite`
        : pepGate.gateType === "identify"
          ? `${pepGate.regulatoryBasis ?? pepGate.cbuaeBasis} — not in composite`
          : "Clear — no PEP floor",
    };
  }

  // Overrides / floors / prohibitions
  const overrides: OverrideHit[] = [];
  // OVR-004 — UBO gap (Policy §12.2; Onboarding §2)
  if (i.legalForm !== "natural" && i.uboStatus === "refused") {
    overrides.push({ id: "OVR-004", cls: "HIGH", why: "Unable / refused to identify or verify UBO (Policy §12.2)" });
  } else if (i.legalForm !== "natural" && i.uboStatus === "complex_pending") {
    overrides.push({ id: "OVR-004", cls: "HIGH", why: "UBO verification incomplete — High pending remediation" });
  }
  // Activity profile inconsistency — scored via transaction factor + profileNotes (Policy §12.6)
  const profileNotes: string[] = [];
  if (i.legalForm !== "natural") {
    profileNotes.push(`UBO transparency score ${uboScore}/3 (${i.uboStatus}, ${i.uboLayers ?? 1} layer(s))`);
  }
  const devLabel = activityDeviationLabel(i.expectedMonthlyBand, i.actualMonthlyBand);
  profileNotes.push(`Behaviour gate: ${behaviourGate.label} (${behaviourGate.gateType})`);
  if (behaviourGate.suggestedStatus) {
    profileNotes.push(`TM band suggestion: ${resolveBehaviourGate(behaviourGate.suggestedStatus).label}`);
  }
  if (deviationScore > 1 || i.expectedMonthlyBand !== i.actualMonthlyBand) {
    profileNotes.push(`Expected vs actual activity: ${devLabel}`);
  }
  if (behaviourGate.reviewRequired) {
    profileNotes.push(behaviourGate.overrideHigh
      ? "Escalation: Expected-vs-actual override — High floor (Policy §12.6)"
      : "Review: Expected-vs-actual flag — compliance review without automatic High floor (Policy §12.6)");
  }
  if (i.sanctions === "True Match") overrides.push({ id: "OVR-001", cls: "PROHIBITED", why: "Confirmed sanctions/TFS true match" });
  if (i.watchlist === "True Match") overrides.push({ id: "OVR-002", cls: "PROHIBITED", why: "Internal watchlist true match" });
  if (geoFirmMax >= 4 || SANCTIONS_A.includes(i.residenceName) || SANCTIONS_A.includes(i.sofName))
    overrides.push({ id: "OVR-002", cls: "PROHIBITED", why: "Category-A sanctioned-country nexus" });
  if (i.pep === "Foreign") {
    overrides.push({
      id: "OVR-008",
      cls: "HIGH",
      why: pepOverrideRationale("Foreign", true, perimeter) || "Foreign PEP — automatic enhanced measures",
    });
  }
  if (i.adverse === "True Match") overrides.push({ id: "OVR-009", cls: "HIGH", why: "Material adverse media" });
  if (firmToScore(geoFirmMax) === 3 && geoFirmMax < 4) overrides.push({ id: "OVR-011", cls: "HIGH", why: "High-risk country exposure" });
  if (activityScores.activityResolution.prohibited)
    overrides.push({ id: "OVR-002", cls: "PROHIBITED", why: `Prohibited nature of business: ${activityScores.activityResolution.basis}` });
  if (mode === "entity" && entityTypeProhibited(i.declaredEntityType))
    overrides.push({ id: "OVR-006", cls: "PROHIBITED", why: `Prohibited entity legal type: ${i.declaredEntityType}` });
  if (mode === "entity" && entityTypeNpoFlag(i.declaredEntityType))
    overrides.push({ id: "OVR-NPO", cls: "HIGH", why: "NPO — EDD & Head of Compliance approval (Policy 8.2)" });
  if (nobScore >= 3) overrides.push({ id: "OVR-012", cls: "HIGH", why: "High-risk nature of business" });
  if ((i.pep === "Domestic" || i.pep === "IO") && pepGateRaw.relationshipHighRisk) {
    overrides.push({
      id: "OVR-016",
      cls: "MEDIUM",
      why: pepOverrideRationale(i.pep, true, perimeter) || `${i.pep === "IO" ? "International-organization PEP" : "Domestic PEP"} — high-risk relationship`,
    });
  }
  if (pepGateRaw.crossBorderExposure && (i.pep === "Domestic" || i.pep === "IO")) {
    profileNotes.push(
      perimeter === "global_account"
        ? "Cross-border exposure — domestic/IO PEP enhanced due diligence (FinCEN CDD Rule)"
        : "Cross-border exposure — domestic/IO PEP may require Art. 15(b–d) measures · Mohsen OS-TM-022",
    );
  }
  if (!isNewCustomer && (i.strsScore >= 3 || i.investigationsScore >= 3))
    overrides.push({ id: "OVR-010", cls: "HIGH", why: "STR/SAR filed or confirmed suspicion" });
  if (behaviourGate.overrideHigh) {
    overrides.push({ id: "OVR-020", cls: "HIGH", why: `Expected-vs-actual behaviour override: ${behaviourGate.label} (Policy §12.6)` });
  }
  if (i.sanctions === "Potential Match") overrides.push({ id: "HOLD", cls: "MEDIUM", why: "Potential sanctions match — 4h hold" });

  const unmappedPending =
    activityScores.professionResolution?.remediationRequired
    || activityScores.activityResolution?.remediationRequired;

  let floor: ScoreResult["floor"] = null;
  if (overrides.some((o) => o.cls === "PROHIBITED")) floor = "PROHIBITED";
  else if (overrides.some((o) => o.cls === "HIGH")) floor = "HIGH";
  else if (overrides.some((o) => o.cls === "MEDIUM")) floor = "MEDIUM";

  let finalRating: FinalRating;
  if (floor === "PROHIBITED") finalRating = "Prohibited";
  else {
    const floorBand: Band = floor === "HIGH" ? "High" : floor === "MEDIUM" ? "Medium" : "Low";
    finalRating = ORDER[floorBand] >= ORDER[mathBand] ? floorBand : mathBand;
  }

  // Manual override — never below a floor, never lifts a prohibition
  let overridden = false;
  if (i.manualOverride && finalRating !== "Prohibited") {
    const floorBand: Band = floor === "HIGH" ? "High" : floor === "MEDIUM" ? "Medium" : "Low";
    if (ORDER[i.manualOverride] >= ORDER[floorBand]) { finalRating = i.manualOverride; overridden = true; }
  }

  // Unmapped profession/activity — Medium minimum pending Compliance mapping (methodology §15.3)
  if (unmappedPending && finalRating === "Low" && floor !== "PROHIBITED") {
    finalRating = "Medium";
    profileNotes.push("Unmapped profession/activity — Medium minimum pending ISIC mapping (no default-to-Low)");
  }

  return {
    factors, composite, mathBand, overrides, floor, finalRating, overridden, boundary, profileNotes,
    activityResolution: activityScores.activityResolution,
    professionResolution: activityScores.professionResolution,
    productServicePillar,
    channelPillar,
    behaviourGate,
    pepGate,
  };
}

// Outcome mapping (review cycle set by MLRO: Low 5y / Medium 3y / High 1y)
export const OUTCOMES: Record<FinalRating, { cdd: string; edd: string; approval: string; review: string; monitoring: string }> = {
  Low: { cdd: "Standard CDD (SDD where lawful)", edd: "No", approval: "Operations / automated", review: "5 years", monitoring: "Standard + baseline digital" },
  Medium: { cdd: "Standard CDD + targeted info", edd: "Selective", approval: "Operations / Compliance", review: "3 years", monitoring: "Moderate + selected enhanced" },
  High: { cdd: "EDD: SoF/SoW, adverse media, enhanced PEP/sanctions", edd: "Yes", approval: "Head of Compliance / MLRO", review: "1 year (annual)", monitoring: "Enhanced, lower thresholds" },
  Prohibited: { cdd: "No relationship / restricted handling", edd: "—", approval: "MLRO / Legal + governance", review: "N/A — reject / exit / freeze", monitoring: "Block / freeze / report" },
};
