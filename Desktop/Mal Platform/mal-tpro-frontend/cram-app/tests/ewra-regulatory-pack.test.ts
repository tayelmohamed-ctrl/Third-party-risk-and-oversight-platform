import { describe, expect, it } from "vitest";
import { EWRA_REGULATORY_PACK } from "../src/config/ewraRegulatoryPack";
import { parseRssFingerprints } from "../server/regulatory/rssMonitor";

describe("EWRA regulatory pack — regulator-ready documents", () => {
  it("includes board-approved methodology with six sections", () => {
    expect(EWRA_REGULATORY_PACK.methodology.sections).toHaveLength(6);
    expect(EWRA_REGULATORY_PACK.methodology.regulatoryBasis.length).toBeGreaterThanOrEqual(3);
    expect(EWRA_REGULATORY_PACK.methodology.executiveSummary).toContain("inherent");
  });

  it("includes Q2 2026 snapshot with MLRO signatory", () => {
    expect(EWRA_REGULATORY_PACK.snapshot.signatory.name).toBe("Walid Elsheikha");
    expect(EWRA_REGULATORY_PACK.snapshot.keyMetrics.length).toBeGreaterThanOrEqual(5);
    expect(EWRA_REGULATORY_PACK.snapshot.matrix.cells).toHaveLength(3);
  });

  it("documents dual license paths", () => {
    expect(EWRA_REGULATORY_PACK.licensePaths.some((p) => p.includes("CBUAE"))).toBe(true);
    expect(EWRA_REGULATORY_PACK.licensePaths.some((p) => p.includes("Zenus"))).toBe(true);
  });
});

describe("RSS monitor parser", () => {
  it("extracts item fingerprints from RSS XML", () => {
    const xml = `<?xml version="1.0"?><rss><channel><item><title>Test Notice</title><link>https://example.com/1</link><guid>abc</guid></item></channel></rss>`;
    const fps = parseRssFingerprints(xml);
    expect(fps).toContain("abc");
  });
});
