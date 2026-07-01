import type { Express, Request, Response } from "express";
import { requireCapability } from "../auth/rbac";
import {
  assignTraining,
  completeTraining,
  getTrainingRecord,
  getTrainingRecords,
  getTrainingStats,
  patchTrainingRecord,
  TRAINING_COURSES,
} from "../training/orchestrator";
import type { CreateTrainingInput, UpdateTrainingInput } from "../training/types";

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

export function registerTrainingRoutes(app: Express) {
  app.get("/api/v1/crr/training/stats", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    res.json(await getTrainingStats());
  });

  app.get("/api/v1/crr/training/courses", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    res.json({ count: TRAINING_COURSES.length, courses: TRAINING_COURSES });
  });

  app.get("/api/v1/crr/training", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const userEmail = typeof req.query.userEmail === "string" ? req.query.userEmail : undefined;
    const courseId = typeof req.query.courseId === "string" ? req.query.courseId : undefined;
    const records = await getTrainingRecords({ status, userEmail, courseId });
    res.json({ count: records.length, records });
  });

  app.get("/api/v1/crr/training/:id", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const record = await getTrainingRecord(req.params.id);
    if (!record) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(record);
  });

  app.post("/api/v1/crr/training", async (req, res) => {
    if (!requireReview(req, res)) return;
    const body = req.body as CreateTrainingInput;
    if (!body.userEmail || !body.courseId) {
      res.status(400).json({ error: "userEmail and courseId required" });
      return;
    }
    try {
      const created = await assignTraining(body, req.user!.email);
      res.status(201).json(created);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  app.patch("/api/v1/crr/training/:id", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const body = req.body as UpdateTrainingInput;
    const updated = await patchTrainingRecord(req.params.id, body, req.user.email);
    if (!updated) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(updated);
  });

  app.post("/api/v1/crr/training/:id/complete", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const updated = await completeTraining(req.params.id, req.user.email);
    if (!updated) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(updated);
  });
}
