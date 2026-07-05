/**
 * Activity Register assessment — perimeter, corridor, applicability + ISIC/RAKEZ scoring.
 */
import type { CompliancePerimeter, CorridorFilter } from "../config/perimeters";
import { countryModuleByCode, CORRIDOR_EWRA_PACK } from "../config/corridorEwraWorkflow";
import { PAKISTAN_RISK_TYPOLOGY_LIBRARY } from "../config/pakistanRiskTypologyLibrary";
import type { CustomerMode } from "../config/activityRiskConfig";
import { ACTIVITY_LIBRARY_VERSION, ACTIVITY_RISK_CONFIG } from "../config/activityRiskConfig";
import { resolveActivityRisk, type ActivityResolution } from "../engine/activityRisk";
import { RAKEZ_REGISTER_VERSION } from "../engine/rakezActivityRegister";
import type { ActivityRegisterOption } from "./activityRegisterIndex";
import type { Score } from "../engine/types";

export type ActivityApplicability =
  | "individual_employed"
  | "business_operates"
  | "intended_use";

export const APPLICABILITY_OPTIONS: {
  id: ActivityApplicability;
  label: string;
  description: string;
  modes: CustomerMode[];
}[] = [
  {
    id: "individual_employed",
    label: "Employed in this activity",
    description: "The individual works in or derives income from this line of business.",
    modes: ["individual"],
  },
  {
    id: "business_operates",
    label: "Business operates in this activity",
    description: "The legal entity's licensed or registered primary activity.",
    modes: ["entity"],
  },
  {
    id: "intended_use",
    label: "Intended use case includes this activity",
    description: "Onboarding declaration — expected products, flows, or sector exposure.",
    modes: ["individual", "entity"],
  },
];

export interface CorridorOverlay {
  corridor: CorridorFilter;
  countryModule: string | null;
  ewraBand: string | null;
  scoreUplift: number;
  typologyNotes: string[];
  monitoringNote: string | null;
}

export interface ActivityRegisterAssessment {
  perimeter: CompliancePerimeter;
  corridor: CorridorFilter;
  mode: CustomerMode;
  applicability: ActivityApplicability;
  activity: ActivityRegisterOption;
  resolution: ActivityResolution;
  baseScore: Score;
  corridorOverlay: CorridorOverlay;
  finalScore: Score;
  finalRating: string;
  cddEdd: string;
  weightInCustomerType: number;
  methodologyNotes: string[];
  libraryVersions: string[];
}

function corridorToCountry(corridor: CorridorFilter): string | null {
  if (corridor === "all" || corridor === "UAE") return corridor === "UAE" ? "AE" : null;
  return corridor;
}

function typologyNotesForCorridor(corridor: CorridorFilter, activityLabel: string): string[] {
  const notes: string[] = [];
  const blob = activityLabel.toLowerCase();

  if (corridor === "PK") {
    const corpus = PAKISTAN_RISK_TYPOLOGY_LIBRARY.malTypologyCorpus;
    for (const t of corpus) {
      const keywords = t.name.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
      if (keywords.some((k) => blob.includes(k)) || t.indicators.some((i) => blob.includes(i.toLowerCase().slice(0, 12)))) {
        notes.push(`${t.id} · ${t.name} (${t.severity}) — PK corridor typology`);
      }
    }
    const aePk = PAKISTAN_RISK_TYPOLOGY_LIBRARY.corridorRatings.find((c) => c.corridorId === "COR-AE-PK");
    if (aePk && notes.length === 0) {
      notes.push(`PK corridor ${aePk.rating} (L×I ${aePk.likelihoodImpactScore}) — review sector against NRA 2023`);
    }
  }

  const theme = CORRIDOR_EWRA_PACK.corridorThemes.find((c) => c.destinationCountryCode === corridor);
  if (theme && corridor !== "all" && corridor !== "UAE") {
    notes.push(`Corridor ${theme.label} · inherent ${theme.inherentRisk} · ${theme.status}`);
    if (theme.corridorRisks.mlTypologies.length) {
      notes.push(`ML typologies: ${theme.corridorRisks.mlTypologies.slice(0, 2).join("; ")}`);
    }
  }

  return notes.slice(0, 4);
}

