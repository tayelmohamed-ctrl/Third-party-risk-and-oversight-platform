import type { Express, Request, Response } from "express";
import { requireCapability } from "../auth/rbac";
import {
  advancePipelineStep,
  appendEvidence,
  assignCase,
  caseStats,
  findCaseById,
  listCases,
  manualCreateCase,
  recordDisposition,
} from "../investigations/orchestrator";
import { maybeCreateDraftOnDisposition } from "../filings/orchestrator";
import type {
  AddEvidenceInput,
  CreateCaseInput,
  DispositionInput,
  UpdateCaseInput,
} from "../investigations/types";

function requireReview(req: Request, res: Response): boolean {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  try {
    requireCapability(req.user.roles, "review");
    return true;
  } catch (e) {
    res.status(403).json({ error: (e as Error).message });
    return false;
  }
}

export function registerInvestigationRoutes(app: Express) {
  app.get("/api/v1/crr/cases/stats", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    res.json(await caseStats());
  });

  app.get("/api/v1/crr/cases", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const cases = await listCases({ status });
    res.json({ count: cases.length, cases });
  });

  app.get("/api/v1/crr/cases/:id", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const c = await findCaseById(req.params.id);
    if (!c) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(c);
  });

  app.post("/api/v1/crr/cases", async (req, res) => {
    if (!requireReview(req, res)) return;
    const body = req.body as CreateCaseInput;
    if (!body?.title || !body?.customerId || !body?.customerName || !body?.source) {
      res.status(400).json({ error: "title, customerId, customerName, source required" });
      return;
    }
    const created = await manualCreateCase(body, req.user!.email);
    res.status(201).json(created);
  });

  app.patch("/api/v1/crr/cases/:id", async (req, res) => {
    if (!requireReview(req, res)) return;
    const body = req.body as UpdateCaseInput & { assignedTo?: string };
    if (body.assignedTo !== undefined) {
      const updated = await assignCase(req.params.id, body.assignedTo, req.user!.email);
      if (!updated) {
        res.status(404).json({ error: "not found" });
        return;
      }
      res.json(updated);
      return;
    }
    if (body.pipelineStep !== undefined) {
      const updated = await advancePipelineStep(req.params.id, body.pipelineStep, req.user!.email);
      if (!updated) {
        res.status(404).json({ error: "not found" });
        return;
      }
      res.json(updated);
      return;
    }
    res.status(400).json({ error: "assignedTo or pipelineStep required" });
  });

  app.post("/api/v1/crr/cases/:id/evidence", async (req, res) => {
    if (!requireReview(req, res)) return;
    const body = req.body as AddEvidenceInput;
    if (!body?.kind || !body?.label) {
      res.status(400).json({ error: "kind, label required" });
      return;
    }
    const updated = await appendEvidence(req.params.id, body, req.user!.email);
    if (!updated) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.status(201).json(updated);
  });

  app.post("/api/v1/crr/cases/:id/disposition", async (req, res) => {
    if (!requireReview(req, res)) return;
    const body = req.body as DispositionInput;
    if (!body?.disposition) {
      res.status(400).json({ error: "disposition required" });
      return;
    }
    const updated = await recordDisposition(req.params.id, body, req.user!.email);
    if (!updated) {
      res.status(404).json({ error: "not found" });
      return;
    }
    const filingDraft = await maybeCreateDraftOnDisposition(
      updated,
      body.disposition,
      req.user!.email,
      body.notes,
    );
    res.json({ case: updated, filingDraft });
  });
}
