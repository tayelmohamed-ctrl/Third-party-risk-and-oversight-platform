import { describe, expect, it } from "vitest";
import {
  RETENTION_CLASS_POLICIES,
  EVIDENCE_EXPORT_POLICIES,
  computeDisposition,
  retentionUntil,
  exportPolicyById,
  policyForClass,
} from "../src/config/retentionPolicy";
import { matchingHoldIds } from "../server/retention/legalHold";
import type { LegalHoldRecord } from "../server/retention/types";

describe("retention policy", () => {
  it("defines 5-year STR/SAR/CTR retention classes", () => {
    expect(RETENTION_CLASS_POLICIES.some((p) => p.class === "filing_submission")).toBe(true);
    expect(RETENTION_CLASS_POLICIES.some((p) => p.class === "ctr_obligation")).toBe(true);
    const filing = policyForClass("filing_submission");
    expect(filing?.retentionYears).toBe(5);
    expect(filing?.immutable).toBe(true);
  });

  it("computes retention end date", () => {
    const anchor = new Date("2021-06-01T12:00:00Z");
    const end = retentionUntil(anchor, 5);
    expect(end.getFullYear()).toBe(2026);
  });

  it("marks records on legal hold", () => {
    const end = retentionUntil(new Date("2020-01-01"), 5);
    expect(computeDisposition(end, true)).toBe("on_hold");
    expect(computeDisposition(end, false, new Date("2026-01-01"))).toBe("eligible_archive");
  });

  it("defines governed export policies with capability gates", () => {
    expect(EVIDENCE_EXPORT_POLICIES.length).toBeGreaterThanOrEqual(4);
    const customerPack = exportPolicyById("EXP-CUSTOMER-PACK");
    expect(customerPack?.mlroApprovalRequired).toBe(true);
    expect(customerPack?.requiredCapability).toBe("approve_high");
  });
});

describe("legal hold matching", () => {
  const holds: LegalHoldRecord[] = [
    {
      id: "hold_1",
      scopeType: "customer",
      scopeId: "CUST-1",
      customerId: "CUST-1",
      reason: "Exam",
      matterRef: null,
      placedBy: "mlro",
      placedAt: new Date().toISOString(),
      releasedBy: null,
      releasedAt: null,
      status: "active",
      metadata: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  it("matches customer-scoped holds", () => {
    const ids = matchingHoldIds(holds, { customerId: "CUST-1" });
    expect(ids).toContain("hold_1");
    expect(matchingHoldIds(holds, { customerId: "OTHER" })).toHaveLength(0);
  });
});

describe("retention API routes", () => {
  const ROUTES = [
    "GET /api/v1/crr/retention/stats",
    "GET /api/v1/crr/retention/records",
    "POST /api/v1/crr/retention/run",
    "GET /api/v1/crr/retention/legal-holds",
    "POST /api/v1/crr/retention/legal-holds",
    "POST /api/v1/crr/retention/exports",
  ];

  it("documents retention surface", () => {
    expect(ROUTES.length).toBe(6);
  });
});
