import type { Express, Request, Response } from "express";
import { requireCapability } from "../auth/rbac";
import {
  approveConfigProposal,
  CONFIG_TABLES,
  getActiveConfig,
  listConfigVersions,
  patchConfigWithMakerChecker,
  proposeConfigChange,
  type ConfigTable,
} from "../config/configStore";
import { dispositionOpenItem, listOpenItems, openItemCountsFromDb } from "../governance/openItemsStore";

function parseTable(name: string): ConfigTable | null {
  return CONFIG_TABLES.includes(name as ConfigTable) ? (name as ConfigTable) : null;
}

export function registerGovernanceRoutes(app: Express) {
  app.get("/api/v1/crr/governance/open-items", async (_req, res) => {
    const items = await listOpenItems();
    const counts = await openItemCountsFromDb();
    res.json({ items, counts });
  });

  app.patch("/api/v1/crr/governance/open-items/:id", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    try {
      requireCapability(req.user.roles, "config_approve");
    } catch (e) {
      const err = e as Error & { status?: number };
      res.status(err.status ?? 403).json({ error: err.message });
      return;
    }

    const { status, decision } = req.body as { status?: string; decision?: string };
    if (!decision || !status || !["accepted", "corrected"].includes(status)) {
      res.status(400).json({ error: "decision and status (accepted|corrected) required" });
      return;
    }

    const updated = await dispositionOpenItem({
      id: req.params.id,
      status: status as "accepted" | "corrected",
      decision,
      actor: req.user.email,
    });
    if (!updated) {
      res.status(404).json({ error: "open item not found" });
      return;
    }
    res.json(updated);
  });

  app.get("/api/v1/crr/config/:table", async (req, res) => {
    const table = parseTable(req.params.table);
    if (!table) {
      res.status(400).json({ error: "invalid config table" });
      return;
    }
    res.json(await getActiveConfig(table));
  });

  app.get("/api/v1/crr/config/:table/versions", async (req, res) => {
    const table = parseTable(req.params.table);
    if (!table) {
      res.status(400).json({ error: "invalid config table" });
      return;
    }
    res.json(await listConfigVersions(table));
  });

  app.patch("/api/v1/crr/config/:table", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const table = parseTable(req.params.table);
    if (!table) {
      res.status(400).json({ error: "invalid config table" });
      return;
    }

    const checkerUser = (req.headers["x-checker-user"] as string) ?? req.body?.checkerUser;
    const approvalRef = (req.headers["x-approval-reference"] as string) ?? req.body?.approvalRef;
    const payload = req.body?.payload ?? req.body;

    // Maker-checker direct PATCH (GV-26): requires config_propose + separate checker
    if (checkerUser) {
      try {
        requireCapability(req.user.roles, "config_propose");
      } catch (e) {
        const err = e as Error & { status?: number };
        res.status(err.status ?? 403).json({ error: err.message });
        return;
      }

      const result = await patchConfigWithMakerChecker({
        table,
        payload,
        makerUser: req.user.email,
        checkerUser,
        approvalRef,
      });
      if (!result.ok) {
        res.status(result.status).json({ error: result.error });
        return;
      }
      res.json({ ok: true, version: result.version, table });
      return;
    }

    // Propose only (maker)
    try {
      requireCapability(req.user.roles, "config_propose");
    } catch (e) {
      const err = e as Error & { status?: number };
      res.status(err.status ?? 403).json({ error: err.message });
      return;
    }

    const result = await proposeConfigChange({
      table,
      payload,
      proposedBy: req.user.email,
      approvalRef,
    });
    if ("error" in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.status(201).json({ proposalId: result.id, status: "pending" });
  });

  app.post("/api/v1/crr/config/proposals/:id/approve", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    try {
      requireCapability(req.user.roles, "config_approve");
    } catch (e) {
      const err = e as Error & { status?: number };
      res.status(err.status ?? 403).json({ error: err.message });
      return;
    }

    const approvalRef = req.body?.approvalRef as string | undefined;
    const result = await approveConfigProposal({
      proposalId: req.params.id,
      approvedBy: req.user.email,
      approvalRef,
    });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ ok: true, version: result.version });
  });
}
