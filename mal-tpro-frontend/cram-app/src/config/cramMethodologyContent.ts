/**
 * CRAM methodology copy + live config snapshot — single source for Test Bench methodology UI.
 * Values are derived from engine/config modules, not hand-maintained scores.
 */
import { CUSTOMER_TYPE_WEIGHTS, ACTIVITY_LIBRARY_VERSION } from "./activityRiskConfig";
import { DEFAULT_BAND_BOUNDARIES, getBandBoundarySet } from "./bandBoundaries";
import { getFactorWeights } from "./runtimeConfig";
import { MODEL_VERSION_ID } from "../validation/independentValidation";
import { OVERRIDES } from "../engine/data";
import { CFG } from "../engine/cramSuiteConfig";
import type { Boundary, ScoreResult } from "../engine/types";
import type { CustomerMode } from "../engine/cramSuiteConfig";
import type { DataQualityVerdict } from "../engine/dataQualityGate";

export type MethodologyAudience = "regulator" | "auditor" | "product";

export const METHODOLOGY_PIPELINE = [
  { id: "dq", step: 1, icon: "🛡️", title: "Data quality gate", code: "FR-007", detail: "Mandatory capture + KYC verification/freshness. No rating if BLOCKED." },
  { id: "map", step: 2, icon: "📚", title: "Library resolution", code: "ISIC · entity register", detail: "Map declarations to scored inputs (1–3). Prohibition = 4 → override layer." },
  { id: "composite", step: 3, icon: "⚖️", title: "Six-factor composite", code: "§4 weights", detail: "Weighted sum of customer-type, geography, product∪service (max), channel (max), transaction." },
  { id: "override", step: 4, icon: "🚫", title: "Non-dilution overrides", code: "OVR-001…020", detail: "Final rating = max(math band, override floor). Prohibited cannot be lifted." },
  { id: "golden", step: 5, icon: "🧵", title: "Golden thread", code: "Policy §12", detail: "CDD/EDD, approval authority, review cycle, monitoring thresholds." },
  { id: "residual", step: 6, icon: "⭐", title: "Control-adjusted residual", code: "SR 11-7", detail: "Inherent × (1 − control effectiveness), capped at one-band step-down." },
] as const;

export function buildMethodologySnapshot(boundary: Boundary) {
  const fw = getFactorWeights();
  const bands = getBandBoundarySet(boundary);
  return {
    modelVersionId: MODEL_VERSION_ID,
    activityLibrary: ACTIVITY_LIBRARY_VERSION,
    boundary,
    factorWeights: fw,
    bandBoundaries: bands,
    allBandBoundaries: DEFAULT_BAND_BOUNDARIES,
    customerTypeWeights: CUSTOMER_TYPE_WEIGHTS,
    overrideCount: OVERRIDES.length,
    reviewMonths: CFG.reviewMonths,
    residual: CFG.residual,
    controlWeights: CFG.controlWeights,
  };
}

export function pipelineStepStatus(
  stepId: (typeof METHODOLOGY_PIPELINE)[number]["id"],
  dq: DataQualityVerdict,
  result: ScoreResult | null,
): "pending" | "active" | "done" {
  if (stepId === "dq") return dq.status === "READY" ? "done" : "active";
  if (!result) return stepId === "map" && dq.status === "READY" ? "active" : "pending";
  if (stepId === "map" || stepId === "composite") return "done";
  if (stepId === "override") return result.overrides.length > 0 ? "active" : "done";
  if (stepId === "golden" || stepId === "residual") return "done";
  return "pending";
}

export function customerTypeBreakdown(mode: CustomerMode) {
  const w = CUSTOMER_TYPE_WEIGHTS[mode];
  const labels: Record<string, string> = mode === "individual"
    ? {
        employment: "Employment status",
        profession: "Profession / occupation",
        natureOfBusiness: "Self-employed ISIC activity",
        segment: "Customer segment",
        expectedActivity: "Expected activity band",
        ubo: "UBO (natural — fixed low)",
      }
    : {
        employment: "Authorised signatory role",
        profession: "Profession (hybrid cases)",
        natureOfBusiness: "Registered ISIC activity",
        entityType: "Legal form / entity type",
        segment: "Customer segment",
        expectedActivity: "Expected turnover band",
        ubo: "UBO transparency",
      };
  return Object.entries(w).map(([key, weight]) => ({
    key,
    label: labels[key] ?? key,
    weightPct: Math.round(weight * 1000) / 10,
  }));
}

export type FactorRowView = {
  key: string;
  name: string;
  weight: number;
  score: number | null;
  contribution: number | null;
  note?: string;
};

export function factorRowsFromResult(result: ScoreResult | null, boundary: Boundary): FactorRowView[] {
  const snap = buildMethodologySnapshot(boundary);
  const fw = snap.factorWeights;
  const defs = [
    { key: "customerType", name: "Customer-type", weight: fw.customerType },
    { key: "geography", name: "Geography", weight: fw.geography },
    { key: "productService", name: "Product & service (max)", weight: fw.product + fw.service },
    { key: "channel", name: "Channel (max)", weight: fw.channel },
    { key: "transaction", name: "Transaction / behaviour", weight: fw.transaction },
  ];
  if (!result) {
    return defs.map((d) => ({ ...d, score: null as number | null, contribution: null as number | null }));
  }
  const byKey = Object.fromEntries(result.factors.filter((f) => f.countsInComposite !== false).map((f) => [f.key, f]));
  return defs.map((d) => {
    const f = byKey[d.key];
    return {
      ...d,
      score: f?.score ?? null,
      contribution: f?.contribution ?? null,
      note: f?.compositeNote,
    };
  });
}

export const AUDIENCE_INTROS: Record<MethodologyAudience, { title: string; lead: string }> = {
  regulator: {
    title: "Supervisory lens",
    lead: "Risk-based CDD with explicit non-dilution floors, PEP gates outside the composite, and documented review cycles aligned to CBUAE expectations.",
  },
  auditor: {
    title: "Assurance lens",
    lead: "Traceable model version, parameter libraries, band boundaries, and override registry — reproducible from the same code path as production scoring.",
  },
  product: {
    title: "Product lens",
    lead: "Each CRAM card section maps to a scoring stage. Change a field → library lookup → factor contribution → possible override → golden-thread outcome.",
  },
};
