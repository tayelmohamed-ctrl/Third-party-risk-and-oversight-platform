import { describe, expect, it } from "vitest";
import { REGULATORY_SOURCES, REGULATORY_RSS_FEEDS, SAYED_REGULATORY_MONITOR } from "../src/config/regulatorySources";
import { LICENSE_PROFILES, ACTIVE_LICENSE_PROFILES } from "../src/config/licenseProfiles";
import { CRAM_CATALOGUE } from "../src/config/cramDriveCatalogue";

describe("Sayed regulatory source monitor", () => {
  it("defines weekly monitor cadence for Sayed", () => {
    expect(SAYED_REGULATORY_MONITOR.agent).toBe("sayed");
    expect(SAYED_REGULATORY_MONITOR.cadence).toBe("weekly");
    expect(SAYED_REGULATORY_MONITOR.cronUtc).toMatch(/^\d/);
  });

  it("defines RSS primary feeds for CBUAE and FinCEN", () => {
    expect(REGULATORY_RSS_FEEDS.some((f) => f.id === "RSS-CBUAE")).toBe(true);
    expect(REGULATORY_RSS_FEEDS.some((f) => f.id === "RSS-FINCEN")).toBe(true);
  });

  it("covers CBUAE, FinCEN MSB, OFAC, FATF, and Zenus sources", () => {
    const ids = REGULATORY_SOURCES.map((s) => s.id);
    expect(ids).toContain("SRC-CBUAE-RULEBOOK-AML");
    expect(ids).toContain("SRC-FINCEN-MSB");
    expect(ids).toContain("SRC-OFAC-SDN");
    expect(ids).toContain("SRC-FATF-RECOMMENDATIONS");
    expect(ids).toContain("SRC-ZENUS-PARTNER");
    expect(REGULATORY_SOURCES.length).toBeGreaterThanOrEqual(12);
  });

  it("maps every source to at least one catalogue regulation", () => {
    const regIds = new Set(CRAM_CATALOGUE.regulations.map((r) => r.id));
    for (const src of REGULATORY_SOURCES) {
      expect(src.regulationIds.length).toBeGreaterThan(0);
      for (const rid of src.regulationIds) {
        expect(regIds.has(rid), `missing regulation ${rid} for source ${src.id}`).toBe(true);
      }
    }
  });

  it("covers both license profiles (UAE bank + US MSB Zenus BaaS)", () => {
    expect(ACTIVE_LICENSE_PROFILES).toContain("UAE_COMMUNITY_BANK");
    expect(ACTIVE_LICENSE_PROFILES).toContain("US_MSB_BAAS_ZENUS");
    const uaeSources = REGULATORY_SOURCES.filter((s) => s.licenseProfiles.includes("UAE_COMMUNITY_BANK"));
    const usSources = REGULATORY_SOURCES.filter((s) => s.licenseProfiles.includes("US_MSB_BAAS_ZENUS"));
    expect(uaeSources.length).toBeGreaterThanOrEqual(4);
    expect(usSources.length).toBeGreaterThanOrEqual(4);
  });

  it("catalogue includes dual-license regulations", () => {
    expect(CRAM_CATALOGUE.regulations.length).toBeGreaterThanOrEqual(18);
    expect(CRAM_CATALOGUE.regulations.some((r) => r.id === "REG-ZENUS-BAAS")).toBe(true);
    expect(CRAM_CATALOGUE.regulations.some((r) => r.id === "REG-CBUAE-STR-3354")).toBe(true);
    expect(CRAM_CATALOGUE.regulations.some((r) => r.id === "REG-US-MSB")).toBe(true);
  });

  it("license profiles document regulators", () => {
    expect(LICENSE_PROFILES.find((p) => p.id === "US_MSB_BAAS_ZENUS")?.sponsorBank).toBe("Zenus Bank");
    expect(LICENSE_PROFILES.find((p) => p.id === "UAE_COMMUNITY_BANK")?.regulator).toContain("CBUAE");
  });
});
