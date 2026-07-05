/**
 * RBM registries — delegates to Master Risk Registry Service (single source of truth).
 */
import industryTemplates from "../data/rbm/industry_activity_templates.json";
import type { CompliancePerimeter } from "../config/perimeters";
import type {
  ProductRiskEntry,
  CorridorRiskEntry,
  UseCaseEntry,
  StructuredBusinessActivity,
  RiskBand,
} from "../engine/rbm/types";
import { resolveActivityRisk } from "../engine/activityRisk";
import type { CustomerMode } from "../config/activityRiskConfig";
import { ACTIVITY_LIBRARY_VERSION } from "../config/activityRiskConfig";
import { RAKEZ_REGISTER_VERSION } from "../engine/rakezActivityRegister";
import { RBM_ENGINE_VERSION } from "./policyProfiles";
import {
  allProducts,
  allUseCases,
  allCorridors,
  lookupBusinessActivity,
  lookupProductById,
  lookupUseCase,
  lookupCorridor,
  MASTER_REGISTRY_VERSION,
  registryMeta,
} from "./master/registryService";

/** @deprecated Use allProducts() from registryService — kept for RBM UI compatibility */
export function mapMasterProductToRbm(entry: ReturnType<typeof allProducts>[0], perimeter: CompliancePerimeter): ProductRiskEntry {
  const j = perimeter === "mal_bank" ? entry.uae : entry.us;
  return {
    id: entry.id,
    name: entry.productName,
    perimeter,
    license: perimeter === "mal_bank" ? "CBUAE" : "US MSB",
    settlement: perimeter === "mal_bank" ? ["Domestic Clearing"] : ["Cross Border", "Virtual IBAN"],
    virtualIban: entry.id === "PRD-GLOBAL-ACCOUNT" || entry.id === "PRD-VIBAN",
    currencies: perimeter === "mal_bank"
      ? [{ code: "AED", enabled: true, primary: true }]
      : [{ code: "USD", enabled: true, primary: true }, { code: "EUR", enabled: true }],
    correspondentBanking: entry.id === "PRD-GLOBAL-ACCOUNT",
    swift: entry.id === "PRD-GLOBAL-ACCOUNT" || entry.id === "PRD-INTL-TRANSFER",
    domesticClearing: perimeter === "mal_bank",
    cash: "No",
    crossBorderPct: perimeter === "mal_bank" ? 15 : 100,
    inherentScore: j.cramScore * 33,
    inherentBand: j.rating === "Very High" || j.rating === "High" ? "High" : j.rating === "Medium" ? "Medium" : "Low",
    monitoringRules: [],
    rationale: j.rationale,
  };
}

export const PRODUCT_RISK_REGISTRY: ProductRiskEntry[] = allProducts().flatMap((p) => [
  mapMasterProductToRbm(p, "mal_bank"),
  mapMasterProductToRbm(p, "global_account"),
]).filter((p, i, arr) => arr.findIndex((x) => x.id === p.id && x.perimeter === p.perimeter) === i);

export function mapMasterCorridorToRbm(
  entry: ReturnType<typeof allCorridors>[0],
  perimeter: CompliancePerimeter,
): CorridorRiskEntry {
  const j = perimeter === "mal_bank" ? entry.uae : entry.us;
  return {
    id: entry.id,
    origin: entry.originCountry,
    destination: entry.destinationCountry,
    label: `${entry.originCountry} → ${entry.destinationCountry}`,
    sanctionsScore: j.cramScore * 20,
    transparencyIndex: 15,
    amlIndex: j.cramScore * 25,
    fatfStatus: entry.fatfStatus,
    currency: "Multi",
    swift: true,
    nestedRisk: entry.sanctionsStatus === "High",
    correspondentRisk: (j.rating === "High" || j.rating === "Very High" ? "High" : "Medium") as RiskBand,
    finalScore: j.cramScore * 33,
    finalBand: (j.rating === "High" || j.rating === "Very High" ? "High" : j.rating === "Medium" ? "Medium" : "Low") as RiskBand,
    monitoringNote: j.rationale,
  };
}

export function mapMasterUseCaseToRbm(
  entry: ReturnType<typeof allUseCases>[0],
  perimeter: CompliancePerimeter,
): UseCaseEntry {
  const j = perimeter === "mal_bank" ? entry.uae : entry.us;
  return {
    id: entry.id,
    label: entry.useCaseName,
    description: j.rationale,
    expectedParties: [],
    thirdParty: entry.id !== "payroll",
    crossBorder: entry.id === "payroll" ? "Optional" as const : "High" as const,
    expectedPattern: entry.useCaseName,
    velocity: entry.id === "marketplace_settlement" ? "High" as const : "Low" as const,
    nested: entry.id === "marketplace_settlement" ? "Possible" as const : "No" as const,
    cash: false,
    inherentScore: j.cramScore * 33,
    inherentBand: (j.rating === "High" || j.rating === "Very High" ? "High" : j.rating === "Medium" ? "Medium" : "Low") as RiskBand,
    monitoringRules: [],
  };
}

