import { describe, expect, it } from "vitest";
import {
  deriveCaseStatus, mapAdverse, mapPep, mapSanctions, mapWatchlist,
  normalizeVital4Webhook, slaDueAtForStatus,
} from "../server/screening/normalize";
import {
  PHASE0_COMPLETE, SCREENING_AUTHORITY, SCREENING_SLA, AIPRISE_JURISDICTIONS,
} from "../src/config/partnerIntegration";

describe("Phase 0 — partner integration config", () => {
  it("marks phase 0 complete with Vital4 as sole screening writer", () => {
    expect(PHASE0_COMPLETE).toBe(true);
    expect(SCREENING_AUTHORITY.sanctions).toBe("vital4");
    expect(SCREENING_AUTHORITY.shuftiAmlIgnored).toBe(true);
    expect(SCREENING_AUTHORITY.oscilarTxnScreeningMirror).toBe("vital4");
  });

  it("defines 10 AiPrise jurisdictions", () => {
    expect(AIPRISE_JURISDICTIONS).toHaveLength(10);
    expect(AIPRISE_JURISDICTIONS.map((j) => j.code)).toContain("AE");
  });

  it("SLA matches sign-off doc", () => {
    expect(SCREENING_SLA.potentialMatchHours).toBe(4);
    expect(SCREENING_SLA.pendingHours).toBe(48);
  });
});

describe("Vital4 normalization", () => {
  it("maps sanctions true match", () => {
    expect(mapSanctions("true_match")).toBe("True Match");
    expect(mapSanctions("confirmed")).toBe("True Match");
  });

  it("maps PEP foreign", () => {
    expect(mapPep("foreign")).toBe("Foreign");
    expect(mapPep("clear")).toBe("None");
  });

  it("maps adverse potential", () => {
    expect(mapAdverse("potential_match")).toBe("Potential");
  });

  it("maps watchlist hit", () => {
    expect(mapWatchlist("hit")).toBe("True Match");
  });

  it("derives true_match status for sanctions hit", () => {
    const status = deriveCaseStatus("True Match", "None", "None", "Clear");
    expect(status).toBe("true_match");
  });

  it("derives potential for sanctions potential match", () => {
    const status = deriveCaseStatus("Potential Match", "None", "None", "Clear");
    expect(status).toBe("potential");
  });

  it("normalizes full Vital4 webhook payload", () => {
    const result = normalizeVital4Webhook({
      event_id: "ev-1",
      event_type: "screening.completed",
      case_id: "V4-123",
      status: "completed",
      results: {
        sanctions: "clear",
        pep: "foreign",
        adverse_media: "none",
        watchlist: "clear",
      },
      timestamp: new Date().toISOString(),
    });
    expect(result.vendorCaseId).toBe("V4-123");
    expect(result.snapshot.pep).toBe("Foreign");
    expect(result.status).toBe("potential");
  });

  it("sets 4h SLA for potential status", () => {
    const from = new Date("2026-06-01T10:00:00Z");
    const due = slaDueAtForStatus("potential", from)!;
    expect(due.getTime() - from.getTime()).toBe(4 * 60 * 60 * 1000);
  });
});

describe("Vital4 client mock mode", () => {
  it("detects mock when API key absent", async () => {
    const { isVital4MockMode } = await import("../server/integrations/vital4/client");
    const prev = process.env.VITAL4_API_KEY;
    delete process.env.VITAL4_API_KEY;
    expect(isVital4MockMode()).toBe(true);
    if (prev) process.env.VITAL4_API_KEY = prev;
  });
});
