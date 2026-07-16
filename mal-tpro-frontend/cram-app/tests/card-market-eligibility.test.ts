import { describe, expect, it } from "vitest";
import { validateDataQuality, validCaptureDemo, validKycDemo } from "../src/engine/dataQualityGate";
import { RAIN_CARD_MARKETS } from "../src/config/rainCardMarkets";

/**
 * Rain USD card is live only in the launch markets — a customer may hold a card only if resident
 * in one of them (Global Account / US perimeter). USD account + payout remain available elsewhere.
 */
const CODE = "CARD_MARKET_INELIGIBLE";
const hasCardBlock = (r: ReturnType<typeof validateDataQuality>) => r.issues.some((i) => i.code === CODE);
const gaCard = (residenceCountry: string, product = "Debit Card") =>
  validateDataQuality(
    { ...validCaptureDemo(), compliancePerimeter: "global_account", mode: "individual", product, residenceCountry },
    validKycDemo(),
    new Date("2026-06-01"),
  );

describe("Rain card launch-market eligibility (Global Account)", () => {
  it("blocks a card product for a resident outside the launch markets", () => {
    const r = gaCard("Saudi Arabia"); // account + payout live, card coming soon
    expect(hasCardBlock(r)).toBe(true);
    expect(r.status).toBe("BLOCKED");
  });

  it("allows the card for residents of every launch market", () => {
    for (const market of RAIN_CARD_MARKETS) {
      expect(hasCardBlock(gaCard(market))).toBe(false);
    }
  });

  it("does not gate a non-card product for the same ineligible residence", () => {
    expect(hasCardBlock(gaCard("Saudi Arabia", "Global Account"))).toBe(false);
  });

  it("is US-perimeter only — Mal Bank card products are not gated by this rule", () => {
    const r = validateDataQuality(
      { ...validCaptureDemo(), compliancePerimeter: "mal_bank", mode: "individual", product: "Debit Card", residenceCountry: "Saudi Arabia" },
      validKycDemo(),
      new Date("2026-06-01"),
    );
    expect(hasCardBlock(r)).toBe(false);
  });
});
