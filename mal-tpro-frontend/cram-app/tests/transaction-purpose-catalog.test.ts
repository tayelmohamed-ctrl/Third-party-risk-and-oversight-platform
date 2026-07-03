import { describe, expect, it } from "vitest";
import {
  allCatalogEntries,
  catalogStats,
  CATALOG_GUIDANCE,
  FLOW_IDS,
  TRANSACTION_PURPOSE_CATALOG,
} from "../src/config/transactionPurposeCatalog";
import { buildTransactionPurposeCatalogPdf } from "../src/lib/transactionPurposeCatalogPdf";

describe("transaction purpose code catalog", () => {
  it("imports 80 codes across 5 flows from Excel catalog", () => {
    const stats = catalogStats();
    expect(stats.total).toBe(80);
    expect(FLOW_IDS.every((id) => TRANSACTION_PURPOSE_CATALOG.flows[id]?.entries.length > 0)).toBe(true);
    expect(stats.byFlow.C2C).toBe(14);
    expect(stats.byFlow.C2B).toBe(16);
    expect(stats.byFlow.B2C).toBe(16);
    expect(stats.byFlow.B2B).toBe(20);
    expect(stats.byFlow.Mal2Mal).toBe(14);
  });

  it("has complete fields on every catalog entry", () => {
    for (const entry of allCatalogEntries()) {
      expect(entry.purpose_code).toMatch(/^(C2C|C2B|B2C|B2B|M2M)-\d+/);
      expect(entry.customer_facing_label.length).toBeGreaterThan(0);
      expect(entry.acceptable_use_compliance_definition.length).toBeGreaterThan(0);
      expect(entry.not_acceptable_misuse_indicators.length).toBeGreaterThan(0);
      expect(entry.tm_screening_relevance.length).toBeGreaterThan(0);
    }
  });

  it("includes README implementation and compliance rules", () => {
    const readme = TRANSACTION_PURPOSE_CATALOG.readme.join(" ");
    expect(readme).toContain("MANDATORY");
    expect(readme).toContain("HOW DEVELOPERS");
    expect(readme).toContain("HOW COMPLIANCE");
  });

  it("builds comprehensive PDF with corridors and typology annex", async () => {
    const doc = await buildTransactionPurposeCatalogPdf();
    expect(doc.getNumberOfPages()).toBeGreaterThan(40);
    const buf = doc.output("arraybuffer");
    expect(buf.byteLength).toBeGreaterThan(50_000);
  });

  it("uses catalog guidance document id", () => {
    expect(CATALOG_GUIDANCE.documentId).toBe("MAL-TM-PPC-CATALOG-v1.0");
  });
});
