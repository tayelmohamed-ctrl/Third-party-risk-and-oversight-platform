/**
 * B-5 — No digital-geo signal defaults to Score 2 in UAE geography composite.
 * B-6 — High SoW/SoF + absent corridorFirm: each contributes exactly 15% (no double-count).
 *
 * UAE §7.2 weighted geography (weights sum to 1.0):
 *   Residence 25% · Nationality 20% · Birth 10% · SoW/SoF max 15%
 *   Corridor 15% (undefined → Score 2 via toS) · Digital Geo 15% (undefined → Score 2 via toS)
 *
 * clampScore in data.ts is a range clamp to [1,3], NOT a band integer conversion.
 * geography factor.score is therefore the raw weighted decimal (e.g. 1.60, not 2).
 *
 * firmToScore(firm): firm ≤ 1.5 → 1 · firm > 1.5 → 2 · firm > 2.15 → 3 · firm ≥ 4 → 4
 */
import { describe, expect, it } from "vitest";
import { scoreCustomer } from "../src/engine/cram";
import { baseInput } from "../src/validation/fixtures";

describe("UAE §7.2 geography composite — B-5 / B-6", () => {
  /**
   * B-5: Absent digitalGeoFirm → toS(undefined) = Score 2 contribution (15% × 2 = 0.30).
   *
   * Setup: residence=Score 1 (no floor), nationality/birth/sowSof=Score 2, corridorFirm
   * explicitly provided as Score 1.  digitalGeoFirm omitted.
   *
   *   No digital geo: 1×.25 + 2×.20 + 2×.10 + 2×.15 + 1×.15 + 2×.15 = 1.60
   *   Explicit Low:   1×.25 + 2×.20 + 2×.10 + 2×.15 + 1×.15 + 1×.15 = 1.45
   */
  it("B-5: absent digitalGeoFirm contributes Score 2 (geo factor 1.60 vs explicit-Low 1.45)", () => {
    const withoutDigitalGeo = baseInput({
      masterRegistryPerimeter: "mal_bank",
      residenceFirm: 1.35,        // firmToScore → 1 (no §7.2 floor trigger)
      nationalityFirm: 1.6,       // firmToScore → 2
      birthFirm: 1.6,             // firmToScore → 2
      sowFirm: 1.6, sofFirm: 1.6, // sowSof firmToScore → 2
      corridorFirm: 1.35,         // firmToScore → 1 (explicitly provided)
      // digitalGeoFirm: omitted → undefined → toS returns Score 2
    });
    const withLowDigitalGeo = baseInput({
      masterRegistryPerimeter: "mal_bank",
      residenceFirm: 1.35,
      nationalityFirm: 1.6,
      birthFirm: 1.6,
      sowFirm: 1.6, sofFirm: 1.6,
      corridorFirm: 1.35,
      digitalGeoFirm: 1.35,       // firmToScore → 1 (explicitly Low)
    });

    const geo1 = scoreCustomer(withoutDigitalGeo).factors.find((f) => f.key === "geography")!;
    const geo2 = scoreCustomer(withLowDigitalGeo).factors.find((f) => f.key === "geography")!;

    // Absent digital geo → weighted 1.60 (Score 2 slot contributes 0.30)
    expect(geo1.score).toBeCloseTo(1.60, 2);
    // Explicit Low digital geo → weighted 1.45 (Score 1 slot contributes 0.15)
    expect(geo2.score).toBeCloseTo(1.45, 2);
    // The 0.15 difference confirms the Score 2 default (not Score 1)
    expect(geo1.score - geo2.score).toBeCloseTo(0.15, 2);
  });

  /**
   * B-6: High SoW/SoF + absent corridorFirm — no double-counting.
   *
   * SoW/SoF contributes exactly 15% at Score 3.  Corridor (undefined) contributes 15% at Score 2.
   * Before the bug fix, corridorFirm was proxied from sowSofFirm → Score 3 at 15% too,
   * giving an effective SoW/SoF weight of 30%.
   *
   *   Correct (no proxy): 1×.25 + 1×.20 + 1×.10 + 3×.15 + 2×.15 + 1×.15 = 1.45
   *   With proxy bug:     1×.25 + 1×.20 + 1×.10 + 3×.15 + 3×.15 + 1×.15 = 1.60
   */
  it("B-6: high SoW/SoF does NOT bleed into corridor slot (geo factor 1.45, not 1.60)", () => {
    const input = baseInput({
      masterRegistryPerimeter: "mal_bank",
      residenceFirm: 1.35,         // firmToScore → 1 (no floor trigger)
      nationalityFirm: 1.35,       // firmToScore → 1
      birthFirm: 1.35,             // firmToScore → 1
      sowFirm: 3.5, sofFirm: 3.5,  // sowSof firmToScore → 3 (High)
      // corridorFirm: omitted → undefined → toS returns Score 2 (not Score 3 from SoW proxy)
      digitalGeoFirm: 1.35,        // firmToScore → 1 (isolates corridor slot)
    });
    const geo = scoreCustomer(input).factors.find((f) => f.key === "geography")!;

    // 1.45 confirms no proxy; 1.60 would reveal the old SoW/SoF double-count bug
    expect(geo.score).toBeCloseTo(1.45, 2);
  });
});
