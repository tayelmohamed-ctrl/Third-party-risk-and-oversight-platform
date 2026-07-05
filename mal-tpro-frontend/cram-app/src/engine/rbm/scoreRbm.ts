/**
 * RBM composite scorer — multi-factor inherent → overrides → residual.
 */
import type {
  RbmAssessmentInput,
  RbmAssessmentResult,
  RbmComponentScore,
  RbmRuleOverride,
  RiskBand,
} from "./types";
import { policyProfileForPerimeter, reviewMonthsForBand, RBM_ENGINE_VERSION } from "../../registries/policyProfiles";
import {
  buildStructuredActivity,
  defaultCorridorForPerimeter,
  defaultProductForPerimeter,
  getCorridorById,
  getProductById,
  getUseCaseById,
  scoreStructuredActivity,
} from "../../registries/rbmRegistries";
import { compareBehaviour, expectedProfileFromUseCase } from "./behaviourEngine";

function bandFromScore(score: number, prohibited = false): RiskBand {
  if (prohibited || score >= 85) return prohibited ? "Prohibited" : "High";
  if (score >= 70) return "Medium High";
  if (score >= 45) return "Medium";
  return "Low";
}

function weightedContribution(rawScore: number, weight: number): number {
  return Math.round((rawScore / 100) * weight * 10) / 10;
}

function applyOverrides(
  input: RbmAssessmentInput,
  inherent: number,
  activityScore: number,
  corridorScore: number,
  product: { crossBorderPct: number; inherentScore: number },
  activity: {
    prohibited: boolean;
    eddRequired: boolean;
    msbExposure: boolean;
    tradeFinance: boolean;
    nestedPayments: string;
    nraRating?: string;
    nraSectorId?: string;
    nraSource?: string;
  },
): { overrides: RbmRuleOverride[]; floor: number; prohibited: boolean; edd: boolean; monitoring: string[] } {
  const overrides: RbmRuleOverride[] = [];
  let floor = 0;
  let prohibited = activity.prohibited;
  let edd = activity.eddRequired;
  const monitoring: string[] = [];

  if (activity.prohibited) {
    overrides.push({ id: "OVR-PROHIBIT", label: "Prohibited activity", effect: "prohibit", regulatoryBasis: "FATF R.1 · Internal prohibited list" });
    prohibited = true;
  }

  if (activity.msbExposure) {
    overrides.push({ id: "OVR-MSB", label: "MSB / nested MSB exposure", effect: "floor", regulatoryBasis: "FATF R.14 · FinCEN MSB", scoreDelta: 65 });
    floor = Math.max(floor, 65);
    edd = true;
    monitoring.push("TM-401 MSB nested");
  }

  if (activity.tradeFinance) {
    overrides.push({ id: "OVR-TBML", label: "Trade finance / TBML typology", effect: "edd", regulatoryBasis: "FATF Trade-Based ML guidance · NRA trade sector" });
    edd = true;
    monitoring.push("TM-501 Trade-based ML");
  }

  if (activity.nraRating === "Very High" || activity.nraRating === "High") {
    overrides.push({
      id: "OVR-NRA",
      label: `NRA ${activity.nraRating} sector — ${activity.nraSectorId ?? "sector match"}`,
      effect: "edd",
      regulatoryBasis: activity.nraSource ?? "National Risk Assessment",
    });
    floor = Math.max(floor, activity.nraRating === "Very High" ? 70 : 60);
    edd = true;
    if (activity.nraSectorId?.includes("precious")) {
      monitoring.push("TM-701 Precious metals DNFBP");
    }
  }

  if (corridorScore >= 65) {
    overrides.push({ id: "OVR-CORRIDOR", label: "High-risk payment corridor", effect: "floor", regulatoryBasis: "FATF R.10 · Correspondent banking", scoreDelta: 60 });
    floor = Math.max(floor, 60);
    edd = true;
  }

  if (product.crossBorderPct >= 80) {
    overrides.push({ id: "OVR-XBORDER", label: "Cross-border product enablement", effect: "monitoring", regulatoryBasis: "FATF R.16 · Travel Rule" });
    monitoring.push("TM-214 Cross-border velocity");
  }

  if (activity.nestedPayments === "Yes" || activity.nestedPayments === "Possible") {
    monitoring.push("TM-402 Nested payment chain");
  }

  if (inherent < floor) {
    overrides.push({ id: "OVR-FLOOR", label: `Inherent floor applied (${floor})`, effect: "floor", regulatoryBasis: "Risk-based methodology floor", scoreDelta: floor - inherent });
  }

  return { overrides, floor, prohibited, edd, monitoring };
}

