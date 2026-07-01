import { describe, expect, it } from "vitest";
import { FIU_DESTINATIONS, getFiuDestination } from "../src/config/fiuRegistry";
import {
  buildDefaultSections,
  buildFilingDocument,
  composeRenderedText,
  normalizeDraftBody,
  reportTypeForFiu,
  updateSection,
} from "../src/lib/filingDraftDocument";
import { evaluateDraftCompliance } from "../src/config/filingGuidanceRequirements";
import { warrantsFilingDraft } from "../server/filings/orchestrator";
import { buildPlaceholderMap, selectTemplateForCase } from "../server/filings/templates";
import type { InvestigationCaseRecord } from "../server/investigations/types";

const BASE_CASE: InvestigationCaseRecord = {
  id: "case_test",
  caseNumber: "CLC202607019999",
  title: "Round-amount layering",
  customerId: "ACT00005",
  customerName: "Omar Khalid",
  status: "pending_mlro",
  priority: "high",
  severity: "high",
  source: "tm_alert",
  tmAlertId: "tma_1",
  screeningCaseId: null,
  onboardingCaseId: null,
  assignedTo: null,
  typologyId: null,
  ruleId: "OS-TM-003",
  ruleName: "Round-amount layering",
  craRating: "High",
  slaDueAt: null,
  disposition: "sar_recommended",
  dispositionNotes: null,
  disposedBy: null,
  disposedAt: null,
  pipelineStep: 3,
  summary: "Auto-opened from Oscilar alert",
  metadata: {
    amount: 200000,
    currency: "AED",
    channel: "transfer",
    licenseRegion: "UAE",
  },
  createdAt: "2026-07-01T06:00:00.000Z",
  updatedAt: "2026-07-01T06:00:00.000Z",
  evidence: [
    {
      id: "ev_1",
      caseId: "case_test",
      kind: "tm_alert",
      label: "Source TM alert",
      detail: "Round-amount layering",
      payload: null,
      createdBy: "system",
      createdAt: "2026-07-01T06:00:00.000Z",
    },
  ],
};

describe("FIU registry", () => {
  it("defines UAE goAML and US FinCEN destinations with contacts", () => {
    expect(FIU_DESTINATIONS.UAE.system).toBe("goAML");
    expect(FIU_DESTINATIONS.US.system).toContain("FinCEN");
    expect(getFiuDestination("UAE").contactEmail).toContain("@");
    expect(getFiuDestination("US").portalUrl).toContain("fincen");
  });
});

describe("Structured filing document (v2)", () => {
  it("builds guidance-aligned sections (CBUAE · Thematic · FFIEC App L)", () => {
    const sections = buildDefaultSections({
      caseNumber: "CLC1",
      customerName: "Omar Khalid",
      customerId: "ACT00005",
      title: "Layering",
      fiuId: "UAE",
      reportType: "STR",
    });
    for (const id of [
      "whoNarrative", "whySuspicious", "expectedVsObserved", "counterpartyScreening",
      "tmRuleTriggered", "postStrActions", "relatedAccountsReview",
    ]) {
      expect(sections.some((s) => s.id === id)).toBe(true);
    }
    expect(sections.length).toBeGreaterThanOrEqual(35);
    expect(sections.filter((s) => s.required).length).toBeGreaterThan(15);
  });

  it("evaluateDraftCompliance scores required fields and flags blockers", () => {
    const doc = buildFilingDocument({
      templateId: "RPT-STR-UAE-001",
      reportType: "STR",
      fiuId: "UAE",
      caseNumber: "CLC1",
      customerName: "Test",
      customerId: "ACT1",
      title: "Test",
    });
    const empty = evaluateDraftCompliance({
      sections: doc.sections,
      reportType: "STR",
      fiuId: "UAE",
      defensiveFilingDenied: true,
    });
    expect(empty.total).toBeGreaterThan(10);
    expect(empty.score).toBeLessThan(empty.total);

    const filled = evaluateDraftCompliance({
      sections: doc.sections.map((s) => ({
        ...s,
        value: s.value.trim().length >= 8 ? s.value : `Completed: ${s.label} with sufficient detail for filing.`,
      })),
      reportType: "STR",
      fiuId: "UAE",
      defensiveFilingDenied: true,
    });
    expect(filled.score).toBe(filled.total);
    expect(filled.blockers).toHaveLength(0);
  });

  it("composeRenderedText includes Mal header and FIU contact", () => {
    const doc = buildFilingDocument({
      templateId: "RPT-STR-UAE-001",
      reportType: "STR",
      fiuId: "UAE",
      caseNumber: "CLC1",
      customerName: "Test",
      customerId: "ACT1",
      title: "Test",
    });
    expect(doc.renderedText).toContain("MAL FINCRIME OS");
    expect(doc.renderedText).toContain("goAML");
    expect(doc.renderedText).toContain(getFiuDestination("UAE").contactEmail);
    expect(doc.version).toBe(2);
  });

  it("updateSection regenerates rendered text", () => {
    const doc = buildFilingDocument({
      templateId: "RPT-STR-UAE-001",
      reportType: "STR",
      fiuId: "UAE",
      caseNumber: "CLC1",
      customerName: "Test",
      customerId: "ACT1",
      title: "Test",
    });
    const updated = updateSection(doc, "whySuspicious", "Confirmed layering pattern");
    expect(updated.sections.find((s) => s.id === "whySuspicious")?.value).toBe("Confirmed layering pattern");
    expect(updated.renderedText).toContain("Confirmed layering pattern");
  });

  it("normalizes legacy v1 body to v2", () => {
    const v2 = normalizeDraftBody({
      templateId: "RPT-STR-UAE-001",
      renderedText: "legacy",
      placeholders: { customerName: "Omar", customerId: "ACT1", reportRef: "CLC1" },
      agent: "jana",
      generatedAt: new Date().toISOString(),
    });
    expect(v2?.version).toBe(2);
    expect(v2?.sections.length).toBeGreaterThan(10);
  });
});

describe("Phase 1 Step 2 — SAR filing drafts", () => {
  it("warrantsFilingDraft for sar_recommended and escalate only", () => {
    expect(warrantsFilingDraft("sar_recommended")).toBe(true);
    expect(warrantsFilingDraft("escalate")).toBe(true);
    expect(warrantsFilingDraft("closed_fp")).toBe(false);
  });

  it("selects UAE STR template when TM alert has executed amount", () => {
    const sel = selectTemplateForCase(BASE_CASE);
    expect(sel.templateId).toBe("RPT-STR-UAE-001");
    expect(sel.reportType).toBe("STR");
  });

  it("reportTypeForFiu selects US SAR for US region", () => {
    expect(reportTypeForFiu("US", true)).toBe("SAR_US");
    expect(reportTypeForFiu("UAE", true)).toBe("STR");
    expect(reportTypeForFiu("UAE", false)).toBe("SAR");
  });

  it("buildPlaceholderMap returns section values from v2 draft", () => {
    const map = buildPlaceholderMap(BASE_CASE, "Layering confirmed");
    expect(map.customerName).toBe("Omar Khalid");
    expect(map.whySuspicious).toContain("Layering confirmed");
  });
});
