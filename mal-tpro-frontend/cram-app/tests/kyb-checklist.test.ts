import { describe, expect, it } from "vitest";
import { buildKybChecklist, KYB_DEMO_CASES } from "../src/lib/kybChecklistBuilder";
import { entityTypeToKybCategory } from "../src/config/kybDocumentMatrix";

describe("KYB checklist builder", () => {
  it("builds core matrix items for UAE IBAN-only SME", () => {
    const pkg = buildKybChecklist(KYB_DEMO_CASES[0]);
    expect(pkg.prohibited).toBe(false);
    expect(pkg.coreItems.length).toBeGreaterThan(10);
    expect(pkg.coreItems.some((i) => i.document.includes("Trade / commercial"))).toBe(true);
    expect(pkg.entityItems.some((i) => i.cramNote.includes("Sole establishment") || i.document.includes("Owner ID"))).toBe(true);
  });

  it("escalates financing and EDD for high-risk DMCC case", () => {
    const pkg = buildKybChecklist(KYB_DEMO_CASES[1]);
    expect(pkg.products).toContain("financing");
    expect(pkg.escalations.some((e) => e.includes("Financing"))).toBe(true);
    expect(pkg.escalations.some((e) => e.includes("EDD"))).toBe(true);
    expect(pkg.coreItems.some((i) => i.effectiveLevel === "mandatory")).toBe(true);
  });

  it("includes global account artefacts for Zenus case", () => {
    const pkg = buildKybChecklist(KYB_DEMO_CASES[2]);
    expect(pkg.products).toContain("global_account");
    expect(pkg.escalations.some((e) => e.toLowerCase().includes("zenus") || e.includes("Global Account"))).toBe(true);
  });

  it("blocks prohibited entity types", () => {
    const pkg = buildKybChecklist({
      ...KYB_DEMO_CASES[0],
      entityType: "Unregulated Money Service Business (MSB)",
    });
    expect(pkg.prohibited).toBe(true);
    expect(pkg.coreItems).toHaveLength(0);
  });

  it("maps entity legal types to KYB categories", () => {
    expect(entityTypeToKybCategory("Sole Proprietorship")).toBe("sole_proprietorship");
    expect(entityTypeToKybCategory("Commercial Free Zone Establishment (FZE / FZ-LLC)")).toBe("free_zone");
  });
});
