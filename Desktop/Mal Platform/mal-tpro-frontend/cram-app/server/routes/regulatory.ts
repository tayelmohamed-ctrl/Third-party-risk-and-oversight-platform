import type { Express, Request, Response } from "express";
import { requireCapability } from "../auth/rbac";
import { getRegulatoryMonitorStatus, runRegulatorySourceCheck } from "../regulatory/monitor";
import { REGULATORY_SOURCES } from "../../src/config/regulatorySources";
import { LICENSE_PROFILES } from "../../src/config/licenseProfiles";

export function registerRegulatoryRoutes(app: Express): void {
  app.get("/api/v1/crr/regulatory/monitor", (_req: Request, res: Response) => {
    res.json({
      ...getRegulatoryMonitorStatus(),
      sources: REGULATORY_SOURCES.map((s) => ({
        id: s.id,
        name: s.name,
        publisher: s.publisher,
        url: s.url,
        licenseProfiles: s.licenseProfiles,
        regulationIds: s.regulationIds,
      })),
      licenseProfiles: LICENSE_PROFILES,
    });
  });

  app.post("/api/v1/crr/regulatory/monitor/run", async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    try {
      requireCapability(req.user.roles, "config_propose");
    } catch {
      res.status(403).json({ error: "forbidden: requires config_propose (Head of Compliance or Chief of Product)" });
      return;
    }
    const run = await runRegulatorySourceCheck("manual");
    res.json(run);
  });
}
