import type { Express, Request, Response } from "express";
import { requireCapability } from "../auth/rbac";
import {
  createFilingDraftFromCase,
  filingStats,
  getDraft,
  getDraftsForCase,
  listDrafts,
  mlroApproveDraft,
  patchDraft,
  submitDraftForReview,
  submitDraftToFiu,
  getDraftSubmissions,
} from "../filings/orchestrator";
import type { UpdateFilingDraftInput } from "../filings/types";

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

function requireMlro(req: Request, res: Response): boolean {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  try {
    requireCapability(req.user.roles, "approve_high");
    return true;
  } catch (e) {
    res.status(403).json({ error: (e as Error).message });
    return false;
  }
}

export function registerFilingRoutes(app: Express) {
  app.get("/api/v1/crr/filings/stats", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    res.json(await filingStats());
  });

  app.get("/api/v1/crr/filings", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const drafts = await listDrafts({ status });
    res.json({ count: drafts.length, drafts });
  });

  app.get("/api/v1/crr/filings/by-case/:caseId", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const drafts = await getDraftsForCase(req.params.caseId);
    res.json({ count: drafts.length, drafts });
  });

  app.get("/api/v1/crr/filings/:id", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const draft = await getDraft(req.params.id);
    if (!draft) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(draft);
  });

  app.post("/api/v1/crr/filings/from-case/:caseId", async (req, res) => {
    if (!requireReview(req, res)) return;
    const notes = typeof req.body?.notes === "string" ? req.body.notes : undefined;
    const created = await createFilingDraftFromCase(req.params.caseId, req.user!.email, notes);
    if (!created) {
      res.status(404).json({ error: "case not found" });
      return;
    }
    res.status(201).json(created);
  });

  app.patch("/api/v1/crr/filings/:id", async (req, res) => {
    if (!requireReview(req, res)) return;
    const body = req.body as UpdateFilingDraftInput;
    if (body.body && typeof body.body === "object") {
      const b = body.body as { filingType?: string; templateId?: string; reportType?: string };
      if (b.reportType === "CTR_US") body.filingType = "ctr_us";
      else if (b.reportType === "SAR_US") body.filingType = "sar_us";
      else if (b.reportType === "SAR") body.filingType = "sar_uae";
      else if (b.reportType === "STR") body.filingType = "str_uae";
      if ("templateId" in b && b.templateId) body.templateId = b.templateId;
    }
    const updated = await patchDraft(req.params.id, body, req.user!.email);
    if (!updated) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(updated);
  });

  app.post("/api/v1/crr/filings/:id/submit-review", async (req, res) => {
    if (!requireReview(req, res)) return;
    const updated = await submitDraftForReview(req.params.id, req.user!.email);
    if (!updated) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(updated);
  });

  app.post("/api/v1/crr/filings/:id/mlro-approve", async (req, res) => {
    if (!requireMlro(req, res)) return;
    const updated = await mlroApproveDraft(req.params.id, req.user!.email);
    if (!updated) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(updated);
  });

  app.post("/api/v1/crr/filings/:id/submit-fiu", async (req, res) => {
    if (!requireMlro(req, res)) return;
    try {
      const result = await submitDraftToFiu(req.params.id, req.user!.email);
      if (!result) {
        res.status(404).json({ error: "not found" });
        return;
      }
      res.json(result);
    } catch (e) {
      res.status(422).json({ error: (e as Error).message });
    }
  });

  app.get("/api/v1/crr/filings/:id/submissions", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const submissions = await getDraftSubmissions(req.params.id);
    res.json({ count: submissions.length, submissions });
  });
}
