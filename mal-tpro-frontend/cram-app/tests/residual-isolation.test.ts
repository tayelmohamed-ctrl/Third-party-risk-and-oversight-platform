/**
 * A-2 — Residual isolation: the residual band is management information only.
 * It must NEVER feed into CDD/EDD treatment, approval authority, review period, or monitoring.
 * P0-2: inherent rating drives all treatment. Residual is computed after treatment is locked.
 *
 * Key invariant: a High-inherent customer with 100% control effectiveness still receives
 * High treatment (EDD, MLRO approval, 12-month review) — not a downgraded outcome.
 */
import { describe, expect, it } from "vitest";
import { scoreCustomer } from "../src/engine/cram";
import { computeGoldenThread } from "../src/engine/goldenThread";
import { baseInput } from "../src/validation/fixtures";
import type { ControlInputs } from "../src/engine/cramSuiteConfig";
import { CONTROL_LABELS as CFG_LABELS } from "../src/engine/cramSuiteConfig";

const HIGH_CONTROLS: ControlInputs = {
  cdd: 3, sow: 3, mon: 3, scr: 3, edd: 3, ovs: 3,
};

// Flatten bilingual labels to a simple Record<ControlKey, string>
const CONTROL_LABELS = Object.fromEntries(
  Object.entries(CFG_LABELS).map(([k, v]) => [k, (v as { individual: string }).individual]),
) as Record<import("../src/engine/cramSuiteConfig").ControlKey, string>;

describe("Residual isolation — P0-2 golden thread invariant (A-2)", () => {
  it("High-inherent with 100% control effectiveness → still High treatment, not downgraded", () => {
    const input = baseInput({
      residenceFirm: 3,
      nationalityFirm: 3,
      sowFirm: 3,
      sofFirm: 3,
      productScore: 3,
      serviceScore: 3,
    });
    const result = scoreCustomer(input);
    expect(result.finalRating).toBe("High");

    const gt = computeGoldenThread("individual", input, result, HIGH_CONTROLS, CONTROL_LABELS);

    // Treatment must reflect inherent High — not residual
    expect(gt.inherentLevel).toBe("High");
    expect(gt.eddRequired).toBe(true);
    expect(gt.dueDiligence).toMatch(/EDD/i);
    expect(gt.approval.cls).toBe("HIGH");
    expect(gt.reviewMonths).toBeLessThanOrEqual(12);
  });

  it("residual band does not appear as an approval trigger or review driver", () => {
    const input = baseInput({
      residenceFirm: 3,
      nationalityFirm: 3,
      sowFirm: 3,
      sofFirm: 3,
    });
    const result = scoreCustomer(input);
    const gt = computeGoldenThread("individual", input, result, HIGH_CONTROLS, CONTROL_LABELS);

    // residual.residualLevel may be Low with 100% controls — but treatment still High
    const residualIsLower = ["Low", "Medium"].includes(String(gt.residual.residualLevel));
    if (residualIsLower) {
      // Even if residual is lower, treatment must NOT be downgraded
      expect(gt.inherentLevel).toBe("High");
      expect(gt.eddRequired).toBe(true);
      expect(gt.approval.cls).toBe("HIGH");
    }
  });

  it("computeResidual returns a valid residualLevel and effectiveness=1.0 with max controls", () => {
    const input = baseInput({
      residenceFirm: 3,
      nationalityFirm: 3,
      sowFirm: 3,
      sofFirm: 3,
    });
    const result = scoreCustomer(input);
    const gt = computeGoldenThread("individual", input, result, HIGH_CONTROLS, CONTROL_LABELS);

    // With all controls at max, effectiveness should be 1.0 (100%)
    expect(gt.residual.effectiveness).toBeCloseTo(1.0, 3);
    // residualLevel is present and valid
    expect(["Low", "Medium", "High", "Prohibited"]).toContain(String(gt.residual.residualLevel));
    // residualScore is a finite, positive number (not NaN, not negative)
    expect(gt.residual.residualScore).toBeGreaterThan(0);
    expect(isFinite(gt.residual.residualScore)).toBe(true);
  });
});
