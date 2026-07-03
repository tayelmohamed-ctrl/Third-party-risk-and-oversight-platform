import { prisma } from "../db/client";
import { hasCapability, type Role } from "../auth/rbac";
import {
  EVIDENCE_EXPORT_POLICIES,
  exportPolicyById,
  type RecordClass,
} from "../../src/config/retentionPolicy";
import { appendAudit } from "../db/auditStore";
import { activeLegalHolds, matchingHoldIds } from "./legalHold";
import { scanRetentionRegistry } from "./registry";
import type { CreateExportInput, EvidenceExportRunRecord } from "./types";

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function mapExport(r: {
  id: string; exportRef: string; policyId: string; scopeType: string; scopeId: string | null;
  customerId: string | null; recordClasses: unknown; recordCount: number; manifest: unknown;
  requestedBy: string; approvedBy: string | null; status: string; legalHoldChecked: boolean;
  holdBlockedCount: number; createdAt: Date;
}): EvidenceExportRunRecord {
  return {
    id: r.id,
    exportRef: r.exportRef,
    policyId: r.policyId,
    scopeType: r.scopeType,
    scopeId: r.scopeId,
    customerId: r.customerId,
    recordClasses: r.recordClasses as string[],
    recordCount: r.recordCount,
    manifest: r.manifest,
    requestedBy: r.requestedBy,
    approvedBy: r.approvedBy,
    status: r.status,
    legalHoldChecked: r.legalHoldChecked,
    holdBlockedCount: r.holdBlockedCount,
    createdAt: r.createdAt.toISOString(),
  };
}

export function listExportPolicies() {
  return EVIDENCE_EXPORT_POLICIES;
}

export async function listExportRuns(opts?: { customerId?: string; limit?: number }): Promise<EvidenceExportRunRecord[]> {
  const rows = await prisma.evidenceExportRun.findMany({
    where: opts?.customerId ? { customerId: opts.customerId } : undefined,
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 50,
  });
  return rows.map(mapExport);
}

export async function runEvidenceExport(
  input: CreateExportInput,
  actor: string,
  roles: Role[],
): Promise<{ export: EvidenceExportRunRecord; deniedOnHold: number }> {
  const policy = exportPolicyById(input.policyId);
  if (!policy) {
    throw new Error(`Unknown export policy: ${input.policyId}`);
  }

  if (!hasCapability(roles, policy.requiredCapability)) {
    throw new Error(`Export requires capability: ${policy.requiredCapability}`);
  }

  if (policy.mlroApprovalRequired && !roles.includes("MLRO")) {
    throw new Error("This export policy requires MLRO role");
  }

  const holds = policy.legalHoldCheck ? await activeLegalHolds() : [];

  let records = await scanRetentionRegistry({
    customerId: input.customerId,
    limit: policy.maxRecords,
  });

  records = records.filter((r) => policy.recordClasses.includes(r.recordClass as RecordClass));

  if (input.scopeType === "case" && input.scopeId) {
    records = records.filter((r) =>
      r.entityId === input.scopeId
      || (r.entityType === "case_evidence" && r.entityId.startsWith(input.scopeId!))
      || r.entityId === input.scopeId,
    );
  }

  if (input.fromDate || input.toDate) {
    const from = input.fromDate ? new Date(input.fromDate).getTime() : 0;
    const to = input.toDate ? new Date(input.toDate).getTime() : Number.MAX_SAFE_INTEGER;
    records = records.filter((r) => {
      const t = new Date(r.anchorDate).getTime();
      return t >= from && t <= to;
    });
  }

  if (records.length > policy.maxRecords) {
    records = records.slice(0, policy.maxRecords);
  }

  let deniedOnHold = 0;
  const manifestRecords = records.map((r) => {
    const blocked = policy.legalHoldCheck && r.onHold;
    if (blocked) deniedOnHold++;
    return {
      recordClass: r.recordClass,
      entityType: r.entityType,
      entityId: r.entityId,
      customerId: r.customerId,
      anchorDate: r.anchorDate,
      retentionUntil: r.retentionUntil,
      disposition: r.disposition,
      included: !blocked,
      holdIds: r.holdIds,
      policyRef: r.policyRef,
    };
  });

  const included = manifestRecords.filter((m) => m.included);

  const exportRef = `EXP-${Date.now().toString(36).toUpperCase()}`;
  const manifest = {
    exportRef,
    policyId: policy.id,
    policyLabel: policy.label,
    policyRef: policy.policyRef,
    scopeType: input.scopeType,
    scopeId: input.scopeId ?? null,
    customerId: input.customerId ?? null,
    generatedAt: new Date().toISOString(),
    requestedBy: actor,
    recordCount: included.length,
    deniedOnHold,
    records: manifestRecords,
    notice: "Manifest-only export — records remain in append-only store; no deletion performed.",
  };

  const row = await prisma.evidenceExportRun.create({
    data: {
      id: uid("exp"),
      exportRef,
      policyId: policy.id,
      scopeType: input.scopeType,
      scopeId: input.scopeId ?? null,
      customerId: input.customerId ?? null,
      recordClasses: policy.recordClasses as object,
      recordCount: included.length,
      manifest: manifest as object,
      requestedBy: actor,
      approvedBy: policy.mlroApprovalRequired ? actor : null,
      status: deniedOnHold > 0 && included.length === 0 ? "denied" : "completed",
      legalHoldChecked: policy.legalHoldCheck,
      holdBlockedCount: deniedOnHold,
    },
  });

  await appendAudit({
    actor,
    action: "retention.export",
    entity: "evidence_export_run",
    entityId: row.id,
    detail: `${policy.label} · ${included.length} records · ${deniedOnHold} blocked by legal hold`,
    after: exportRef,
  });

  return { export: mapExport(row), deniedOnHold };
}
