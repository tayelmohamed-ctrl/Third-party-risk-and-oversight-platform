import pack from "../data/corridor_ewra_themes.json";
import type { AgentId } from "./agents";
import type { LicenseProfileId } from "./licenseProfiles";

export type CorridorWorkflowStageId =
  | "identified"
  | "country_module"
  | "inherent_scored"
  | "controls_mapped"
  | "tm_live"
  | "mlro_approved"
  | "board_notified"
  | "live"
  | "review_due";

export type RiskBand = "Low" | "Medium" | "High" | "Prohibited";
export type ControlRating = "Strong" | "Partial" | "Weak";
export type CorridorStatus = "planned" | "pilot" | "live" | "suspended";

export type ComplianceCountryModule = {
  countryCode: string;
  countryName: string;
  iso3: string;
  localRegulator: string;
  fatfStatus: "member" | "grey_list" | "black_list" | "observer";
  namLCftcList: boolean;
  sanctionsLists: string[];
  sanctionsFloorCategory: "A" | "B" | "C" | null;
  craFirmScore: number;
  craBand: RiskBand;
  ewraFirmScoreOverride: number | null;
  ewraBandOverride: RiskBand | null;
  overrideRationale: string;
  eddMandatory: boolean;
  enhancedMonitoring: boolean;
  localReportingNotes: string;
  complianceModuleId?: string;
  typologyLibraryId?: string;
  legalBasis?: string[];
  lastReviewed: string | null;
  reviewCadence: "quarterly" | "semi_annual" | "annual";
  driveDoc: string;
};

export type CorridorRisks = {
  mlTypologies: string[];
  tfTypologies: string[];
  illicitFinanceTypologies: string[];
  islamicSpecific: string[];
  sanctionsNotes: string | null;
};

export type CorridorTheme = {
  id: string;
  label: string;
  originCountryCode: string;
  destinationCountryCode: string;
  productScope: string[];
  licensePaths: LicenseProfileId[];
  workflowStage: CorridorWorkflowStageId;
  status: CorridorStatus;
  inherentRisk: RiskBand;
  corridorScore?: { likelihoodImpact: number; rating: string; register: string };
  typologyLibraryId?: string;
  controlRating: ControlRating;
  residualRisk: string;
  heatMapCell: { inherent: RiskBand; control: ControlRating };
  corridorRisks: CorridorRisks;
  controls: string[];
  workflows: string[];
  oscilarRules: string[];
  obligations: string[];
  typologyFeed: AgentId;
  reportingTemplate: string;
  approval: {
    mlroSignOff: boolean;
    mlroSignOffDate: string | null;
    boardNotified: boolean;
    targetGoLive: string;
    cramLibraryVersionOnGoLive: string | null;
  };
  reviewCadence: "quarterly" | "semi_annual" | "annual";
  lastReviewed: string | null;
  nextReview: string;
  driveDoc: string;
};

export type WorkflowStageDef = {
  id: CorridorWorkflowStageId;
  label: string;
  agent: AgentId;
  description: string;
};

export type CorridorEwraPack = {
  version: string;
  published: string;
  ownerAgent: AgentId;
  mlroOwner: string;
  section: string;
  category: string;
  driveDoc: string;
  workflowStages: WorkflowStageDef[];
  complianceCountryModules: ComplianceCountryModule[];
  corridorThemes: CorridorTheme[];
};

export const CORRIDOR_EWRA_PACK: CorridorEwraPack = pack as CorridorEwraPack;

export function countryModuleByCode(code: string): ComplianceCountryModule | undefined {
  return CORRIDOR_EWRA_PACK.complianceCountryModules.find((m) => m.countryCode === code);
}

export function corridorThemeById(id: string): CorridorTheme | undefined {
  return CORRIDOR_EWRA_PACK.corridorThemes.find((c) => c.id === id);
}

export function workflowStageIndex(stage: CorridorWorkflowStageId): number {
  return CORRIDOR_EWRA_PACK.workflowStages.findIndex((s) => s.id === stage);
}

export function isStageComplete(corridor: CorridorTheme, stageId: CorridorWorkflowStageId): boolean {
  return workflowStageIndex(corridor.workflowStage) >= workflowStageIndex(stageId);
}

export function effectiveCountryScore(mod: ComplianceCountryModule): { score: number; band: RiskBand; source: "ewra_override" | "cra" } {
  if (mod.ewraFirmScoreOverride != null && mod.ewraBandOverride) {
    return { score: mod.ewraFirmScoreOverride, band: mod.ewraBandOverride, source: "ewra_override" };
  }
  return { score: mod.craFirmScore, band: mod.craBand, source: "cra" };
}

export function riskBandColor(band: RiskBand): string {
  if (band === "High" || band === "Prohibited") return "#FF5C77";
  if (band === "Medium") return "#F6A623";
  return "#2FD8A6";
}

export function corridorsByDestination(code: string): CorridorTheme[] {
  return CORRIDOR_EWRA_PACK.corridorThemes.filter((c) => c.destinationCountryCode === code);
}
