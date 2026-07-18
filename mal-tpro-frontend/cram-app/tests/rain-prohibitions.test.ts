import { describe, expect, it } from "vitest";
import { scoreCustomer } from "../src/engine/cram";
import { baseInput } from "../src/validation/fixtures";
import { validateDataQuality, validCaptureDemo, validKycDemo } from "../src/engine/dataQualityGate";
import ruleLibrary from "../src/data/oscilar_rule_library.json";
import {
  isRainProhibitedResidence,
  isRainSpendingProhibited,
  isRainVirtualAccountProduct,
  RAIN_PROHIBITED_RESIDENCE_COUNTRIES,
  RAIN_SPENDING_PROHIBITED_COUNTRIES,
} from "../src/config/rainProhibitions";

/**
 * Rain Prohibitions List (2026-04-27) — SCOPE: gates the Rain CARD and VIRTUAL-ACCOUNT products only.
 * A resident of a Rain-prohibited country (e.g. Turkey) is NOT marked Prohibited and can still hold a
 * USD account and transfer/payout — only the Rain card / virtual account is withheld.
 */
const CODE = "RAIN_PRODUCT_PROHIBITED";
const hasRainBlock = (r: ReturnType<typeof validateDataQuality>) => r.issues.some((i) => i.code === CODE);
const ga = (residenceCountry: string, product: string, perimeter: "global_account" | "mal_bank" = "global_account") =>
  validateDataQuality(
    { ...validCaptureDemo(), compliancePerimeter: perimeter, mode: "individual", product, residenceCountry },
    validKycDemo(),
    new Date("2026-06-01"),
  );

describe("Rain Prohibitions List — card / virtual-account product eligibility", () => {
  it("lists the 17 prohibited-residence and 7 spending-prohibited countries", () => {
    expect(RAIN_PROHIBITED_RESIDENCE_COUNTRIES).toHaveLength(17);
    expect(RAIN_SPENDING_PROHIBITED_COUNTRIES).toHaveLength(7);
  });

  it("residence helper matches the list incl. the 'China (Mainland)' variant; spending list is the 7", () => {
    for (const c of ["India", "Turkey", "Vietnam", "Israel", "China", "China (Mainland)", "Nepal"]) {
      expect(isRainProhibitedResidence(c), c).toBe(true);
    }
    expect(isRainProhibitedResidence("United Arab Emirates")).toBe(false);
    expect(isRainSpendingProhibited("Iran")).toBe(true);
    expect(isRainSpendingProhibited("Turkey")).toBe(false); // Turkey is residence-prohibited, NOT spending-prohibited
  });

  it("virtual-account product detector matches VIBAN but not the 'Credit / Virtual Card'", () => {
    expect(isRainVirtualAccountProduct("Virtual Accounts / Virtual IBANs")).toBe(true);
    expect(isRainVirtualAccountProduct("Credit / Virtual Card")).toBe(false);
    expect(isRainVirtualAccountProduct("Debit Card")).toBe(false);
  });

  it("blocks the CARD for a Rain-prohibited residence (Turkey)", () => {
    const r = ga("Turkey", "Debit Card");
    expect(hasRainBlock(r)).toBe(true);
    expect(r.status).toBe("BLOCKED");
  });

  it("blocks the VIRTUAL ACCOUNT for a Rain-prohibited residence (Turkey)", () => {
    expect(hasRainBlock(ga("Turkey", "Virtual Accounts / Virtual IBANs"))).toBe(true);
  });

  it("does NOT block transfers/account products for a Rain-prohibited residence — Turkish residents can transfer", () => {
    expect(hasRainBlock(ga("Turkey", "Global Account"))).toBe(false);
    expect(hasRainBlock(ga("Turkey", "International Transfers / Remittances"))).toBe(false);
  });

  it("does NOT block a card for a permitted residence, and is US-perimeter only", () => {
    expect(hasRainBlock(ga("United Arab Emirates", "Debit Card"))).toBe(false);
    expect(hasRainBlock(ga("Turkey", "Debit Card", "mal_bank"))).toBe(false);
  });

  it("does NOT mark a Rain-prohibited-residence customer Prohibited — the CRAM rating is unaffected", () => {
    const r = scoreCustomer(baseInput({
      masterRegistryPerimeter: "global_account",
      customerMode: "individual",
      residenceName: "Turkey",
    }));
    expect(r.overrides.find((o) => o.id === "OVR-RAIN")).toBeUndefined();
    expect(r.finalRating).not.toBe("Prohibited");
  });

  it("adds the Rain TM rules OS-TM-071..076 (card / VA-scoped controls)", () => {
    const rules = (ruleLibrary as { rules: { id: string; channel: string }[] }).rules;
    for (const id of ["OS-TM-071", "OS-TM-072", "OS-TM-073", "OS-TM-074", "OS-TM-075", "OS-TM-076"]) {
      expect(rules.find((x) => x.id === id), `${id} present`).toBeTruthy();
    }
    expect(rules.find((x) => x.id === "OS-TM-071")?.channel).toBe("card"); // spend-country block, card channel
  });
});
