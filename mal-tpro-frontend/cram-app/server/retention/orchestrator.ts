import { appendAudit } from "../db/auditStore";
import { RETENTION_CLASS_POLICIES, EVIDENCE_EXPORT_POLICIES } from "../../src/config/retentionPolicy";
import { createLegalHold, listLegalHolds, releaseLegalHold, seedLegalHoldIfEmpty } from "./legalHold";
import { runEvidenceExport, listExportPolicies, listExportRuns } from "./export";
import {
  computeRetentionStats,
  listRetentionRuns,
  persistRetentionRun,
  scanRetentionRegistry,
} from "./registry";
import type { CreateExportInput, CreateLegalHoldInput } from "./types";

export async function runRetentionScheduler(actor = "scheduler:retention"): Promise<{
  runId: string;
  stats: Awaited<ReturnType<typeof computeRetentionStats>>;
}> {
  const asOf = new Date();
  const runId = await persistRetentionRun(asOf);
  const stats = await computeRetentionStats(asOf);

  await appendAudit({
    actor,
    action: "retention.scheduler.run",
    entity: "retention_run",
    entityId: runId,
    detail: `Scanned ${stats.scanned} · active ${stats.active} · approaching ${stats.approachingExpiry} · eligible archive ${stats.eligibleArchive} · on hold ${stats.onHold}`,
    after: runId,
  });

  return { runId, stats };
}

export {
  RETENTION_CLASS_POLICIES,
  EVIDENCE_EXPORT_POLICIES,
  computeRetentionStats,
  scanRetentionRegistry,
  listRetentionRuns,
  createLegalHold,
  listLegalHolds,
  releaseLegalHold,
  seedLegalHoldIfEmpty,
  runEvidenceExport,
  listExportPolicies,
  listExportRuns,
};

export type { CreateExportInput, CreateLegalHoldInput };
