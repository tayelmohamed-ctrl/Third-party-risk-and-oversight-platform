import type { Express, Request, Response } from "express";
import { verifyVital4Webhook, isReplay } from "../integrations/vital4/webhookAuth";
import {
  disposeScreeningCase, getCustomerScreeningHistory, getScreeningCase, getScreeningQueue,
  handleVital4Webhook, initiateScreening, isSlaBreached,
} from "../screening/orchestrator";
import type { DispositionRequest, InitiateScreeningRequest, Vital4WebhookPayload } from "../screening/types";
import { onboardingIntegrationMeta } from "./onboarding";
import { tmIntegrationMeta } from "./tm";
import { requireCapability } from "../auth/rbac";
import { appendAudit } from "../db/auditStore";

/** Webhook routes — mounted BEFORE auth middleware. */
export function registerWebhookRoutes(app: Express) {
  app.post("/webhooks/vital4", async (req: Request, res: Response) => {
    const rawBody = JSON.stringify(req.body);
    if (!verifyVital4Webhook(req, rawBody)) {
      res.status(401).json({ error: "invalid signature" });
      return;
    }

    const payload = req.body as Vital4WebhookPayload;
    if (isReplay(payload.timestamp)) {
      res.status(400).json({ error: "replay rejected" });
      return;
    }

    const result = await handleVital4Webhook(payload);
    if (result.duplicate) {
      res.status(200).json({ ok: true, duplicate: true });
      return;
    }
    if (!result.ok) {
      res.status(422).json({ error: result.error });
      return;
    }
    res.status(200).json({ ok: true, caseId: result.case?.id });
  });
}

/** Authenticated screening API — mounted AFTER auth middleware. */
export function registerScreeningRoutes(app: Express) {
  app.post("/api/v1/crr/screening/initiate", async (req, res) => {
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

    const body = req.body as InitiateScreeningRequest;
    if (!body?.customerId || !body?.customerName || !body?.subject?.fullName) {
      res.status(400).json({ error: "customerId, customerName, subject.fullName required" });
      return;
    }

    try {
      const record = await initiateScreening(
        {
          ...body,
          licenseRegion: body.licenseRegion ?? "UAE",
        },
        req.user.email,
      );
      res.status(201).json(record);
    } catch (e) {
      res.status(502).json({ error: String(e) });
    }
  });

  app.get("/api/v1/crr/screening/queue", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const cases = await getScreeningQueue();
    res.json({
      count: cases.length,
      breached: cases.filter(isSlaBreached).length,
      cases,
    });
  });

  app.get("/api/v1/crr/screening/customer/:customerId", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const history = await getCustomerScreeningHistory(req.params.customerId);
    res.json({ customerId: req.params.customerId, cases: history, latest: history[0] ?? null });
  });

  app.get("/api/v1/crr/screening/:caseId", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const record = await getScreeningCase(req.params.caseId);
    if (!record) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(record);
  });

  app.post("/api/v1/crr/screening/:caseId/disposition", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    try {
      requireCapability(req.user.roles, "review");
    } catch (e) {
      res.status(403).json({ error: (e as Error).message });
      return;
    }

    const body = req.body as DispositionRequest;
    if (!body?.disposition || !["clear", "false_positive", "true_match"].includes(body.disposition)) {
      res.status(400).json({ error: "disposition must be clear | false_positive | true_match" });
      return;
    }

    const updated = await disposeScreeningCase(req.params.caseId, body, req.user.email);
    if (!updated) {
      res.status(404).json({ error: "case not found" });
      return;
    }

    await appendAudit({
      actor: req.user.email,
      action: "screening.disposition.api",
      entity: "screening_case",
      entityId: updated.id,
      detail: `${body.disposition} by ${req.user.email}`,
    });

    res.json(updated);
  });

  app.get("/api/v1/crr/integrations/status", async (_req, res) => {
    res.json({
      phase0Complete: true,
      phase: "2",
      screeningAuthority: "vital4",
      vital4Mode: process.env.VITAL4_API_KEY ? "live" : "mock",
      ...onboardingIntegrationMeta(),
      ...tmIntegrationMeta(),
    });
  });
}
