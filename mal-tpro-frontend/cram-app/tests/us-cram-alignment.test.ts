import { describe, expect, it } from "vitest";
import { scoreCustomer } from "../src/engine/cram";
import { computeGoldenThread } from "../src/engine/goldenThread";
import { lookupCountry } from "../src/engine/data";
import { baseInput } from "../src/validation/fixtures";
import { CONTROL_LABELS, type ControlInputs } from "../src/engine/cramSuiteConfig";
import type { Score } from "../src/engine/types";

/**
 * Locks the Global Account (US) calculation to Mal-CRAM-US-01 (CRAM-US-2026-07-FREEZE-03):
 * residency-primary geography, nationality/birth carve-out (§7.4 Rule 3 / §11.1),
 * Zenus prohibited/restricted country nexus (§7.1/§7.2/§7.4), Zenus prohibited business (§6.4),
 * and the confirmed-suspicion 6-month review (§3.1/§12). All changes are US-perimeter-only.
 */
const CONTROLS: ControlInputs = { cdd: 2, sow: 2, mon: 2, scr: 2, edd: 1, ovs: 2 };
function individualLabels() {
  const o = {} as Record<keyof typeof CONTROL_LABELS, string>;
  (Object.keys(CONTROL_LABELS) as (keyof typeof CONTROL_LABELS)[]).forEach((k) => { o[k] = CONTROL_LABELS[k].individual; });
  return o;
}
const usFirm = (n: string) => lookupCountry(n, "global_account")!.firm;
const US = "United States of America";
const geoScore = (r: ReturnType<typeof scoreCustomer>) => r.factors.find((f) => f.key === "geography")!.score;

