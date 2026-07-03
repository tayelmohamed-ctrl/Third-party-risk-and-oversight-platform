import type { Express } from "express";
import { requireCapability } from "../auth/rbac";
import { generateExamPack, getExamPackRun, listExamPackRuns } from "../examPack/orchestrator";

export function registerExamPackRoutes(app: Express) {
  app.get("/api/v1/crr/exam-pack", async (req, res) => {
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
    const sample = typeof req.query.sample === "string" ? Number(req.query.sample) : 25;
    const { runId, pack } = await generateExamPack(req.user.email, Number.isFinite(sample) ? sample : 25);
    res.json({ runId, pack });
  });

  app.post("/api/v1/crr/exam-pack/generate", async (req, res) => {
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
    const sampleSize = typeof req.body?.sampleSize === "number" ? req.body.sampleSize : 25;
    const result = await generateExamPack(req.user.email, sampleSize);
    res.status(201).json(result);
  });

  app.get("/api/v1/crr/exam-pack/runs", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    res.json({ runs: await listExamPackRuns() });
  });

  app.get("/api/v1/crr/exam-pack/runs/:id", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const run = await getExamPackRun(req.params.id);
    if (!run) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(run);
  });
}
