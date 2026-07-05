/**
 * Master Risk Registry Service — single source of truth for all CRAM risk lookups.
 * All modules (CRAM engine adapter, RBM, UI) must use this service.
 */
import bundle from "./master_registry.json";
import type { CompliancePerimeter } from "../../config/perimeters";
import type { CustomerMode } from "../../config/activityRiskConfig";
import type { Score } from "../../engine/types";
import type {
  MasterRegistryBundle,
  MasterBusinessActivity,
  MasterProduct,
  MasterUseCase,
  MasterCorridor,
  MasterCustomerType,
  RegistryLookupResult,
  JurisdictionRisk,
} from "./types";

const REGISTRY = bundle as MasterRegistryBundle;

export const MASTER_REGISTRY_VERSION = REGISTRY.meta.version;

function jurisdictionFor(perimeter: CompliancePerimeter): "uae" | "us" {
  return perimeter === "mal_bank" ? "uae" : "us";
}

function pickJurisdiction<T extends { uae: JurisdictionRisk; us: JurisdictionRisk }>(
  entry: T,
  perimeter: CompliancePerimeter,
): JurisdictionRisk {
  return entry[jurisdictionFor(perimeter)];
}

function normalizeIsic(code: string): string {
  return code.replace(/\./g, "").trim();
}

export function registryMeta() {
  return REGISTRY.meta;
}

export function allBusinessActivities(): MasterBusinessActivity[] {
  return REGISTRY.businessActivities;
}

export function allProducts(): MasterProduct[] {
  return REGISTRY.products;
}

export function allUseCases(): MasterUseCase[] {
  return REGISTRY.useCases;
}

export function allCorridors(): MasterCorridor[] {
  return REGISTRY.corridors;
}

export function allCustomerTypes(): MasterCustomerType[] {
  return REGISTRY.customerTypes;
}

/** Business activity lookup — NRA/ERA primary; ISIC is identifier only. */
export function lookupBusinessActivity(
  activityLabel: string,
  perimeter: CompliancePerimeter,
  isicCode?: string,
): RegistryLookupResult<MasterBusinessActivity> | null {
  const label = activityLabel.toLowerCase().trim();
  const isic = isicCode ? normalizeIsic(isicCode) : "";

  let best: { entry: MasterBusinessActivity; type: RegistryLookupResult<MasterBusinessActivity>["matchType"]; detail: string; score: number } | null = null;

  for (const entry of REGISTRY.businessActivities) {
    if (isic && entry.isicCodes.some((c) => normalizeIsic(c) === isic || isic.startsWith(normalizeIsic(c)))) {
      const type = entry.isicCodes.some((c) => normalizeIsic(c) === isic) ? "isic" as const : "keyword" as const;
      const candidate = { entry, type, detail: `ISIC ${isicCode}`, score: type === "isic" ? 100 : 85 };
      if (!best || candidate.score > best.score) best = candidate;
    }
    if (label === entry.activityName.toLowerCase()) {
      const candidate = { entry, type: "name" as const, detail: entry.activityName, score: 95 };
      if (!best || candidate.score > best.score) best = candidate;
    }
    for (const kw of entry.keywords) {
      if (label.includes(kw.toLowerCase())) {
        const candidate = { entry, type: "keyword" as const, detail: `Keyword "${kw}"`, score: 90 };
        if (!best || candidate.score > best.score) best = candidate;
      }
    }
  }

  if (!best) return null;

  return {
    entry: best.entry,
    jurisdiction: pickJurisdiction(best.entry, perimeter),
    perimeter,
    matchType: best.type,
    matchDetail: best.detail,
  };
}

export function lookupProduct(
  productName: string,
  perimeter: CompliancePerimeter,
): RegistryLookupResult<MasterProduct> | null {
  const entry = REGISTRY.products.find((p) => p.productName === productName);
  if (!entry) return null;
  return {
    entry,
    jurisdiction: pickJurisdiction(entry, perimeter),
    perimeter,
    matchType: "name",
    matchDetail: productName,
  };
}

