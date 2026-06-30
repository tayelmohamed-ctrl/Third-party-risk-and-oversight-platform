import { describe, expect, it } from "vitest";
import templateData from "../src/data/reporting_templates.json";
import { REPORTING_AREAS } from "../src/config/reportingCatalogue";
import { FIU_ROUTING } from "../src/config/partnerIntegration";
import { GOAML_REPORT_TYPES, STR_FILING_SLA } from "../src/config/cbuaeReportingGuidance";

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
    expect(templateData.templates.some((t) => t.id === "RPT-SAR-UAE-001")).toBe(true);
    expect(templateData.templates.some((t) => t.id === "RPT-SAR-US-001")).toBe(true);
  });

  it("includes all CBUAE goAML supplementary report types", () => {
    for (const type of GOAML_REPORT_TYPES) {
      const hasTemplate =
        templateData.templates.some((t) => t.tags.includes(type.code)) ||
        templateData.templates.some((t) => t.id.includes(type.code));
      expect(hasTemplate, `missing template for goAML type ${type.code}`).toBe(true);
    }
  });

  it("STR template reflects CBUAE narrative and SLA requirements", () => {
    const str = templateData.templates.find((t) => t.id === "RPT-STR-UAE-001");
    expect(str).toBeDefined();
    expect(str!.body).toContain("Who/What/When/Where/Why/How");
    expect(str!.body).toContain("RFR");
    expect(str!.body).toContain(String(STR_FILING_SLA.standardBusinessDaysFromAlert));
    expect(str!.checklist?.some((c) => c.toLowerCase().includes("defensive"))).toBe(true);
  });

  it("attempted transaction template directs to UAE SAR not STR", () => {
    const att = templateData.templates.find((t) => t.id === "RPT-ATT-UAE-001");
    expect(att!.body.toLowerCase()).toContain("sar");
    expect(att!.tags).toContain("SAR");
  });

  it("includes post-STR and internal recommendation workflow templates", () => {
    expect(templateData.templates.some((t) => t.id === "WF-POST-STR-001")).toBe(true);
    expect(templateData.templates.some((t) => t.id === "WF-INT-STR-001")).toBe(true);
    expect(templateData.templates.some((t) => t.id === "WF-ALERT-DISP-001")).toBe(true);
  });

  it("template version reflects CBUAE STR update", () => {
    expect(templateData.version).toContain("cbuae-str");
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
