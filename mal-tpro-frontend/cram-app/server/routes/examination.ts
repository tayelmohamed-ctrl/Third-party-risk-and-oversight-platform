import type { Express } from "express";
import {
  getExaminationItems,
  getExaminationReadiness,
  patchExaminationItem,
  refreshExaminationProbes,
  FFIEC_EXAMINATION_MATRIX,
} from "../examination/orchestrator";
import { FFIEC_EXAMINATION_DOMAINS } from "../../src/config/ffiecExaminationMatrix";
import type { UpdateExaminationInput } from "../examination/types";

export function registerExaminationRoutes(app: Express) {
  app.get("/api/v1/crr/examination/readiness", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    res.json(await getExaminationReadiness());
  });

  app.get("/api/v1/crr/examination/domains", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    res.json({ domains: FFIEC_EXAMINATION_DOMAINS });
  });

  app.get("/api/v1/crr/examination/items", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const domainId = typeof req.query.domainId === "string" ? req.query.domainId : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const items = await getExaminationItems({ domainId, status });
    res.json({ count: items.length, items });
  });

  app.post("/api/v1/crr/examination/refresh", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const updated = await refreshExaminationProbes();
    res.json({ updated, readiness: await getExaminationReadiness() });
  });

  app.patch("/api/v1/crr/examination/items/:id", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const updated = await patchExaminationItem(
      req.params.id,
      req.body as UpdateExaminationInput,
      req.user.email,
    );
    if (!updated) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(updated);
  });

  app.get("/api/v1/crr/examination/catalogue", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    res.json({ count: FFIEC_EXAMINATION_MATRIX.length, items: FFIEC_EXAMINATION_MATRIX });
  });
}
