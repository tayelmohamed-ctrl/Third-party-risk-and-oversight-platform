import { COUNTRIES, PROFESSIONS, PRODUCTS, OVERRIDES } from "../engine/data";
import { ACTIVITY_LIBRARY_VERSION } from "./activityRiskConfig";
import { MODEL_VERSION_ID } from "../validation/independentValidation";
import type { Boundary } from "../engine/types";
import { getAllBandBoundaries } from "./bandBoundaries";
import { getFactorWeights } from "./runtimeConfig";

export interface LibraryVersionsSnapshot {
  modelVersionId: string;
  countries: { count: number; source: string };
  professions: { count: number; source: string };
  products: { count: number; source: string };
  activityLibrary: string;
  overrideRules: { count: number; version: string };
  factorWeights: ReturnType<typeof getFactorWeights>;
  bandBoundaries: ReturnType<typeof getAllBandBoundaries>;
  capturedAt: string;
}

export function getActiveModelVersionId(): string {
  return MODEL_VERSION_ID;
}

export function buildLibraryVersionsSnapshot(): LibraryVersionsSnapshot {
  return {
    modelVersionId: getActiveModelVersionId(),
    countries: { count: COUNTRIES.length, source: "country_risk.csv" },
    professions: { count: PROFESSIONS.length, source: "professions.json" },
    products: { count: PRODUCTS.length, source: "products.json" },
    activityLibrary: ACTIVITY_LIBRARY_VERSION,
    overrideRules: { count: OVERRIDES.length, version: getActiveModelVersionId() },
    factorWeights: getFactorWeights(),
    bandBoundaries: getAllBandBoundaries(),
    capturedAt: new Date().toISOString(),
  };
}

export function boundarySetLabel(boundary: Boundary): string {
  return boundary === "calculator" ? "Calculator (>2.15)" : "CRAM (>2.00)";
}