export function scoreRbmAssessment(input: RbmAssessmentInput): RbmAssessmentResult {
  const profile = policyProfileForPerimeter(input.perimeter);
  const w = profile.componentWeights;

  const product = getProductById(input.productId, input.perimeter) ?? defaultProductForPerimeter(input.perimeter);
  const corridor = getCorridorById(input.corridorId, input.perimeter) ?? defaultCorridorForPerimeter(input.perimeter);
  const useCase = getUseCaseById(input.useCaseId, input.perimeter) ?? getUseCaseById("operating_expenses", input.perimeter)!;

  const resolvedActivity = input.activity ?? buildStructuredActivity({
    label: "General business activity",
    mode: input.mode,
    perimeter: input.perimeter,
  });

  const activityScore = scoreStructuredActivity(resolvedActivity);
  const customerScore = input.customerTypeScore ?? 40;
  const deliveryScore = input.deliveryChannelScore ?? 35;
  const controlGap = input.controlEffectiveness ?? 8;

  let behaviourScore = 25;
  let behaviourDeviations = input.expectedBehaviour && input.actualBehaviour
    ? compareBehaviour(input.expectedBehaviour, input.actualBehaviour).deviations
    : [];

  if (input.expectedBehaviour && input.actualBehaviour) {
    const { scoreUplift } = compareBehaviour(input.expectedBehaviour, input.actualBehaviour);
    behaviourScore = Math.min(100, 25 + scoreUplift * 2);
  }

  const components: RbmComponentScore[] = [
    {
      key: "customer",
      label: "Customer",
      weight: w.customer,
      rawScore: customerScore,
      contribution: weightedContribution(customerScore, w.customer),
      band: bandFromScore(customerScore),
      drivers: [`Customer type · ${input.mode}`],
      policyRefs: [profile.cddRules[0] ?? profile.regulator],
    },
    {
      key: "product",
      label: "Product",
      weight: w.product,
      rawScore: product.inherentScore,
      contribution: weightedContribution(product.inherentScore, w.product),
      band: product.inherentBand,
      drivers: [product.rationale, ...product.monitoringRules.slice(0, 2)],
      policyRefs: [profile.regulator, product.license],
    },
    {
      key: "businessActivity",
      label: "Business Activity",
      weight: w.businessActivity,
      rawScore: activityScore,
      contribution: weightedContribution(activityScore, w.businessActivity),
      band: resolvedActivity.baseRiskBand,
      drivers: [
        `${resolvedActivity.industry} · ISIC ${resolvedActivity.isicCode}`,
        resolvedActivity.nraRating
          ? `${profile.nraVersion ?? "NRA"} ${resolvedActivity.nraRating} — ${resolvedActivity.nraMatchDetail}`
          : resolvedActivity.mlTypology,
        ...(resolvedActivity.tradeFinance ? ["Trade finance exposure"] : []),
      ],
      policyRefs: [profile.nraVersion ?? "NRA", "FATF R.1"],
    },
    {
      key: "useCase",
      label: "Use Case",
      weight: w.useCase,
      rawScore: useCase.inherentScore,
      contribution: weightedContribution(useCase.inherentScore, w.useCase),
      band: useCase.inherentBand,
      drivers: [useCase.description, `Pattern: ${useCase.expectedPattern}`],
      policyRefs: [profile.regulator],
    },
    {
      key: "corridor",
      label: "Corridor",
      weight: w.corridor,
      rawScore: corridor.finalScore,
      contribution: weightedContribution(corridor.finalScore, w.corridor),
      band: corridor.finalBand,
      drivers: [
        corridor.label,
        `Sanctions ${corridor.sanctionsScore} · AML index ${corridor.amlIndex}`,
        corridor.monitoringNote,
      ],
      policyRefs: ["FATF R.10", ...profile.sanctionsProgrammes.slice(0, 1)],
    },
    {
      key: "deliveryChannel",
      label: "Delivery Channel",
      weight: w.deliveryChannel,
      rawScore: deliveryScore,
      contribution: weightedContribution(deliveryScore, w.deliveryChannel),
      band: bandFromScore(deliveryScore),
      drivers: ["Digital onboarding channel"],
      policyRefs: [profile.regulator],
    },
    {
      key: "expectedBehaviour",
      label: "Expected Behaviour",
      weight: w.expectedBehaviour,
      rawScore: behaviourScore,
      contribution: weightedContribution(behaviourScore, w.expectedBehaviour),
      band: bandFromScore(behaviourScore),
      drivers: behaviourDeviations.length
        ? behaviourDeviations.map((d) => `${d.dimension}: ${d.actual} vs ${d.expected}`)
        : ["Aligned with declared use case"],
      policyRefs: ["FATF R.10 · Ongoing monitoring"],
    },
    {
      key: "controlEffectiveness",
      label: "Control Effectiveness",
      weight: -Math.abs(controlGap),
      rawScore: controlGap,
      contribution: -Math.abs(controlGap),
      band: "Low",
      drivers: ["KYC · TM · Sanctions control gap assessment"],
      policyRefs: ["SR 11-7 · CBUAE control standards"],
    },
  ];

  const inherentScore = Math.round(
    components.reduce((s, c) => s + c.contribution, 0),
  );

  const overrideResult = applyOverrides(
    input,
    inherentScore,
    activityScore,
    corridor.finalScore,
    product,
    {
      prohibited: resolvedActivity.baseRiskBand === "Prohibited",
      eddRequired: resolvedActivity.eddRequired,
      msbExposure: resolvedActivity.msbExposure,
      tradeFinance: resolvedActivity.tradeFinance,
      nestedPayments: resolvedActivity.nestedPayments,
      nraRating: resolvedActivity.nraRating,
      nraSectorId: resolvedActivity.nraSectorId,
      nraSource: resolvedActivity.nraSource,
    },
  );

  let adjustedInherent = Math.max(inherentScore, overrideResult.floor);
  if (overrideResult.prohibited) adjustedInherent = 100;

  if (resolvedActivity.nraRating === "Very High") {
    adjustedInherent = Math.max(adjustedInherent, 75);
  } else if (resolvedActivity.nraRating === "High") {
    adjustedInherent = Math.max(adjustedInherent, 70);
  }

  const residualScore = Math.max(0, adjustedInherent - Math.abs(controlGap));
  const compositeBand = bandFromScore(adjustedInherent, overrideResult.prohibited);

  const why: string[] = [];
  if (resolvedActivity.nraRating && resolvedActivity.nraSectorId) {
    why.push(`${profile.nraVersion ?? "NRA"} ${resolvedActivity.nraRating} sector — ${resolvedActivity.industry}`);
  }
  if (product.crossBorderPct >= 50) why.push("Global cross-border account");
  if (resolvedActivity.industry.toLowerCase().includes("oil") || resolvedActivity.isicCode.startsWith("06") || resolvedActivity.isicCode.startsWith("09")) {
    why.push("Oil & Gas industry");
  }
  if (resolvedActivity.tradeFinance) why.push("Trade Finance");
  if (corridor.finalScore >= 50) why.push(`${corridor.label} corridor`);
  if (resolvedActivity.highValuePayments) why.push("High value payments enabled");
  if (resolvedActivity.thirdPartyPayments === "Allowed") why.push("Third-party payments enabled");
  if (overrideResult.edd) why.push("Enhanced Due Diligence required");
  why.push(`Use case: ${useCase.label} (${useCase.inherentBand})`);
  why.push(`Product: ${product.name} (${product.inherentBand})`);
  for (const m of overrideResult.monitoring) {
    why.push(`Monitoring Scenario ${m} applied`);
  }

  const reviewCycleMonths = reviewMonthsForBand(profile, compositeBand);

  return {
    policyProfile: profile,
    version: RBM_ENGINE_VERSION,
    compositeScore: adjustedInherent,
    compositeBand,
    inherentScore: adjustedInherent,
    residualScore,
    components,
    overrides: overrideResult.overrides,
    behaviourDeviations,
    why,
    eddRequired: overrideResult.edd,
    reviewCycleMonths,
    monitoringScenarios: [...new Set([...overrideResult.monitoring, ...product.monitoringRules.slice(0, 2)])],
    approvalAuthority: input.perimeter === "mal_bank" ? "MLRO / Board" : "US CO / MLRO",
    activity: resolvedActivity,
    product,
    corridor,
    useCase,
    prohibited: overrideResult.prohibited,
  };
}