/** @deprecated Prefer lookupCorridor(id, perimeter) — static list uses UAE ratings */
export const CORRIDOR_RISK_REGISTRY: CorridorRiskEntry[] = allCorridors().map((c) =>
  mapMasterCorridorToRbm(c, "mal_bank"),
);

/** @deprecated Prefer lookupUseCase(id, perimeter) */
export const USE_CASE_REGISTRY: UseCaseEntry[] = allUseCases().map((u) =>
  mapMasterUseCaseToRbm(u, "mal_bank"),
);

type IndustryTemplate = (typeof industryTemplates)[number];

function scoreToBand(score: number): RiskBand {
  if (score >= 80) return "High";
  if (score >= 65) return "Medium High";
  if (score >= 40) return "Medium";
  return "Low";
}

function findIndustryTemplate(isicCode: string): IndustryTemplate {
  const templates = industryTemplates as IndustryTemplate[];
  const exact = templates.find((t) => t.isicPrefix !== "default" && isicCode.startsWith(t.isicPrefix));
  return exact ?? templates.find((t) => t.isicPrefix === "default")!;
}

export function defaultProductForPerimeter(perimeter: CompliancePerimeter): ProductRiskEntry {
  const id = perimeter === "mal_bank" ? "PRD-UAE-CURRENT" : "PRD-GLOBAL-ACCOUNT";
  return getProductById(id) ?? PRODUCT_RISK_REGISTRY.find((p) => p.perimeter === perimeter)!;
}

export function getProductById(id: string, perimeter?: CompliancePerimeter): ProductRiskEntry | undefined {
  const resolvedPerimeter = perimeter ?? (id === "PRD-GLOBAL-ACCOUNT" ? "global_account" : "mal_bank");
  const master = lookupProductById(id, resolvedPerimeter);
  if (!master) return PRODUCT_RISK_REGISTRY.find((p) => p.id === id && p.perimeter === resolvedPerimeter);
  return mapMasterProductToRbm(master.entry, resolvedPerimeter);
}

export function getCorridorById(id: string, perimeter: CompliancePerimeter = "mal_bank"): CorridorRiskEntry | undefined {
  const master = lookupCorridor(id, perimeter);
  if (master) return mapMasterCorridorToRbm(master.entry, perimeter);
  return CORRIDOR_RISK_REGISTRY.find((c) => c.id === id);
}

export function getUseCaseById(id: string, perimeter: CompliancePerimeter = "mal_bank"): UseCaseEntry | undefined {
  const master = lookupUseCase(id, perimeter);
  if (master) return mapMasterUseCaseToRbm(master.entry, perimeter);
  return USE_CASE_REGISTRY.find((u) => u.id === id);
}

export function corridorsForPerimeter(perimeter: CompliancePerimeter): CorridorRiskEntry[] {
  return allCorridors()
    .filter((c) => (perimeter === "mal_bank" ? c.originCountry === "UAE" : c.originCountry === "US" || c.originCountry === "UAE"))
    .map((c) => mapMasterCorridorToRbm(c, perimeter));
}

export function defaultCorridorForPerimeter(perimeter: CompliancePerimeter): CorridorRiskEntry {
  return getCorridorById(perimeter === "mal_bank" ? "uae_uae" : "us_global", perimeter)!;
}

