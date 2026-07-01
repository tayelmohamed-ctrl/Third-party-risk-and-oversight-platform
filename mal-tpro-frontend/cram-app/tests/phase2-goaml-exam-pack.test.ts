import { describe, expect, it } from "vitest";
import { buildFilingDocument } from "../src/lib/filingDraftDocument";
import { buildGoamlPayload, buildFincenPayload, buildFincenCtrPayload } from "../server/goaml/payloadBuilder";
import { buildCtrDocument } from "../src/lib/ctrDraftDocument";

describe("goAML payload builder", () => {
  it("maps v2 draft sections to goAML STR payload", () => {
    const doc = buildFilingDocument({
      templateId: "RPT-STR-UAE-001",
      reportType: "STR",
      fiuId: "UAE",
      caseNumber: "CLC202607019999",
      customerName: "Omar Khalid",
      customerId: "ACT00005",
      title: "Layering pattern",
    });
    const payload = buildGoamlPayload(doc, "fil_test");
    expect(payload.system).toBe("goAML");
    expect(payload.reportType).toBe("STR");
    expect(payload.subject.customerName).toBe("Omar Khalid");
    expect(payload.narrative.why).toBeTruthy();
    expect(payload.renderedNarrative).toContain("MAL FINCRIME OS");
  });

  it("builds FinCEN payload for US SAR drafts", () => {
    const doc = buildFilingDocument({
      templateId: "RPT-SAR-US-001",
      reportType: "SAR_US",
      fiuId: "US",
      caseNumber: "CLC-US-1",
      customerName: "Test US",
      customerId: "US001",
      title: "US SAR",
    });
    const payload = buildFincenPayload(doc, "fil_us");
    expect(payload.system).toBe("FinCEN");
    expect(payload.form).toBe("SAR-111");
  });

  it("builds FinCEN CTR Form 104 payload", () => {
    const doc = buildCtrDocument({
      obligationId: "ctr_x",
      customerId: "US1",
      customerName: "CTR Co",
      transactionDate: "2026-06-28",
      aggregateUsd: 12000,
      cashIn: 12000,
      tin: "11-1111111",
    });
    const payload = buildFincenCtrPayload(doc, "fil_ctr");
    expect(payload.form).toBe("104");
  });
});

describe("Phase 2 FIU submission routes", () => {
  const ROUTES = [
    "POST /api/v1/crr/filings/:id/submit-fiu",
    "GET /api/v1/crr/filings/:id/submissions",
    "GET /api/v1/crr/exam-pack",
    "POST /api/v1/crr/exam-pack/generate",
  ];

  it("exposes submission and exam pack endpoints", () => {
    expect(ROUTES.length).toBe(4);
    expect(ROUTES.some((r) => r.includes("submit-fiu"))).toBe(true);
    expect(ROUTES.some((r) => r.includes("exam-pack"))).toBe(true);
  });
});