function computeCorridorOverlay(
  corridor: CorridorFilter,
  perimeter: CompliancePerimeter,
  activityLabel: string,
): CorridorOverlay {
  if (perimeter === "mal_bank") {
    return {
      corridor: "UAE",
      countryModule: "AE · CBUAE UAE domestic",
      ewraBand: "Standard domestic",
      scoreUplift: 0,
      typologyNotes: ["MAL Bank — UAE-only perimeter; RAKEZ FZ register applies where licensed."],
      monitoringNote: "UAE TM & goAML reporting path",
    };
  }

  const cc = corridorToCountry(corridor);
  const mod = cc ? countryModuleByCode(cc) : undefined;
  const typologyNotes = typologyNotesForCorridor(corridor, activityLabel);

  let scoreUplift = 0;
  if (mod) {
    const firm = mod.ewraFirmScoreOverride ?? mod.craFirmScore;
    if (firm >= 2.75) scoreUplift = 0.5;
    else if (firm >= 2.5) scoreUplift = 0.35;
    else if (firm >= 2.25) scoreUplift = 0.2;
    if (mod.eddMandatory) scoreUplift = Math.max(scoreUplift, 0.35);
    if (mod.typologyLibraryId) {
      typologyNotes.unshift(`Country module ${mod.complianceModuleId ?? mod.countryCode} · EWRA ${mod.ewraBandOverride ?? mod.craBand}`);
    }
  }

  return {
    corridor,
    countryModule: mod ? `${mod.countryName} (${mod.countryCode})` : corridor === "all" ? "All partner corridors" : null,
    ewraBand: mod?.ewraBandOverride ?? mod?.craBand ?? null,
    scoreUplift,
    typologyNotes,
    monitoringNote: mod?.enhancedMonitoring ? "Enhanced corridor monitoring required" : null,
  };
}

function applicabilityWeight(mode: CustomerMode, applicability: ActivityApplicability): number {
  const cfg = ACTIVITY_RISK_CONFIG[mode];
  if (applicability === "business_operates" && mode === "entity") {
    return cfg.parameters.find((p) => p.key === "activity")?.weightInCustomerType ?? 0.22;
  }
  if (applicability === "individual_employed" && mode === "individual") {
    return cfg.parameters.find((p) => p.key === "activity")?.weightInCustomerType ?? 0.18;
  }
  return (cfg.parameters.find((p) => p.key === "activity")?.weightInCustomerType ?? 0.15) * 0.85;
}

function scoreToRating(score: number, prohibited: boolean): string {
  if (prohibited) return "Prohibited";
  if (score >= 2.75) return "High";
  if (score >= 1.75) return "Medium";
  return "Low";
}

export function assessActivityRegister(input: {
  perimeter: CompliancePerimeter;
  corridor: CorridorFilter;
  mode: CustomerMode;
  applicability: ActivityApplicability;
  activity: ActivityRegisterOption;
}): ActivityRegisterAssessment {
  const { perimeter, corridor, mode, applicability, activity } = input;

  const effectiveCorridor: CorridorFilter = perimeter === "mal_bank" ? "UAE" : corridor;

  const resolution = resolveActivityRisk(
    activity.label,
    mode,
    activity.isicCode,
    activity.rakezCode,
    perimeter,
  );

  const overlay = computeCorridorOverlay(effectiveCorridor, perimeter, activity.label);

  let finalScore = resolution.score as number;
  if (!resolution.prohibited && overlay.scoreUplift > 0) {
    finalScore = Math.min(3, finalScore + overlay.scoreUplift);
  }

  const finalRating = scoreToRating(finalScore, resolution.prohibited);
  const cddEdd = resolution.prohibited
    ? "Reject / Exit"
    : finalScore >= 2.75
      ? resolution.cddEdd.includes("EDD") ? resolution.cddEdd : "Enhanced Due Diligence (EDD)"
      : resolution.cddEdd;

  const methodologyNotes = [
    resolution.basis,
    `Applicability: ${APPLICABILITY_OPTIONS.find((a) => a.id === applicability)?.label ?? applicability}`,
    activity.source === "rakez"
      ? `RAKEZ FZ register · ${activity.rakezCode}`
      : `Source: ${activity.source}`,
    ...overlay.typologyNotes,
  ];

  if (resolution.matchedRules.length) {
    methodologyNotes.push(`Rules: ${resolution.matchedRules.join(", ")}`);
  }

  return {
    perimeter,
    corridor: effectiveCorridor,
    mode,
    applicability,
    activity,
    resolution,
    baseScore: resolution.score,
    corridorOverlay: overlay,
    finalScore: Math.round(finalScore * 100) / 100 as Score,
    finalRating,
    cddEdd,
    weightInCustomerType: applicabilityWeight(mode, applicability),
    methodologyNotes,
    libraryVersions: [
      ACTIVITY_LIBRARY_VERSION,
      perimeter === "mal_bank" ? RAKEZ_REGISTER_VERSION : "ISIC international",
    ],
  };
}
