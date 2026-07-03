import type { Express } from "express";
import { requireCapability } from "../auth/rbac";
import {
  computeRetentionStats,
  createLegalHold,
  listExportPolicies,
  listExportRuns,
  listLegalHolds,
  listRetentionRuns,
  releaseLegalHold,
  runEvidenceExport,
  runRetentionScheduler,
  scanRetentionRegistry,
  RETENTION_CLASS_POLICIES,
} from "../retention/orchestrator";
import type { CreateExportInput, CreateLegalHoldInput } from "../retention/types";

export function registerRetentionRoutes(app: Express) {
  app.get("/api/v1/crr/retention/policies", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    res.json({
      retentionClasses: RETENTION_CLASS_POLICIES,
      exportPolicies: listExportPolicies(),
    });
  });

  app.get("/api/v1/crr/retention/stats", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    res.json(await computeRetentionStats());
  });

  app.get("/api/v1/crr/retention/records", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    try {
      requireCapability(req.user.roles, "read_audit");
    } catch (e) {
      res.status(403).json({ error: (e as Error).message });
      return;
    }
    const customerId = typeof req.query.customerId === "string" ? req.query.customerId : undefined;
    const disposition = typeof req.query.disposition === "string" ? req.query.disposition : undefined;
    const records = await scanRetentionRegistry({ customerId, disposition, limit: 300 });
    res.json({ count: records.length, records });
  });

  app.get("/api/v1/crr/retention/runs", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    res.json({ runs: await listRetentionRuns() });
  });

  app.post("/api/v1/crr/retention/run", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    try {
      requireCapability(req.user.roles, "scheduler_run");
    } catch (e) {
      res.status(403).json({ error: (e as Error).message });
      return;
    }
    const result = await runRetentionScheduler(req.user.email);
    res.json(result);
  });

  app.get("/api/v1/crr/retention/legal-holds", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const holds = await listLegalHolds(status ? { status } : undefined);
    res.json({ count: holds.length, holds });
  });

  app.post("/api/v1/crr/retention/legal-holds", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    try {
      requireCapability(req.user.roles, "approve_high");
    } catch (e) {
      res.status(403).json({ error: (e as Error).message });
      return;
    }
    const body = req.body as CreateLegalHoldInput;
    if (!body?.scopeType || !body?.reason) {
      res.status(400).json({ error: "scopeType and reason required" });
      return;
    }
    const created = await createLegalHold(body, req.user.email);
    res.status(201).json(created);
  });

  app.post("/api/v1/crr/retention/legal-holds/:id/release", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    try {
      requireCapability(req.user.roles, "approve_high");
    } catch (e) {
      res.status(403).json({ error: (e as Error).message });
      return;
    }
    const updated = await releaseLegalHold(req.params.id, req.user.email);
    if (!updated) {
      res.status(404).json({ error: "hold not found or already released" });
      return;
    }
    res.json(updated);
  });

  app.get("/api/v1/crr/retention/exports", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    try {
      requireCapability(req.user.roles, "read_audit");
    } catch (e) {
      res.status(403).json({ error: (e as Error).message });
      return;
    }
    const customerId = typeof req.query.customerId === "string" ? req.query.customerId : undefined;
    res.json({ exports: await listExportRuns({ customerId }) });
  });

  app.post("/api/v1/crr/retention/exports", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const body = req.body as CreateExportInput;
    if (!body?.policyId || !body?.scopeType) {
      res.status(400).json({ error: "policyId and scopeType required" });
      return;
    }
    try {
      const result = await runEvidenceExport(body, req.user.email, req.user.roles);
      res.status(201).json(result);
    } catch (e) {
      const err = e as Error;
      res.status(err.message.includes("requires") ? 403 : 400).json({ error: err.message });
    }
  });
}