describe("US CRAM (Mal-CRAM-US-01 FREEZE-03) — Global Account calculation alignment", () => {
  // A — residency-primary geography (§2.2/§7.1/§7.3)
  it("geography is residency-primary: high-risk residence drives the geography factor to High", () => {
    const r = scoreCustomer(baseInput({
      masterRegistryPerimeter: "global_account",
      residenceName: US, residenceFirm: 2.5,          // high-risk residence (firmToScore → 3)
      sowName: US, sofName: US, sowFirm: 1.35, sofFirm: 1.35,
      nationalityFirm: 1.35, birthFirm: 1.35,
    }));
    expect(geoScore(r)).toBe(3);
  });

  it("nationality/birth are NOT scored: high-risk nationality alone leaves geography Low (§11.1)", () => {
    const r = scoreCustomer(baseInput({
      masterRegistryPerimeter: "global_account",
      residenceName: US, residenceFirm: 1.35,
      nationalityName: "Nigeria", nationalityFirm: 2.5, birthName: "Nigeria", birthFirm: 2.5,
      sowName: US, sofName: US, sowFirm: 1.35, sofFirm: 1.35,
    }));
    expect(geoScore(r)).toBe(1);
    expect(r.overrides.some((o) => o.id === "OVR-011")).toBe(false);
  });

  // B — prohibited/restricted nexus + carve-out (§7.1/§7.2/§7.4)
  it("residence in a sanctioned jurisdiction (Russia) → Prohibited", () => {
    const r = scoreCustomer(baseInput({
      masterRegistryPerimeter: "global_account",
      residenceName: "Russia", residenceFirm: usFirm("Russia"),
      sowName: US, sofName: US, sowFirm: 1.35, sofFirm: 1.35,
    }));
    expect(r.finalRating).toBe("Prohibited");
  });

  it("§7.4 Rule 3 carve-out: Russian nationality + permitted residence + clean funds → NOT prohibited (flag only)", () => {
    const r = scoreCustomer(baseInput({
      masterRegistryPerimeter: "global_account",
      residenceName: US, residenceFirm: usFirm(US),
      nationalityName: "Russia", nationalityFirm: usFirm("Russia"),
      birthName: "Russia", birthFirm: usFirm("Russia"),
      sowName: US, sofName: US, sowFirm: usFirm(US), sofFirm: usFirm(US),
    }));
    expect(r.finalRating).not.toBe("Prohibited");
    expect(r.profileNotes.some((n) => /Nationality\/birthplace nexus/.test(n))).toBe(true);
  });

  it("residence in a Zenus restricted jurisdiction (Kazakhstan) → Prohibited / blocked (§7.2)", () => {
    const r = scoreCustomer(baseInput({
      masterRegistryPerimeter: "global_account",
      residenceName: "Kazakhstan", residenceFirm: usFirm("Kazakhstan"),
      sowName: US, sofName: US, sowFirm: 1.35, sofFirm: 1.35,
    }));
    expect(r.finalRating).toBe("Prohibited");
  });

  it("§7.4 Rule 1: SoF from a Zenus restricted jurisdiction, residence elsewhere → High (workable, not blocked)", () => {
    const r = scoreCustomer(baseInput({
      masterRegistryPerimeter: "global_account",
      residenceName: US, residenceFirm: usFirm(US),
      sofName: "Kazakhstan", sofFirm: usFirm("Kazakhstan"),
      sowName: US, sowFirm: usFirm(US),
    }));
    expect(r.finalRating).toBe("High");
    expect(r.overrides.some((o) => o.id === "OVR-011")).toBe(true);
  });

  // C — Zenus prohibited business (§6.4) + DPMS de-escalation (FREEZE-03 taxonomy)
  it("§6.4 DPMS / jewelry is NOT a knock-out — routes to nature-of-business High (OVR-012), not OVR-002", () => {
    const r = scoreCustomer(baseInput({
      masterRegistryPerimeter: "global_account",
      customerMode: "entity",
      declaredActivity: "Jewelry and precious metals (DPMS)",
      natureOfBusinessScore: 3 as Score,   // registry scores DPMS High (profession-risk 4 / §5.1)
      residenceName: US, residenceFirm: usFirm(US),
      sowName: US, sofName: US, sowFirm: usFirm(US), sofFirm: usFirm(US),
    }));
    expect(r.overrides.some((o) => o.id === "OVR-002" && /Zenus-prohibited business/.test(o.why))).toBe(false);
    expect(r.finalRating).not.toBe("Prohibited");
    expect(r.finalRating).toBe("High"); // via OVR-012 high-risk nature of business
  });

  it("§6.4 a genuinely comprehensive-prohibited category (offshore bank) still knocks out → Prohibited", () => {
    const r = scoreCustomer(baseInput({
      masterRegistryPerimeter: "global_account",
      customerMode: "entity",
      declaredActivity: "Offshore bank",
      residenceName: US, residenceFirm: usFirm(US),
      sowName: US, sofName: US, sowFirm: usFirm(US), sofFirm: usFirm(US),
    }));
    expect(r.overrides.some((o) => o.id === "OVR-002" && /Zenus-prohibited business/.test(o.why))).toBe(true);
    expect(r.finalRating).toBe("Prohibited");
  });

  // D — confirmed suspicion → High + 6-month MLRO-escalated review (CRAM §12 Priority 2)
  it("confirmed suspicion / existing STR-SAR (OVR-010) → High + 6-month review", () => {
    const input = baseInput({
      masterRegistryPerimeter: "global_account",
      lifecycle: "Existing", strsScore: 3,
      residenceName: US, residenceFirm: usFirm(US),
      sowName: US, sofName: US, sowFirm: usFirm(US), sofFirm: usFirm(US),
    });
    const r = scoreCustomer(input);
    expect(r.overrides.some((o) => o.id === "OVR-010")).toBe(true);
    expect(r.finalRating).toBe("High");
    const gt = computeGoldenThread("individual", input, r, CONTROLS, individualLabels(), new Date("2026-06-01"));
    expect(gt.reviewMonths).toBe(6);
  });

  // E — OVR-003 sanctioned-wallet exposure → HIGH floor (three-tier model, §5.6/§7.3.3)
  it("OVR-003 sanctioned-wallet exposure (mixer-routed) → High (not a fourth tier)", () => {
    const input = baseInput({
      masterRegistryPerimeter: "global_account",
      walletExposure: "mixer",
      residenceName: US, residenceFirm: usFirm(US),
      sowName: US, sofName: US, sowFirm: usFirm(US), sofFirm: usFirm(US),
    });
    const r = scoreCustomer(input);
    expect(r.overrides.some((o) => o.id === "OVR-003" && o.cls === "HIGH")).toBe(true);
    expect(r.finalRating).toBe("High");
  });

  it("a Prohibited nexus still wins over an OVR-003 wallet-exposure High floor", () => {
    const r = scoreCustomer(baseInput({
      masterRegistryPerimeter: "global_account",
      walletExposure: "mixer",
      residenceName: "Russia", residenceFirm: usFirm("Russia"),
      sowName: US, sofName: US, sowFirm: usFirm(US), sofFirm: usFirm(US),
    }));
    expect(r.finalRating).toBe("Prohibited");
  });

  it("wallet exposure default/none → no OVR-003, not elevated (inert until captured)", () => {
    const r = scoreCustomer(baseInput({
      masterRegistryPerimeter: "global_account",
      residenceName: US, residenceFirm: usFirm(US),
      sowName: US, sofName: US, sowFirm: usFirm(US), sofFirm: usFirm(US),
    }));
    expect(r.overrides.some((o) => o.id === "OVR-003")).toBe(false);
    expect(r.finalRating).toBe("Low");
  });

  // F — OVR-011 discretionary marker
  it("OVR-011 (Score-3 country exposure) carries the discretionary risk-appetite flag", () => {
    const r = scoreCustomer(baseInput({
      masterRegistryPerimeter: "global_account",
      residenceName: US, residenceFirm: usFirm(US),
      sofName: "Kazakhstan", sofFirm: usFirm("Kazakhstan"),
      sowName: US, sowFirm: usFirm(US),
    }));
    expect(r.overrides.find((o) => o.id === "OVR-011")?.discretionary).toBe(true);
  });

  // Perimeter isolation — UAE (mal_bank) unchanged: nationality still contributes to geography
  it("perimeter isolation: nationality still scores under mal_bank (§7.2 UAE model unchanged)", () => {
    const r = scoreCustomer(baseInput({
      masterRegistryPerimeter: "mal_bank",
      residenceName: "United Arab Emirates", residenceFirm: 1.35,
      nationalityFirm: 2.5,
    }));
    expect(geoScore(r)).toBeGreaterThan(1);
  });
});
