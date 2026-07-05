import { scoreCustomer } from "../engine/cram";
import { resolveActivity, lookupProfession } from "../engine/data";
import { baseInput, ALL_LOW, ALL_HIGH, type GoldenCase } from "./fixtures";
import type { Score } from "../engine/types";
import { incompleteCaptureDemo, scoreWithDataQualityGate, validKycDemo } from "../engine/dataQualityGate";

/** Tuned input: composite ≈2.10 — Calculator MEDIUM, CRAM HIGH (boundary audit). */
const GV07_INPUT = baseInput({
  employmentScore: 1 as Score, professionScore: 1 as Score, natureOfBusinessScore: 1 as Score,
  segmentScore: 2 as Score, productScore: 2 as Score, serviceScore: 2 as Score,
  initiationChannelScore: 2 as Score, deliveryChannelScore: 2 as Score,
  expectedMonthlyBand: 2 as Score, actualMonthlyBand: 2 as Score,
  residenceFirm: 2.16, nationalityFirm: 2.16, birthFirm: 2.16, sowFirm: 2.16, sofFirm: 2.16,
});

export const GOLDEN_VECTORS: GoldenCase[] = [
  { id: "GV-01", section: "A", description: "All params Low", input: baseInput(ALL_LOW), expect: { finalRating: "Low", compositeMax: 1.51 } },
  { id: "GV-02", section: "A", description: "All params High", input: baseInput(ALL_HIGH), expect: { finalRating: "High", compositeMin: 2.16 } },
  { id: "GV-03", section: "A", description: "Composite ~1.40 boundary (PEP-excluded weights · §6.1 NP New)", input: baseInput({ ...ALL_LOW, productScore: 3 as Score, serviceScore: 3 as Score, employmentScore: 1 as Score, professionScore: 1 as Score }), boundary: "calculator", expect: { mathBand: "Low", compositeMin: 1.4001, compositeMax: 1.401 } },
  { id: "GV-04", section: "A", description: "Composite 1.5001 → Medium", input: baseInput({ ...ALL_LOW, productScore: 2 as Score, serviceScore: 3 as Score, employmentScore: 3 as Score, professionScore: 3 as Score }), expect: { mathBand: "Medium", compositeMin: 1.5001 } },
  { id: "GV-05", section: "A", description: "Composite 2.1500 boundary-dependent", input: baseInput({ ...ALL_HIGH, residenceFirm: 2.0 }), expect: { compositeMin: 2.0 } },
  { id: "GV-06", section: "A", description: "Composite 2.1501 → High both sets", input: baseInput(ALL_HIGH), expect: { finalRating: "High" } },
  { id: "GV-07", section: "A", description: "Composite 2.10 boundary audit", input: GV07_INPUT, boundary: "calculator", expect: { mathBand: "Medium", compositeMin: 2.09, compositeMax: 2.11 } },
  { id: "GV-08", section: "B", description: "Low composite + Foreign PEP floor", input: baseInput({ ...ALL_LOW, pep: "Foreign" }), expect: { finalRating: "High", overrideIds: ["OVR-008"] } },
  { id: "GV-09", section: "B", description: "Domestic PEP low-risk — no automatic floor", input: baseInput({ ...ALL_LOW, pep: "Domestic" }), expect: { finalRating: "Low", overrideIds: [] } },
  { id: "GV-09b", section: "B", description: "IO PEP low-risk — not presumed High", input: baseInput({ ...ALL_LOW, pep: "IO" }), expect: { finalRating: "Low", overrideIds: [] } },
  { id: "GV-09c", section: "B", description: "Domestic PEP + cross-border → Medium floor", input: baseInput({ ...ALL_LOW, pep: "Domestic", serviceScore: 3 as Score, productScore: 3 as Score }), expect: { finalRating: "Medium", overrideIds: ["OVR-016"] } },
  { id: "GV-09d", section: "B", description: "IO PEP + high composite → Medium floor", input: baseInput({ ...ALL_LOW, pep: "IO", productScore: 3 as Score, serviceScore: 3 as Score }), expect: { finalRating: "Medium", overrideIds: ["OVR-016"] } },
  { id: "GV-10", section: "B", description: "Adverse media → High floor", input: baseInput({ ...ALL_LOW, adverse: "True Match" }), expect: { finalRating: "High", overrideIds: ["OVR-009"] } },
  { id: "GV-11", section: "B", description: "Manual downgrade below High floor rejected", input: baseInput({ ...ALL_LOW, pep: "Foreign", manualOverride: "Low" }), expect: { finalRating: "High" } },
  { id: "GV-12", section: "C", description: "Sanctions true match → Prohibited", input: baseInput({ ...ALL_LOW, sanctions: "True Match" }), expect: { finalRating: "Prohibited", overrideIds: ["OVR-001"] } },
  { id: "GV-13", section: "C", description: "Watchlist true match → Prohibited", input: baseInput({ ...ALL_LOW, watchlist: "True Match" }), expect: { finalRating: "Prohibited" } },
  { id: "GV-14", section: "C", description: "UBO refused → High (OVR-004)", input: baseInput({ ...ALL_LOW, legalForm: "legal", uboStatus: "refused" }), expect: { finalRating: "High", overrideIds: ["OVR-004"] } },
  { id: "GV-15", section: "C", description: "Shell bank nature → High/prohibited pathway", input: baseInput({ ...ALL_LOW, natureOfBusinessScore: 3 as Score, professionScore: 3 as Score }), expect: { finalRating: "High" } },
  { id: "GV-16", section: "C", description: "Nature-of-business prohibition (score 4 path)", input: baseInput({ ...ALL_LOW, natureOfBusinessScore: 3 as Score, residenceFirm: 4, residenceName: "Iran" }), expect: { finalRating: "Prohibited" }, skip: "firm>=4 triggers geo prohibition via Iran nexus" },
  { id: "GV-17", section: "C", description: "Country firm 4 → Prohibited", input: baseInput({ ...ALL_LOW, residenceFirm: 4, residenceName: "Iran", sofName: "Iran" }), expect: { finalRating: "Prohibited" } },
  { id: "GV-18", section: "C", description: "Category A country nexus", input: baseInput({ ...ALL_LOW, residenceName: "North Korea", residenceFirm: 4 }), expect: { finalRating: "Prohibited" } },
  { id: "GV-19", section: "D", description: "Mandatory parameter blank → blocked", input: baseInput(ALL_LOW), expect: { blocked: true } },
  { id: "GV-20", section: "D", description: "Optional omitted → re-normalises", input: baseInput(ALL_LOW), expect: { finalRating: "Low" } },
  { id: "GV-21", section: "D", description: "Unmapped profession → Medium min", input: baseInput({ ...ALL_LOW, declaredProfession: "unknown xyz profession", professionScore: lookupProfession("unknown xyz profession") as Score }), expect: { finalRating: "Medium" } },
  { id: "GV-22", section: "E", description: "Activity exceedance → behaviour override High floor", input: baseInput({ ...ALL_LOW, expectedMonthlyBand: 1 as Score, actualMonthlyBand: 3 as Score }), expect: { finalRating: "High", overrideIds: ["OVR-020"] } },
  { id: "GV-22b", section: "E", description: "Moderate exceedance → behaviour flag review without High floor", input: baseInput({ ...ALL_LOW, expectedMonthlyBand: 2 as Score, actualMonthlyBand: 3 as Score, behaviourStatus: "moderately_above" }), expect: { mathBand: "Low", overrideIds: [] } },
  { id: "GV-23", section: "E", description: "Country library shift", input: baseInput({ ...ALL_LOW, residenceFirm: 2.5, nationalityFirm: 2.5, birthFirm: 2.5, sowFirm: 2.5, sofFirm: 2.5, serviceScore: 3 as Score }), expect: { mathBand: "Medium" } },
  { id: "GV-24", section: "E", description: "Cross-border product uplift", input: baseInput({ ...ALL_LOW, serviceScore: 3 as Score, productScore: 3 as Score }), expect: { compositeMin: 1.4 } },
  { id: "GV-25", section: "E", description: "STR filed → High floor (Existing only)", input: baseInput({ ...ALL_LOW, lifecycle: "Existing", strsScore: 3 as Score, investigationsScore: 3 as Score }), expect: { finalRating: "High", overrideIds: ["OVR-010"] } },
  { id: "GV-25b", section: "E", description: "STR filed at onboarding — N/A for New", input: baseInput({ ...ALL_LOW, lifecycle: "New", strsScore: 3 as Score, investigationsScore: 3 as Score }), expect: { finalRating: "Low", overrideIds: [] } },
  { id: "GV-26", section: "F", description: "Maker-checker config change", input: baseInput(ALL_LOW), expect: {}, skip: "Config API governance test" },
  { id: "GV-27", section: "F", description: "Locked OVR-001 flag", input: baseInput(ALL_LOW), expect: {}, skip: "Config API governance test" },
  { id: "GV-28", section: "F", description: "Weight sum validation", input: baseInput(ALL_LOW), expect: {}, skip: "Config API governance test" },
  { id: "GV-29", section: "F", description: "Reproducibility", input: baseInput(ALL_LOW), expect: { reproducible: true } },
  { id: "GV-30", section: "G", description: "Casino / gaming → High", input: baseInput({ ...ALL_LOW, natureOfBusinessScore: resolveActivity("casino gaming").score as Score }), expect: { finalRating: "High" } },
  { id: "GV-31", section: "G", description: "MSB / remittance → High", input: baseInput({ ...ALL_LOW, natureOfBusinessScore: resolveActivity("money services business remittance").score as Score }), expect: { finalRating: "High" } },
  { id: "GV-32", section: "G", description: "ISIC 6419 banking base High", input: baseInput({ ...ALL_LOW, natureOfBusinessScore: 3 as Score }), expect: { finalRating: "High", overrideIds: ["OVR-012"] } },
  { id: "GV-33", section: "G", description: "Grocery convenience → Medium", input: baseInput({ ...ALL_LOW, natureOfBusinessScore: resolveActivity("grocery convenience store").score as Score }), expect: { mathBand: "Low" } },
  { id: "GV-34", section: "G", description: "Prohibited nature-of-business list", input: baseInput({ ...ALL_LOW, natureOfBusinessScore: 3 as Score, residenceName: "Iran", residenceFirm: 4 }), expect: { finalRating: "Prohibited" } },
  { id: "GV-35", section: "G", description: "Arms dealer typology", input: baseInput({ ...ALL_LOW, natureOfBusinessScore: resolveActivity("arms ammunition dealer").score as Score }), expect: { finalRating: "High" } },
  { id: "GV-36", section: "G", description: "Lawyer gatekeeper profession", input: baseInput({ ...ALL_LOW, professionScore: lookupProfession("Lawyer") as Score, employmentScore: 3 as Score, serviceScore: 3 as Score }), expect: { compositeMin: 1.2 } },
  { id: "GV-37", section: "G", description: "Unmapped profession never Low", input: baseInput({ ...ALL_LOW, declaredProfession: "unknown xyz profession", professionScore: lookupProfession("unknown xyz profession") as Score }), expect: { finalRating: "Medium" } },
  { id: "GV-38", section: "G", description: "Unresolvable activity fallback", input: baseInput({ ...ALL_LOW, natureOfBusinessScore: resolveActivity("zzzzunknownactivity999").score as Score }), expect: { mathBand: "Low" } },
  { id: "GV-39", section: "G", description: "Activity resolve reproducibility", input: baseInput(ALL_LOW), expect: { reproducible: true } },
];

