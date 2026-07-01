import type { Express } from "express";
import { requireCapability } from "../auth/rbac";
import {
  createCtrFilingDraft,
  ctrStats,
  findCtrById,
  listCtrObligations,
  registerCtrObligation,
} from "../ctr/orchestrator";
import { ctrDueDate } from "../../src/config/fincenCtrGuidance";

export function registerCtrRoutes(app: Express) {
  app.get("/api/v1/crr/ctr/stats", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    res.json(await ctrStats());
  });

  app.get("/api/v1/crr/ctr/obligations", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const obligations = await listCtrObligations({ status });
    res.json({ count: obligations.length, obligations });
  });

  app.get("/api/v1/crr/ctr/obligations/:id", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const row = await findCtrById(req.params.id);
    if (!row) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(row);
  });

  app.post("/api/v1/crr/ctr/obligations", async (req, res) => {
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

    const body = req.body as {
      customerId?: string;
      customerName?: string;
      transactionDate?: string;
      cashIn?: number;
      cashOut?: number;
      aggregateUsd?: number;
      channel?: string;
      accountNumber?: string;
      tin?: string;
      branchLocation?: string;
    };

    if (!body.customerId || !body.customerName || !body.transactionDate || body.aggregateUsd == null) {
      res.status(400).json({ error: "customerId, customerName, transactionDate, aggregateUsd required" });
      return;
    }

    const txnDate = new Date(body.transactionDate);
    const created = await registerCtrObligation({
      customerId: body.customerId,
      customerName: body.customerName,
      transactionDate: body.transactionDate,
      cashIn: body.cashIn,
      cashOut: body.cashOut,
      aggregateUsd: body.aggregateUsd,
      channel: body.channel,
      accountNumber: body.accountNumber,
      tin: body.tin,
      branchLocation: body.branchLocation,
      licenseRegion: "US",
      dueAt: ctrDueDate(txnDate),
    }, req.user.email);

    res.status(201).json(created);
  });

  app.post("/api/v1/crr/ctr/obligations/:id/create-draft", async (req, res) => {
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

    const result = await createCtrFilingDraft(req.params.id, req.user.email);
    if (!result) {
      res.status(404).json({ error: "obligation not found" });
      return;
    }
    res.status(201).json(result);
  });
}
