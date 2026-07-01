import { describe, expect, it } from "vitest";
import { isSlaBreached, slaRemaining, onboardingStateLabel } from "../src/lib/screeningUi";
import type { ScreeningCaseRecord } from "../src/lib/api";

function mockCase(overrides: Partial<ScreeningCaseRecord> = {}): ScreeningCaseRecord {
  return {
    id: "scr_1",
    customerId: "ACT001",
    customerName: "Test",
    vendor: "vital4",
    vendorCaseId: "V4-1",
    screeningType: "bundle",
    status: "potential",
    licenseRegion: "UAE",
    sanctions: "Potential Match",
    pep: "None",
    adverse: "None",
    watchlist: "Clear",
    disposition: "pending",
    dispositionNotes: null,
    disposedBy: null,
    disposedAt: null,
    slaDueAt: new Date(Date.now() + 2 * 3_600_000).toISOString(),
    mirrorSource: null,
    oscilarAlertId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("Phase 1c — screening UI helpers", () => {
  it("detects SLA breach", () => {
    const ok = mockCase({ slaDueAt: new Date(Date.now() + 60_000).toISOString() });
    expect(isSlaBreached(ok)).toBe(false);
    const late = mockCase({ slaDueAt: new Date(Date.now() - 60_000).toISOString() });
    expect(isSlaBreached(late)).toBe(true);
  });

  it("ignores SLA when disposition not pending", () => {
    const done = mockCase({
      disposition: "clear",
      slaDueAt: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(isSlaBreached(done)).toBe(false);
  });

  it("formats SLA remaining", () => {
    const r = slaRemaining(new Date(Date.now() + 90 * 60_000).toISOString());
    expect(r.breached).toBe(false);
    expect(r.label).toMatch(/h|m/);
  });

  it("labels onboarding states", () => {
    expect(onboardingStateLabel("DISPOSITION_REQUIRED")).toBe("Disposition Required");
  });
});