export function scoreFromActivityRegister(input: {
  perimeter: import("../../config/perimeters").CompliancePerimeter;
  mode: import("../../config/activityRiskConfig").CustomerMode;
  activityLabel: string;
  isicCode?: string;
  rakezCode?: string;
  useCaseId?: string;
  corridorId?: string;
  productId?: string;
  activityOverrides?: Partial<import("./types").StructuredBusinessActivity>;
  actualBehaviour?: import("./types").ActualBehaviourSnapshot;
}): RbmAssessmentResult {
  const product = input.productId
    ? getProductById(input.productId, input.perimeter) ?? defaultProductForPerimeter(input.perimeter)
    : defaultProductForPerimeter(input.perimeter);

  const corridor = input.corridorId
    ? getCorridorById(input.corridorId, input.perimeter) ?? defaultCorridorForPerimeter(input.perimeter)
    : defaultCorridorForPerimeter(input.perimeter);

  const useCase = input.useCaseId
    ? getUseCaseById(input.useCaseId, input.perimeter) ?? getUseCaseById("operating_expenses", input.perimeter)!
    : getUseCaseById("operating_expenses", input.perimeter)!;

  const activity = buildStructuredActivity({
    label: input.activityLabel,
    isicCode: input.isicCode,
    rakezCode: input.rakezCode,
    mode: input.mode,
    perimeter: input.perimeter,
    overrides: input.activityOverrides,
  });

  const expected = expectedProfileFromUseCase(useCase.id, useCase.label, corridor.label);

  return scoreRbmAssessment({
    perimeter: input.perimeter,
    mode: input.mode,
    productId: product.id,
    corridorId: corridor.id,
    useCaseId: useCase.id,
    activity,
    expectedBehaviour: expected,
    actualBehaviour: input.actualBehaviour,
    controlEffectiveness: 8,
  });
}
