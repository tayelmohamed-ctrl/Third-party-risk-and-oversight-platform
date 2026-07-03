import type { Express, Request, Response } from "express";
import { verifyShuftiWebhook } from "../integrations/shuftipro/webhookAuth";
import { isShuftiMockMode } from "../integrations/shuftipro/client";
import { requireCapability } from "../auth/rbac";
import {
  getLatestOnboarding, getOnboardingCase, getPartnerSync, getActiveOnboardingCases,
  getRecentOnboardingCases, handleShuftiWebhook, startOnboarding,
} from "../onboarding/orchestrator";
import type { StartOnboardingRequest, ShuftiWebhookPayload } from "../onboarding/types";

export function registerOnboardingWebhookRoutes(app: Express) {
  app.post("/webhooks/shuftipro", async (req: Request, res: Response) => {
    const rawBody = JSON.stringify(req.body);
    if (!verifyShuftiWebhook(req, rawBody)) {
      res.status(401).json({ error: "invalid signature" });
      return;
    }

    const payload = req.body as ShuftiWebhookPayload;
    if (!payload.reference) {
      res.status(400).json({ error: "reference required" });
      return;
    }

    const result = await handleShuftiWebhook(payload);
    if (!result) {
      res.status(404).json({ error: "onboarding case not found for reference" });
      return;
    }
    res.status(200).json({ ok: true, onboardingCaseId: result.id, state: result.state });
  });
}

export function registerOnboardingRoutes(app: Express) {
  app.post("/api/v1/crr/onboarding/start", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    try {
      requireCapability(req.user.roles, "score");
    } catch (e) {
      res.status(403).json({ error: (e as Error).message });
      return;
    }

    const body = req.body as StartOnboardingRequest;
    if (!body?.customerId || !body?.customerName || !body?.subject?.fullName) {
      res.status(400).json({ error: "customerId, customerName, subject.fullName required" });
      return;
    }

    try {
      const record = await startOnboarding(
        {
          ...body,
          licenseRegion: body.licenseRegion ?? "UAE",
          mode: body.mode ?? "individual",
        },
        req.user.email,
      );
      res.status(201).json(record);
    } catch (e) {
      res.status(502).json({ error: String(e) });
    }
  });

  app.get("/api/v1/crr/onboarding/active", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const cases = await getActiveOnboardingCases();
    res.json({ count: cases.length, cases });
  });

  app.get("/api/v1/crr/onboarding/recent", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const cases = await getRecentOnboardingCases();
    res.json({ count: cases.length, cases });
  });

  app.get("/api/v1/crr/onboarding/customer/:customerId", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const latest = await getLatestOnboarding(req.params.customerId);
    res.json({ customerId: req.params.customerId, latest });
  });

  app.get("/api/v1/crr/onboarding/customer/:customerId/partner-sync", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const sync = await getPartnerSync(req.params.customerId);
    if (!sync) {
      res.status(404).json({ error: "no onboarding case" });
      return;
    }
    res.json(sync);
  });

  app.get("/api/v1/crr/onboarding/:caseId", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const record = await getOnboardingCase(req.params.caseId);
    if (!record) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(record);
  });
}

/** Extend integrations status for Phase 1b. */
export function onboardingIntegrationMeta() {
  return {
    phase: "2",
    shuftiMode: isShuftiMockMode() ? "mock" : "live",
    webhookEndpoints: ["/webhooks/vital4", "/webhooks/shuftipro", "/webhooks/oscilar"],
    onboardingEndpoints: [
      "POST /api/v1/crr/onboarding/start",
      "GET /api/v1/crr/onboarding/active",
      "GET /api/v1/crr/onboarding/customer/:id/partner-sync",
    ],
    screeningEndpoints: [
      "GET /api/v1/crr/screening/queue",
      "POST /api/v1/crr/screening/:caseId/disposition",
    ],
  };
}
