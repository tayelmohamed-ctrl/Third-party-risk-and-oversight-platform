import type { Express, Request, Response } from "express";
import { verifyOscilarWebhook, isOscilarReplay } from "../integrations/oscilar/webhookAuth";
import { oscilarMockWebhookPayload } from "../integrations/oscilar/client";
import { requireCapability } from "../auth/rbac";
import { appendAudit } from "../db/auditStore";
import {
  getCustomerTmAlerts, getTmAlert, getTmAlertQueue, handleOscilarWebhook, tmIntegrationMeta,
} from "../tm/orchestrator";
import type { OscilarWebhookPayload, SimulateOscilarAlertRequest } from "../tm/types";

/** Oscilar webhook — mounted BEFORE auth middleware. */
export function registerOscilarWebhookRoutes(app: Express) {
  app.post("/webhooks/oscilar", async (req: Request, res: Response) => {
    const rawBody = JSON.stringify(req.body);
    if (!verifyOscilarWebhook(req, rawBody)) {
      res.status(401).json({ error: "invalid signature" });
      return;
    }

    const payload = req.body as OscilarWebhookPayload;
    if (isOscilarReplay(payload.timestamp)) {
      res.status(400).json({ error: "replay rejected" });
      return;
    }

    const result = await handleOscilarWebhook(payload);
    if (result.duplicate) {
      res.status(200).json({ ok: true, duplicate: true, alertId: result.alert?.id });
      return;
    }
    if (!result.ok) {
      res.status(422).json({ error: result.error });
      return;
    }
    res.status(200).json({ ok: true, alertId: result.alert?.id });
  });
}

/** Authenticated TM API — mounted AFTER auth middleware. */
export function registerTmRoutes(app: Express) {
  app.get("/api/v1/crr/tm/alerts", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const alerts = await getTmAlertQueue();
    res.json({
      count: alerts.length,
      open: alerts.filter((a) => a.status === "open" || a.status === "mirrored").length,
      mirrored: alerts.filter((a) => a.vital4CaseId).length,
      alerts,
    });
  });

  app.get("/api/v1/crr/tm/alerts/:id", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const alert = await getTmAlert(req.params.id);
    if (!alert) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(alert);
  });

  app.get("/api/v1/crr/tm/customer/:customerId", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const alerts = await getCustomerTmAlerts(req.params.customerId);
    res.json({ customerId: req.params.customerId, count: alerts.length, alerts });
  });

  app.post("/api/v1/crr/tm/simulate", async (req, res) => {
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

    const body = req.body as SimulateOscilarAlertRequest;
    if (!body?.customerId || !body?.customerName) {
      res.status(400).json({ error: "customerId, customerName required" });
      return;
    }

    const payload = oscilarMockWebhookPayload(body);
    const result = await handleOscilarWebhook(payload);
    if (!result.ok) {
      res.status(422).json({ error: result.error });
      return;
    }

    await appendAudit({
      actor: req.user.email,
      action: "tm.simulate",
      entity: "tm_alert",
      entityId: result.alert?.id ?? "unknown",
      detail: `Simulated Oscilar alert for ${body.customerName} (${body.customerId})`,
    });

    res.status(201).json(result.alert);
  });
}

export { tmIntegrationMeta };
