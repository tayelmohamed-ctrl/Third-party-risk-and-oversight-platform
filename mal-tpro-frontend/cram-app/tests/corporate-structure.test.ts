import { describe, expect, it } from "vitest";
import { buildEntityStructureGraph, layoutStructureGraph } from "../src/engine/corporateStructureGraph";
import type { EntityStructureInput } from "../src/engine/corporateStructureGraph";

const baseInput = (): EntityStructureInput => ({
  customerId: "ACT00099",
  customerName: "Gulf Trading LLC",
  entityType: "Limited Liability Company (LLC)",
  segment: "SME",
  lifecycle: "Existing",
  ownership: "Direct — 1 layer",
  uboStatus: "verified",
  uboCountry: "United Arab Emirates",
  incorpCountry: "United Arab Emirates",
  opcoCountry: "United Arab Emirates",
  pep: "None",
  sanctions: "Clear",
  watchlist: "Clear",
  adverse: "None",
  kyc: {
    identitySource: "emirates_id",
    identityVerified: true,
    documentIssuedAt: "2022-01-01",
    lastKycRefreshAt: "2025-06-01",
    screeningCompletedAt: new Date().toISOString(),
    livenessPass: true,
  },
});

describe("Corporate structure graph", () => {
  it("builds direct ownership with one UBO", () => {
    const g = buildEntityStructureGraph(baseInput());
    expect(g.nodes.some((n) => n.customerEntity)).toBe(true);
    expect(g.nodes.filter((n) => n.kind === "person")).toHaveLength(1);
    expect(g.edges.some((e) => e.kind === "BENEFICIAL_OWNER_OF")).toBe(true);
  });

  it("hides collapsed node and upstream owners", () => {
    const g = buildEntityStructureGraph({ ...baseInput(), ownership: "3+ layers (complex)" });
    const laid = layoutStructureGraph(g, new Set(["holding-1"]));
    expect(laid.nodes.some((n) => n.id === "holding-1")).toBe(false);
    expect(laid.nodes.some((n) => n.id === "parent-1")).toBe(false);
    expect(laid.nodes.some((n) => n.id === "customer")).toBe(true);
  });

  it("does not expose scoring fields — evidence only", () => {
    const g = buildEntityStructureGraph(baseInput());
    expect(JSON.stringify(g)).not.toMatch(/composite|contribution|override/i);
  });

  it("expands UBO external company network for complex ownership", () => {
    const g = buildEntityStructureGraph({ ...baseInput(), ownership: "3+ layers (complex)" });
    expect(g.networkScan.enabled).toBe(true);
    expect(g.networkScan.totalExternalCompanies).toBeGreaterThan(0);
    expect(g.nodes.some((n) => n.externalHolding)).toBe(true);
    expect(g.edges.some((e) => e.from.startsWith("ubo-") && e.to.startsWith("ext-"))).toBe(true);
  });

  it("surfaces OSINT hits on linked external companies", () => {
    const g = buildEntityStructureGraph({ ...baseInput(), ownership: "3+ layers (complex)" });
    const withHits = g.nodes.filter((n) => n.externalHolding && (n.onlineHits?.length ?? 0) > 0);
    expect(withHits.length).toBeGreaterThan(0);
    expect(g.networkScan.highSeverityHits).toBeGreaterThan(0);
  });

  it("adds screening-driven network expansion on adverse media", () => {
    const g = buildEntityStructureGraph({ ...baseInput(), adverse: "True Match" });
    expect(g.networkScan.totalHits).toBeGreaterThan(0);
  });
});
