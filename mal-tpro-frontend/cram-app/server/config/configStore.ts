import { prisma } from "../db/client";
import { appendAudit } from "../db/auditStore";
import { MODEL_VERSION_ID } from "../../src/validation/independentValidation";
import {
  DEFAULT_FACTOR_WEIGHTS,
  getFactorWeights,
  setActiveFactorWeights,
  validateFactorWeightSum,
  type FactorWeightsConfig,
} from "../../src/config/runtimeConfig";
import {
  DEFAULT_BAND_BOUNDARIES,
  getAllBandBoundaries,
  setActiveBandBoundaries,
  type BandBoundarySet,
} from "../../src/config/bandBoundaries";
import type { Boundary } from "../../src/engine/types";
import OVERRIDES from "../../src/data/override_rules.json";

export const CONFIG_TABLES = ["factor_weights", "band_boundaries", "override_rules"] as const;
export type ConfigTable = (typeof CONFIG_TABLES)[number];

export const LOCKED_OVR_IDS = ["OVR-001", "OVR-002", "OVR-003", "OVR-004", "OVR-005", "OVR-006", "OVR-007"];

export interface OverrideRuleConfig {
  id: string;
  trigger: string;
  outcome: string;
  priority: string;
  active: boolean;
  locked: boolean;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function defaultPayload(table: ConfigTable): unknown {
  switch (table) {
    case "factor_weights":
      return { ...DEFAULT_FACTOR_WEIGHTS };
    case "band_boundaries":
      return { ...DEFAULT_BAND_BOUNDARIES };
    case "override_rules":
      return (OVERRIDES as { id: string; trigger: string; outcome: string; priority: string }[]).map((r) => ({
        id: r.id,
        trigger: r.trigger,
        outcome: r.outcome,
        priority: r.priority,
        active: true,
        locked: LOCKED_OVR_IDS.includes(r.id),
      }));
    default:
      return {};
  }
}

export function applyConfigToRuntime(table: ConfigTable, payload: unknown): void {
  if (table === "factor_weights") {
    setActiveFactorWeights(payload as FactorWeightsConfig);
  } else if (table === "band_boundaries") {
    setActiveBandBoundaries(payload as Record<Boundary, BandBoundarySet>);
  }
}

export async function getActiveConfig(table: ConfigTable): Promise<{ table: ConfigTable; version: number; payload: unknown; modelVersionId: string; effectiveFrom: string }> {
  const row = await prisma.configVersion.findFirst({
    where: { tableName: table, effectiveTo: null },
    orderBy: { version: "desc" },
  });
  if (!row) {
    return {
      table,
      version: 0,
      payload: defaultPayload(table),
      modelVersionId: MODEL_VERSION_ID,
      effectiveFrom: new Date(0).toISOString(),
    };
  }
  return {
    table,
    version: row.version,
    payload: row.payload,
    modelVersionId: row.modelVersionId,
    effectiveFrom: row.effectiveFrom.toISOString(),
  };
}

export async function loadAllActiveConfigIntoRuntime(): Promise<void> {
  for (const table of CONFIG_TABLES) {
    const active = await getActiveConfig(table);
    if (table !== "override_rules") {
      applyConfigToRuntime(table, active.payload);
    }
  }
}

export async function seedConfigVersionsIfEmpty(): Promise<void> {
  for (const table of CONFIG_TABLES) {
    const existing = await prisma.configVersion.findFirst({ where: { tableName: table } });
    if (existing) continue;
    const payload = defaultPayload(table);
    await prisma.configVersion.create({
      data: {
        id: uid("cfg"),
        tableName: table,
        version: 1,
        payload: payload as object,
        modelVersionId: MODEL_VERSION_ID,
        effectiveFrom: new Date(),
        approvedBy: "system@bootstrap",
        approvedAt: new Date(),
        proposedBy: "system@bootstrap",
        approvalRef: "bootstrap-v1",
      },
    });
    applyConfigToRuntime(table, payload);
  }
}

export function validateConfigProposal(table: ConfigTable, payload: unknown): { ok: true } | { ok: false; error: string } {
  if (table === "factor_weights") {
    const w = payload as FactorWeightsConfig;
    if (!validateFactorWeightSum(w)) {
      return { ok: false, error: "Factor weights must sum to 1.0 (±0.001)" };
    }
    return { ok: true };
  }
  if (table === "band_boundaries") {
    const b = payload as Record<Boundary, BandBoundarySet>;
    for (const key of ["calculator", "cram"] as Boundary[]) {
      const set = b[key];
      if (!set || set.lowMax >= set.mediumMax) {
        return { ok: false, error: `Invalid band boundaries for ${key}: lowMax must be < mediumMax` };
      }
    }
    return { ok: true };
  }
  if (table === "override_rules") {
    const rules = payload as OverrideRuleConfig[];
    for (const rule of rules) {
      if (LOCKED_OVR_IDS.includes(rule.id)) {
        const orig = (OVERRIDES as { id: string }[]).find((r) => r.id === rule.id);
        if (!orig) return { ok: false, error: `Unknown rule ${rule.id}` };
        if (rule.active === false) {
          return { ok: false, error: `Locked rule ${rule.id} — active_flag cannot be changed (403)` };
        }
      }
    }
    return { ok: true };
  }
  return { ok: false, error: `Unknown config table: ${table}` };
}

export async function proposeConfigChange(args: {
  table: ConfigTable;
  payload: unknown;
  proposedBy: string;
  approvalRef?: string;
}): Promise<{ id: string } | { error: string; status: number }> {
  if (!CONFIG_TABLES.includes(args.table)) {
    return { error: `Unknown config table: ${args.table}`, status: 400 };
  }
  const validation = validateConfigProposal(args.table, args.payload);
  if (!validation.ok) {
    const status = validation.error.includes("403") ? 403 : 422;
    return { error: validation.error, status };
  }

  const id = uid("prop");
  await prisma.configProposal.create({
    data: {
      id,
      tableName: args.table,
      payload: args.payload as object,
      proposedBy: args.proposedBy,
      approvalRef: args.approvalRef ?? null,
    },
  });

  await appendAudit({
    actor: args.proposedBy,
    action: "config.proposed",
    entity: "config_proposal",
    entityId: id,
    detail: `Proposed ${args.table} change`,
  });

  return { id };
}

export async function approveConfigProposal(args: {
  proposalId: string;
  approvedBy: string;
  approvalRef?: string;
}): Promise<{ ok: true; version: number } | { ok: false; error: string; status: number }> {
  const proposal = await prisma.configProposal.findUnique({ where: { id: args.proposalId } });
  if (!proposal || proposal.status !== "pending") {
    return { ok: false, error: "Proposal not found or already processed", status: 404 };
  }
  if (proposal.proposedBy === args.approvedBy) {
    return { ok: false, error: "Maker and Checker must be different users", status: 403 };
  }

  const validation = validateConfigProposal(proposal.tableName as ConfigTable, proposal.payload);
  if (!validation.ok) {
    return { ok: false, error: validation.error, status: validation.error.includes("403") ? 403 : 422 };
  }

  const current = await prisma.configVersion.findFirst({
    where: { tableName: proposal.tableName, effectiveTo: null },
    orderBy: { version: "desc" },
  });
  const nextVersion = (current?.version ?? 0) + 1;
  const now = new Date();

  if (current) {
    await prisma.configVersion.update({
      where: { id: current.id },
      data: { effectiveTo: now },
    });
  }

  const versionId = uid("cfg");
  await prisma.configVersion.create({
    data: {
      id: versionId,
      tableName: proposal.tableName,
      version: nextVersion,
      payload: proposal.payload as object,
      modelVersionId: MODEL_VERSION_ID,
      effectiveFrom: now,
      approvedBy: args.approvedBy,
      approvedAt: now,
      proposedBy: proposal.proposedBy,
      approvalRef: args.approvalRef ?? proposal.approvalRef,
    },
  });

  await prisma.configProposal.update({
    where: { id: args.proposalId },
    data: { status: "approved", approvedBy: args.approvedBy, approvedAt: now, approvalRef: args.approvalRef ?? proposal.approvalRef },
  });

  applyConfigToRuntime(proposal.tableName as ConfigTable, proposal.payload);

  await appendAudit({
    actor: args.approvedBy,
    action: "config.approved",
    entity: "config_version",
    entityId: versionId,
    detail: `${proposal.tableName} v${nextVersion} approved (maker: ${proposal.proposedBy})`,
    before: current ? `v${current.version}` : "bootstrap",
    after: `v${nextVersion}`,
  });

  return { ok: true, version: nextVersion };
}

/** Direct PATCH for maker-checker when checker user is in separate header (GV-26). */
export async function patchConfigWithMakerChecker(args: {
  table: ConfigTable;
  payload: unknown;
  makerUser: string;
  checkerUser: string;
  approvalRef?: string;
}): Promise<{ ok: true; version: number } | { ok: false; error: string; status: number }> {
  if (args.makerUser === args.checkerUser) {
    return { ok: false, error: "Maker and Checker must be different users", status: 403 };
  }
  const validation = validateConfigProposal(args.table, args.payload);
  if (!validation.ok) {
    return { ok: false, error: validation.error, status: validation.error.includes("403") ? 403 : 422 };
  }

  const propose = await proposeConfigChange({
    table: args.table,
    payload: args.payload,
    proposedBy: args.makerUser,
    approvalRef: args.approvalRef,
  });
  if ("error" in propose) {
    return { ok: false, error: propose.error, status: propose.status };
  }

  return approveConfigProposal({
    proposalId: propose.id,
    approvedBy: args.checkerUser,
    approvalRef: args.approvalRef,
  });
}

export async function listConfigVersions(table: ConfigTable, limit = 10) {
  const rows = await prisma.configVersion.findMany({
    where: { tableName: table },
    orderBy: { version: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    table: r.tableName,
    version: r.version,
    modelVersionId: r.modelVersionId,
    effectiveFrom: r.effectiveFrom.toISOString(),
    effectiveTo: r.effectiveTo?.toISOString() ?? null,
    approvedBy: r.approvedBy,
    proposedBy: r.proposedBy,
  }));
}

export function getRuntimeConfigSnapshot() {
  return {
    factor_weights: getFactorWeights(),
    band_boundaries: getAllBandBoundaries(),
  };
}