/** Build structured business activity from ISIC/RAKEZ resolution + industry template. */
export function buildStructuredActivity(input: {
  label: string;
  isicCode?: string;
  rakezCode?: string;
  mode: CustomerMode;
  perimeter: CompliancePerimeter;
  overrides?: Partial<StructuredBusinessActivity>;
}): StructuredBusinessActivity {
  const resolution = resolveActivityRisk(
    input.label,
    input.mode,
    input.isicCode,
    input.rakezCode,
    input.perimeter,
  );

  const isic = resolution.code && resolution.code !== "?" ? resolution.code : input.isicCode ?? "?";
  const template = findIndustryTemplate(isic.replace(/\./g, ""));
  const masterMatch = lookupBusinessActivity(input.label, input.perimeter, isic !== "?" ? isic : undefined);
  const masterJ = masterMatch?.jurisdiction;
  const nraRegistry = { jurisdiction: input.perimeter === "mal_bank" ? "UAE" : "US", version: MASTER_REGISTRY_VERSION };

  const isicContribution = resolution.score <= 1 ? 5 : resolution.score <= 2 ? 8 : 12;
  let baseRiskScore = masterJ
    ? masterJ.cramScore * 33
    : Math.round(template.baseRiskScore * 0.35 + 45 * 0.65);

  if (resolution.prohibited) baseRiskScore = 100;
  else if (masterJ) {
    baseRiskScore = Math.min(100, Math.round(baseRiskScore + isicContribution * 0.5));
  } else {
    baseRiskScore = Math.min(100, Math.round(
      template.baseRiskScore * 0.88 + isicContribution +
      (resolution.score >= 3 ? 4 : resolution.score >= 2 ? 2 : 0),
    ));
  }

  if (input.rakezCode && input.perimeter === "mal_bank") {
    baseRiskScore = Math.min(100, baseRiskScore + 2);
  }

  const activity: StructuredBusinessActivity = {
    id: input.rakezCode ? `rakez:${input.rakezCode}` : `isic:${isic}:${input.label.slice(0, 32)}`,
    label: input.label,
    isicCode: isic,
    industry: masterMatch?.entry.activityName ?? template.industry,
    fatfSector: masterMatch?.entry.riskRationale.slice(0, 40) ?? template.fatfSector,
    baseRiskScore,
    baseRiskBand: resolution.prohibited ? "Prohibited" : scoreToBand(baseRiskScore),
    cashIntensive: template.cashIntensive,
    crossBorder: template.crossBorder || input.perimeter === "global_account",
    regulated: resolution.rating !== "Unmapped",
    highRiskGeographyExposure: template.crossBorder || masterJ?.rating === "Very High",
    anonymousTransactions: template.nestedPayments === "Yes" ? "Possible" : "No",
    sanctionsExposure: (masterJ?.rating === "High" || masterJ?.rating === "Very High" ? "High" : template.sanctionsExposure) as RiskBand,
    fraudExposure: template.fraudExposure as RiskBand,
    mlTypology: masterMatch?.entry.riskRationale ?? template.mlTypology,
    virtualAssetsExposure: template.virtualAssetsExposure,
    msbExposure: template.msbExposure,
    tradeFinance: template.tradeFinance,
    highRiskGoods: template.highRiskGoods,
    dualUseGoods: template.dualUseGoods as StructuredBusinessActivity["dualUseGoods"],
    governmentContracts: template.governmentContracts,
    highValuePayments: template.highValuePayments,
    thirdPartyPayments: template.thirdPartyPayments as StructuredBusinessActivity["thirdPartyPayments"],
    nestedPayments: template.nestedPayments as StructuredBusinessActivity["nestedPayments"],
    monitoringRules: [...template.monitoringRules, ...(resolution.matchedRules.map((r) => `Rule ${r}`))],
    eddRequired: (masterJ?.eddRequired ?? template.eddRequired) || resolution.cddEdd.includes("EDD") || baseRiskScore >= 70,
    reviewCycleMonths: template.reviewCycleMonths,
    rationale: masterMatch
      ? `${nraRegistry.jurisdiction} Master Registry (${registryMeta().version}): ${masterJ?.rating} — ${masterJ?.rationale} · Match: ${masterMatch.matchDetail} · ISIC ~${isicContribution}%`
      : `${resolution.basis} · Industry template · ISIC ~${isicContribution}%`,
    libraryVersion: `${ACTIVITY_LIBRARY_VERSION} · ${MASTER_REGISTRY_VERSION} · ${RBM_ENGINE_VERSION}`,
    nraSectorId: masterMatch?.entry.id,
    nraRating: masterJ?.rating,
    nraSource: registryMeta().sourceDocument,
    nraMatchDetail: masterMatch?.matchDetail,
  };

  return { ...activity, ...input.overrides };
}

export function scoreStructuredActivity(activity: StructuredBusinessActivity): number {
  if (activity.baseRiskBand === "Prohibited") return 100;

  let score = activity.baseRiskScore;
  const uplifts: [boolean, number][] = [
    [activity.cashIntensive, 6],
    [activity.crossBorder, 4],
    [activity.virtualAssetsExposure, 15],
    [activity.msbExposure, 12],
    [activity.tradeFinance, 8],
    [activity.highRiskGoods, 10],
    [activity.dualUseGoods === "Yes", 12],
    [activity.dualUseGoods === "Possible", 6],
    [activity.governmentContracts, 5],
    [activity.highValuePayments, 5],
    [activity.thirdPartyPayments === "Allowed", 4],
    [activity.nestedPayments === "Yes", 10],
    [activity.nestedPayments === "Possible", 5],
    [activity.sanctionsExposure === "High", 10],
    [activity.sanctionsExposure === "Medium", 5],
    [activity.fraudExposure === "High", 8],
  ];

  for (const [cond, delta] of uplifts) {
    if (cond) score = Math.min(100, score + delta);
  }

  return Math.min(100, score);
}
