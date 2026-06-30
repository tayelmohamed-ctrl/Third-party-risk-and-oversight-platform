import { prisma } from "./client";
import {
  buildGovernanceState,
  runIndependentValidation,
  MODEL_VERSION_ID,
  type ModelGovernanceState,
  type IndependentValidationReport,
} from "../../src/validation/independentValidation";
import { appendAudit } from "./auditStore";

export interface ValidationRunRow {
  id: string;
  at: string;
  actor: string;
  runType: string;
  modelVersionId: string;
  verdict: string;
  goldenSummary: unknown;
  backtestSummary: unknown;
  gates: unknown;
  report: unknown;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function getModelGovernance(): Promise<ModelGovernanceState> {
  const row = await prisma.modelGovernance.findUnique({ where: { id: "current" } });
  const status = (row?.status ?? "draft") as "draft" | "frozen";
  return buildGovernanceState(status);
}

export async function runValidation(actor: string): Promise<{ run: ValidationRunRow; report: IndependentValidationReport }> {
  const report = runIndependentValidation();
  const id = uid("val");
  const at = new Date();

  await prisma.validationRun.create({
    data: {
      id,
      at,
      actor,
      runType: "independent",
      modelVersionId: MODEL_VERSION_ID,
      verdict: report.verdict,
      goldenSummary: report.golden as object,
      backtestSummary: report.backtest as object,
      gates: report.gates as object[],
      report: report as object,
    },
  });

  await appendAudit({
    actor,
    action: "validation.run",
    entity: "validation_run",
    entityId: id,
    detail: `${report.verdict} · golden ${(report.golden.passRate * 100).toFixed(0)}% · ${report.backtest.outcome.summary}`,
    after: report.verdict,
  });

  return {
    run: {
      id, at: at.toISOString(), actor, runType: "independent",
      modelVersionId: MODEL_VERSION_ID, verdict: report.verdict,
      goldenSummary: report.golden, backtestSummary: report.backtest,
      gates: report.gates, report,
    },
    report,
  };
}

export async function listValidationRuns(limit = 20): Promise<ValidationRunRow[]> {
  const rows = await prisma.validationRun.findMany({ orderBy: { at: "desc" }, take: limit });
  return rows.map((r) => ({
    id: r.id,
    at: r.at.toISOString(),
    actor: r.actor,
    runType: r.runType,
    modelVersionId: r.modelVersionId,
    verdict: r.verdict,
    goldenSummary: r.goldenSummary,
    backtestSummary: r.backtestSummary,
    gates: r.gates,
    report: r.report,
  }));
}

export async function promoteModelToFrozen(actor: string): Promise<{ ok: true; state: ModelGovernanceState } | { ok: false; error: string; state: ModelGovernanceState }> {
  const state = await getModelGovernance();
  if (!state.canPromoteToFrozen) {
    return { ok: false, error: "Promotion blocked — not all validation gates passed", state };
  }

  await prisma.modelGovernance.upsert({
    where: { id: "current" },
    create: {
      id: "current",
      modelVersionId: MODEL_VERSION_ID,
      status: "frozen",
      promotedAt: new Date(),
      promotedBy: actor,
    },
    update: {
      status: "frozen",
      promotedAt: new Date(),
      promotedBy: actor,
    },
  });

  await appendAudit({
    actor,
    action: "model.promoted",
    entity: "model_governance",
    entityId: MODEL_VERSION_ID,
    detail: `Model ${MODEL_VERSION_ID} promoted draft → frozen after independent validation`,
    before: "draft",
    after: "frozen",
  });

  return { ok: true, state: buildGovernanceState("frozen") };
}

export async function seedModelGovernanceIfEmpty() {
  const existing = await prisma.modelGovernance.findUnique({ where: { id: "current" } });
  if (!existing) {
    await prisma.modelGovernance.create({
      data: { id: "current", modelVersionId: MODEL_VERSION_ID, status: "draft" },
    });
  }
}
