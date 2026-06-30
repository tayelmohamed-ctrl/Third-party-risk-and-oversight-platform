import { describe, expect, it } from "vitest";
import templateData from "../src/data/reporting_templates.json";
import { REPORTING_AREAS } from "../src/config/reportingCatalogue";
import { FIU_ROUTING } from "../src/config/partnerIntegration";

describe("Jana reporting template library", () => {
  it("loads templates across all six reporting areas", () => {
    expect(templateData.templates.length).toBeGreaterThanOrEqual(30);
    for (const area of REPORTING_AREAS) {
      const count = templateData.templates.filter((t) => t.area === area.id).length;
      expect(count).toBeGreaterThan(0);
    }
  });

  it("includes UAE STR and US SAR templates", () => {
    expect(templateData.templates.some((t) => t.id === "RPT-STR-UAE-001")).toBe(true);
    expect(templateData.templates.some((t) => t.id === "RPT-SAR-US-001")).toBe(true);
  });

  it("includes professional email templates for missing information", () => {
    const emails = templateData.templates.filter((t) => t.format === "email");
    expect(emails.length).toBeGreaterThanOrEqual(5);
    expect(emails.some((t) => t.id.includes("KYC"))).toBe(true);
    expect(emails.some((t) => t.id.includes("SOF"))).toBe(true);
  });

  it("maps dual FIU routing per Phase 0", () => {
    expect(FIU_ROUTING.UAE.system).toBe("goAML");
    expect(FIU_ROUTING.US.system).toBe("FinCEN_BSA_EFILE");
  });

  it("every template has body and metadata", () => {
    for (const t of templateData.templates) {
      expect(t.id).toBeTruthy();
      expect(t.title).toBeTruthy();
      expect(t.body.length).toBeGreaterThan(50);
      expect(t.submittedTo).toBeTruthy();
    }
  });
});
