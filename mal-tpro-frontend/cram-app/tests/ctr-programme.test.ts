import { describe, expect, it } from "vitest";
import { buildCtrDocument } from "../src/lib/ctrDraftDocument";
import { buildFincenCtrPayload } from "../server/goaml/payloadBuilder";
import { evaluateCtrCompliance } from "../src/config/ctrGuidanceRequirements";
import { CTR_THRESHOLD_USD, ctrDueDate, warrantsCtrReporting } from "../src/config/fincenCtrGuidance";

describe("US CTR programme", () => {
  it("detects USD 10k+ US cash transactions", () => {
    expect(warrantsCtrReporting({ licenseRegion: "US", amountUsd: 12500, channel: "branch_cash" })).toBe(true);
    expect(warrantsCtrReporting({ licenseRegion: "US", amountUsd: 9999, channel: "cash" })).toBe(false);
    expect(warrantsCtrReporting({ licenseRegion: "UAE", amountUsd: 20000, channel: "cash" })).toBe(false);
  });

  it("builds Form 104 CTR document with required sections", () => {
    const doc = buildCtrDocument({
      obligationId: "ctr_test_001",
      customerId: "US-001",
      customerName: "Acme Cash LLC",
      transactionDate: "2026-06-28",
      cashIn: 15000,
      aggregateUsd: 15000,
      accountNumber: "****1234",
      tin: "12-3456789",
    });
    expect(doc.reportType).toBe("CTR_US");
    expect(doc.templateId).toBe("RPT-CTR-US-001");
    expect(doc.sections.find((s) => s.id === "aggregateUsd")?.value).toContain("15,000");
  });

  it("evaluates CTR compliance — blocks below threshold", () => {
    const doc = buildCtrDocument({
      obligationId: "ctr_low",
      customerId: "US-002",
      customerName: "Low Cash",
      transactionDate: "2026-06-28",
      aggregateUsd: 5000,
    });
    const result = evaluateCtrCompliance(doc.sections);
    expect(result.blockers.some((b) => b.includes("10,000"))).toBe(true);
  });

  it("maps CTR draft to FinCEN Form 104 payload", () => {
    const doc = buildCtrDocument({
      obligationId: "ctr_payload",
      customerId: "US-003",
      customerName: "Payload Test Inc",
      transactionDate: "2026-06-28",
      cashIn: 11000,
      aggregateUsd: 11000,
      tin: "98-7654321",
      accountNumber: "ACC-99",
    });
    const payload = buildFincenCtrPayload(doc, "fil_ctr");
    expect(payload.form).toBe("104");
    expect(payload.system).toBe("FinCEN");
    expect(payload.subject.taxId).toBe("98-7654321");
    expect(payload.amounts.aggregateUsd).toContain("11,000");
  });

  it("computes 15-day CTR due date", () => {
    const txn = new Date("2026-06-01T12:00:00Z");
    const due = ctrDueDate(txn);
    expect(due.getDate()).toBe(16);
    expect(due.getMonth()).toBe(5);
  });

  it("uses FinCEN CTR threshold constant", () => {
    expect(CTR_THRESHOLD_USD).toBe(10_000);
  });
});