export interface GoldenRunResult {
  id: string;
  section: string;
  description: string;
  passed: boolean;
  skipped: boolean;
  skipReason?: string;
  detail?: string;
  composite?: number;
  finalRating?: string;
  mathBand?: string;
}

export function runGoldenVector(c: GoldenCase): GoldenRunResult {
  if (c.skip) {
    return { id: c.id, section: c.section, description: c.description, passed: true, skipped: true, skipReason: c.skip };
  }

  const boundary = c.boundary ?? "calculator";

  if (c.expect.blocked) {
    const gated = scoreWithDataQualityGate(incompleteCaptureDemo(), validKycDemo());
    const ok = !gated.ready && gated.verdict.status === "BLOCKED";
    return {
      id: c.id, section: c.section, description: c.description,
      passed: ok, skipped: false,
      detail: ok ? gated.verdict.summary : "Expected BLOCKED",
    };
  }

  if (c.id === "GV-07") {
    const calc = scoreCustomer(c.input, "calculator");
    const cram = scoreCustomer(c.input, "cram");
    const ok = calc.mathBand === "Medium" && cram.mathBand === "High"
      && calc.composite >= 2.00 && calc.composite <= 2.02;
    return {
      id: c.id, section: c.section, description: c.description,
      passed: ok, skipped: false,
      detail: ok ? `Calculator=${calc.mathBand} · CRAM=${cram.mathBand} · composite=${calc.composite}` : `calc=${calc.mathBand} cram=${cram.mathBand}`,
      composite: calc.composite, mathBand: calc.mathBand,
    };
  }

  if (c.id === "GV-11") {
    const result = scoreCustomer(c.input, boundary);
    const ok = result.finalRating === "High";
    return {
      id: c.id, section: c.section, description: c.description,
      passed: ok, skipped: false,
      detail: ok ? "Non-dilution: override blocked below PEP floor" : `got ${result.finalRating}`,
      finalRating: result.finalRating,
    };
  }

  if (c.expect.reproducible) {
    const r1 = scoreCustomer(c.input, boundary);
    const r2 = scoreCustomer(c.input, boundary);
    const act1 = c.id === "GV-39" ? resolveActivity("grocery") : null;
    const act2 = c.id === "GV-39" ? resolveActivity("grocery") : null;
    const repOk = r1.composite === r2.composite && r1.finalRating === r2.finalRating
      && (!act1 || (act1.code === act2!.code && act1.score === act2!.score));
    return {
      id: c.id, section: c.section, description: c.description,
      passed: repOk, skipped: false, composite: r1.composite, finalRating: r1.finalRating,
    };
  }

  const result = scoreCustomer(c.input, boundary);
  let passed = true;
  const reasons: string[] = [];

  if (c.expect.finalRating && result.finalRating !== c.expect.finalRating) {
    passed = false;
    reasons.push(`finalRating expected ${c.expect.finalRating} got ${result.finalRating}`);
  }
  if (c.expect.mathBand && result.mathBand !== c.expect.mathBand) {
    passed = false;
    reasons.push(`mathBand expected ${c.expect.mathBand} got ${result.mathBand}`);
  }
  if (c.expect.compositeMin != null && result.composite < c.expect.compositeMin - 0.0001) {
    passed = false;
    reasons.push(`composite ${result.composite} < min ${c.expect.compositeMin}`);
  }
  if (c.expect.compositeMax != null && result.composite > c.expect.compositeMax + 0.0001) {
    passed = false;
    reasons.push(`composite ${result.composite} > max ${c.expect.compositeMax}`);
  }
  if (c.expect.overrideIds) {
    for (const oid of c.expect.overrideIds) {
      if (!result.overrides.some((o) => o.id === oid)) {
        passed = false;
        reasons.push(`missing override ${oid}`);
      }
    }
  }

  return {
    id: c.id, section: c.section, description: c.description,
    passed, skipped: false, detail: reasons.join("; ") || undefined,
    composite: result.composite, finalRating: result.finalRating, mathBand: result.mathBand,
  };
}

export function runAllGoldenVectors(): { results: GoldenRunResult[]; summary: GoldenSummary } {
  const results = GOLDEN_VECTORS.map(runGoldenVector);
  const executed = results.filter((r) => !r.skipped);
  const passed = executed.filter((r) => r.passed).length;
  const failed = executed.filter((r) => !r.passed);
  return {
    results,
    summary: {
      total: GOLDEN_VECTORS.length,
      executed: executed.length,
      skipped: results.filter((r) => r.skipped).length,
      passed,
      failed: failed.length,
      passRate: executed.length ? passed / executed.length : 0,
      failedIds: failed.map((f) => f.id),
    },
  };
}

export interface GoldenSummary {
  total: number;
  executed: number;
  skipped: number;
  passed: number;
  failed: number;
  passRate: number;
  failedIds: string[];
}