export function lookupProductById(id: string, perimeter: CompliancePerimeter): RegistryLookupResult<MasterProduct> | null {
  const entry = REGISTRY.products.find((p) => p.id === id);
  if (!entry) return null;
  return { entry, jurisdiction: pickJurisdiction(entry, perimeter), perimeter, matchType: "id", matchDetail: id };
}

export function lookupUseCase(
  useCaseId: string,
  perimeter: CompliancePerimeter,
): RegistryLookupResult<MasterUseCase> | null {
  const entry = REGISTRY.useCases.find((u) => u.id === useCaseId);
  if (!entry) return null;
  return { entry, jurisdiction: pickJurisdiction(entry, perimeter), perimeter, matchType: "id", matchDetail: useCaseId };
}

export function lookupCorridor(
  corridorId: string,
  perimeter: CompliancePerimeter,
): RegistryLookupResult<MasterCorridor> | null {
  const entry = REGISTRY.corridors.find((c) => c.id === corridorId);
  if (!entry) return null;
  return { entry, jurisdiction: pickJurisdiction(entry, perimeter), perimeter, matchType: "id", matchDetail: corridorId };
}

export function lookupCustomerType(
  segment: string,
  mode: CustomerMode,
  perimeter: CompliancePerimeter,
): RegistryLookupResult<MasterCustomerType> | null {
  const entry = REGISTRY.customerTypes.find(
    (c) => c.segment === segment && (c.mode === mode || c.mode === "both"),
  );
  if (!entry) return null;
  return { entry, jurisdiction: pickJurisdiction(entry, perimeter), perimeter, matchType: "name", matchDetail: segment };
}

/** CRAM 1–3 scores for engine adapter (captureToScoreInput). */
export function cramProductScore(productName: string, perimeter: CompliancePerimeter, fallback: Score): Score {
  return lookupProduct(productName, perimeter)?.jurisdiction.cramScore ?? fallback;
}

export function cramActivityScore(
  activityLabel: string,
  perimeter: CompliancePerimeter,
  isicCode: string | undefined,
  legacyScore: Score,
): Score {
  const match = lookupBusinessActivity(activityLabel, perimeter, isicCode);
  if (!match) return legacyScore;
  return Math.max(legacyScore, match.jurisdiction.cramScore) as Score;
}

export function cramUseCaseScore(useCaseId: string | undefined, perimeter: CompliancePerimeter, fallback: Score): Score {
  if (!useCaseId) return fallback;
  return lookupUseCase(useCaseId, perimeter)?.jurisdiction.cramScore ?? fallback;
}

export function cramSegmentScore(segment: string, mode: CustomerMode, perimeter: CompliancePerimeter, fallback: Score): Score {
  return lookupCustomerType(segment, mode, perimeter)?.jurisdiction.cramScore ?? fallback;
}

export function perimeterLabel(perimeter: CompliancePerimeter): string {
  // P2-US-3: updated to 2026 NRAs (NMLRA/NTFRA/NPFRA) — US Methodology
  return perimeter === "mal_bank" ? "Mal Bank · UAE NRA · CBUAE" : "Global Account · US NRA 2026 · FinCEN/OFAC";
}

export function nraSourceForPerimeter(perimeter: CompliancePerimeter): string {
  // P2-US-3: US Methodology is built on the 2026 National Risk Assessments (NMLRA/NTFRA/NPFRA)
  return perimeter === "mal_bank"
    ? "UAE National Risk Assessment (2024) · CBUAE AML Rulebook"
    : "US National Money Laundering/TF/PF Risk Assessments (2026) · FinCEN · OFAC";
}

export function productNamesForPerimeter(perimeter: CompliancePerimeter): string[] {
  return allProducts().map((p) => p.productName);
}

export function defaultProductNameForPerimeter(perimeter: CompliancePerimeter): string {
  const names = productNamesForPerimeter(perimeter);
  if (perimeter === "global_account") {
    return names.find((n) => /global/i.test(n)) ?? names[0] ?? "Global Account";
  }
  return names.find((n) => /current/i.test(n)) ?? names[0] ?? "Current Account";
}
