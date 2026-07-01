import { describe, expect, it } from "vitest";
import {
  normalizeOscilarWebhook, requiresVital4Mirror, buildHeadline, toFeedEventId,
} from "../server/integrations/oscilar/normalize";
import { oscilarMockWebhookPayload, isOscilarMockMode, buildOscilarAlertId } from "../server/integrations/oscilar/client";
import { warrantsTmFeed } from "../server/tm/orchestrator";
import { SCREENING_AUTHORITY } from "../src/config/partnerIntegration";

describe("Phase 2 — Oscilar normalize", () => {
  it("detects mock mode when API key absent", () => {
    const prev = process.env.OSCILAR_API_KEY;
    delete process.env.OSCILAR_API_KEY;
    expect(isOscilarMockMode()).toBe(true);
    if (prev) process.env.OSCILAR_API_KEY = prev;
  });

  it("builds vendor-scoped alert id", () => {
    expect(buildOscilarAlertId("ACT001")).toMatch(/^OS-ACT001-/);
  });

  it("requires Vital4 mirror for txn screening and list hits", () => {
    expect(SCREENING_AUTHORITY.oscilarTxnScreeningMirror).toBe("vital4");
    expect(requiresVital4Mirror({ alert_type: "transaction_screening" })).toBe(true);
    expect(requiresVital4Mirror({ alert_type: "transaction_monitoring", list_hit: true })).toBe(true);
    expect(requiresVital4Mirror({ alert_type: "transaction_monitoring", sanctions_signal: "potential_match" })).toBe(true);
    expect(requiresVital4Mirror({ alert_type: "transaction_monitoring" })).toBe(false);
  });

  it("normalizes webhook payload with headline", () => {
    const payload = oscilarMockWebhookPayload({
      customerId: "ACT00005",
      customerName: "Omar Khalid",
      listHit: true,
    });
    const n = normalizeOscilarWebhook(payload, "ACT00005", "Omar Khalid");
    expect(n.alertId).toBe(payload.alert_id);
    expect(n.listHit).toBe(true);
    expect(n.requiresVital4Mirror).toBe(true);
    expect(n.headline).toMatch(/list hit/i);
  });

  it("builds stable feed event id from alert id", () => {
    expect(toFeedEventId("OS-ACT001-abc")).toBe("oscilar-OS-ACT001-abc");
  });

  it("buildHeadline includes rule and severity", () => {
    const h = buildHeadline({
      ruleName: "Round-amount layering",
      ruleId: "OS-TM-003",
      severity: "high",
      channel: "transfer",
      amount: 200000,
      currency: "AED",
      listHit: false,
    });
    expect(h).toMatch(/Round-amount/);
    expect(h).toMatch(/high/i);
  });
});

describe("Phase 2 — TM feed gating", () => {
  it("warrants feed for high and critical only", () => {
    expect(warrantsTmFeed("critical")).toBe(true);
    expect(warrantsTmFeed("high")).toBe(true);
    expect(warrantsTmFeed("medium")).toBe(false);
    expect(warrantsTmFeed("low")).toBe(false);
  });
});
