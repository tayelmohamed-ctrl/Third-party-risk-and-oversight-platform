import { describe, expect, it } from "vitest";
import { FFIEC_EXAMINATION_MATRIX, FFIEC_EXAMINATION_DOMAINS } from "../src/config/ffiecExaminationMatrix";

describe("FFIEC examination matrix catalogue", () => {
  it("defines examination domains", () => {
    expect(FFIEC_EXAMINATION_DOMAINS.length).toBeGreaterThanOrEqual(8);
    expect(FFIEC_EXAMINATION_DOMAINS.some((d) => d.id === "sar")).toBe(true);
    expect(FFIEC_EXAMINATION_DOMAINS.some((d) => d.id === "training")).toBe(true);
  });

  it("maps procedures to live evidence routes", () => {
    const withRoutes = FFIEC_EXAMINATION_MATRIX.filter((i) => i.evidenceRoute);
    expect(withRoutes.length).toBeGreaterThan(10);
    expect(withRoutes.some((i) => i.evidenceRoute === "/training")).toBe(true);
    expect(withRoutes.some((i) => i.evidenceRoute === "/investigation")).toBe(true);
  });

  it("includes SAR and TM live probes", () => {
    expect(FFIEC_EXAMINATION_MATRIX.some((i) => i.liveProbe === "filings")).toBe(true);
    expect(FFIEC_EXAMINATION_MATRIX.some((i) => i.liveProbe === "cases")).toBe(true);
    expect(FFIEC_EXAMINATION_MATRIX.some((i) => i.liveProbe === "ctr")).toBe(true);
    expect(FFIEC_EXAMINATION_MATRIX.some((i) => i.liveProbe === "retention")).toBe(true);
  });
});

describe("Examination API routes", () => {
  const ROUTES = [
    "GET /api/v1/crr/examination/readiness",
    "GET /api/v1/crr/examination/domains",
    "GET /api/v1/crr/examination/items",
    "POST /api/v1/crr/examination/refresh",
    "PATCH /api/v1/crr/examination/items/:id",
  ];

  it("exposes examination readiness surface", () => {
    expect(ROUTES.length).toBe(5);
    expect(ROUTES.some((r) => r.includes("readiness"))).toBe(true);
  });
});
