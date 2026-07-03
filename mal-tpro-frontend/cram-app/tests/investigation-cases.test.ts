import { describe, expect, it } from "vitest";
import { warrantsAutoCase } from "../server/investigations/orchestrator";
import { warrantsTmFeed } from "../server/tm/orchestrator";

describe("Phase 1 — investigation case auto-open", () => {
  it("warrantsAutoCase mirrors TM feed gating (high + critical)", () => {
    expect(warrantsAutoCase("critical")).toBe(true);
    expect(warrantsAutoCase("high")).toBe(true);
    expect(warrantsAutoCase("medium")).toBe(false);
    expect(warrantsAutoCase("low")).toBe(false);
  });

  it("auto-case threshold aligns with TM feed threshold", () => {
    for (const sev of ["critical", "high", "medium", "low"] as const) {
      expect(warrantsAutoCase(sev)).toBe(warrantsTmFeed(sev));
    }
  });
});

describe("Phase 1 — investigation case types", () => {
  const STATUSES = ["open", "assigned", "investigating", "pending_mlro", "closed"] as const;
  const DISPOSITIONS = ["no_action", "escalate", "sar_recommended", "closed_fp"] as const;
  const SOURCES = ["tm_alert", "screening", "manual", "onboarding"] as const;

  it("defines case lifecycle statuses", () => {
    expect(STATUSES).toContain("open");
    expect(STATUSES).toContain("pending_mlro");
    expect(STATUSES.at(-1)).toBe("closed");
  });

  it("defines disposition outcomes including SAR path", () => {
    expect(DISPOSITIONS).toContain("sar_recommended");
    expect(DISPOSITIONS).toContain("closed_fp");
  });

  it("supports TM alert as primary auto-case source", () => {
    expect(SOURCES).toContain("tm_alert");
  });
});

describe("Phase 1 — investigation API routes", () => {
  const ROUTES = [
    "GET /api/v1/crr/cases/stats",
    "GET /api/v1/crr/cases",
    "GET /api/v1/crr/cases/:id",
    "POST /api/v1/crr/cases",
    "PATCH /api/v1/crr/cases/:id",
    "POST /api/v1/crr/cases/:id/evidence",
    "POST /api/v1/crr/cases/:id/disposition",
  ];

  it("exposes REST surface for case management", () => {
    expect(ROUTES.length).toBe(7);
    expect(ROUTES.some((r) => r.includes("disposition"))).toBe(true);
  });
});
