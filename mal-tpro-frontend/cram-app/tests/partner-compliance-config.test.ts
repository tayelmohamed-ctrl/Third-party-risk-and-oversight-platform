import { describe, expect, it } from "vitest";
import {
  REGISTER_KEYS,
  emptyRegisters,
  registerKeyForReport,
  normalizeAgentSlice,
  schemaFor,
  REPORT_TYPES,
  DD_ITEMS,
  reportFormReady,
  buildReportSummary,
  exportPartnerSchemaPack,
} from "../partner/partnerComplianceConfig.js";

describe("partnerComplianceConfig", () => {
  it("initializes all register keys", () => {
    const reg = emptyRegisters();
    expect(Object.keys(reg).sort()).toEqual([...REGISTER_KEYS].sort());
    REGISTER_KEYS.forEach((k) => expect(reg[k]).toEqual([]));
  });

  it("routes report types to dedicated registers", () => {
    expect(registerKeyForReport("subpoena")).toBe("subpoena");
    expect(registerKeyForReport("interdiction")).toBe("interdiction");
    expect(registerKeyForReport("periodic_review")).toBe("periodic_review");
    expect(registerKeyForReport("unknown")).toBe("correspondence");
  });

  it("normalizes legacy agent slices with missing registers and DD items", () => {
    const slice = normalizeAgentSlice({
      registers: { sar: [{ ref: "SAR-1" }] },
      dd: { onboarding: "Complete" },
    });
    expect(slice.registers.sar).toHaveLength(1);
    expect(slice.registers.subpoena).toEqual([]);
    expect(slice.dd.amlProgram).toBe("Outstanding");
  });

  it("includes compliance monitoring fields in every category schema", () => {
    const keys = schemaFor("Payout partners").flatMap((s) => s.fields.map((f) => f.k));
    expect(keys).toContain("mlroName");
    expect(keys).toContain("strCapability");
    expect(keys).toContain("subpoenaNotifyAttest");
    expect(keys).toContain("interdictionAttest");
    expect(keys).toContain("periodicReviewCadence");
  });

  it("includes System integrator category fields", () => {
    const keys = schemaFor("System integrator").flatMap((s) => s.fields.map((f) => f.k));
    expect(keys).toContain("goLiveGatesAttest");
  });

  it("covers monitoring report types and DD checklist items", () => {
    const ids = REPORT_TYPES.map((t) => t.id);
    expect(ids).toContain("subpoena");
    expect(ids).toContain("interdiction");
    expect(ids).toContain("periodic_review");
    expect(DD_ITEMS.map((d) => d.id)).toContain("subpoenaPlaybook");
    expect(DD_ITEMS.map((d) => d.id)).toContain("sanctionsInterdiction");
  });

  it("validates structured report submissions", () => {
    expect(reportFormReady("subpoena", { summary: "Legal notice received" })).toBe(false);
    expect(
      reportFormReady("subpoena", {
        summary: "Legal notice received",
        receivedDate: "2026-06-01",
        issuingAuthority: "District Court",
        malDataScope: "Mal customers",
        responseDeadline: "2026-06-15",
        legalCounselEngaged: "Y",
      }),
    ).toBe(true);
    const summary = buildReportSummary("subpoena", {
      subject: "SUB-001",
      summary: "Subpoena received",
      receivedDate: "2026-06-01",
      issuingAuthority: "District Court",
    });
    expect(summary).toContain("SUB-001");
    expect(summary).toContain("Subpoena received");
  });

  it("exports shareable partner DD pack", () => {
    const pack = exportPartnerSchemaPack("Banking partner");
    expect(pack.category).toBe("Banking partner");
    expect(pack.intakeSections.length).toBeGreaterThan(5);
    expect(pack.ddChecklist.length).toBeGreaterThan(10);
    expect(pack.reportingTypes.some((t: { id: string }) => t.id === "str")).toBe(true);
  });
});
