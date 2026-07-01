import { appendAudit } from "../db/auditStore";
import { createDraftStandalone } from "../filings/store";
import { buildCtrDocument } from "../../src/lib/ctrDraftDocument";
import { ctrDueDate, warrantsCtrReporting } from "../../src/config/fincenCtrGuidance";
import {
  createCtrObligation,
  ctrStats,
  findCtrById,
  findCtrByTmAlert,
  listCtrObligations,
  seedCtrIfEmpty,
  updateCtrObligation,
} from "./store";
import type { CtrObligationRecord, RegisterCtrInput, TmCtrCandidate } from "./types";

export async function registerCtrObligation(
  input: RegisterCtrInput,
  actor: string,
): Promise<CtrObligationRecord> {
  const created = await createCtrObligation(input);
  await appendAudit({
    actor,
    action: "ctr.obligation.registered",
    entity: "ctr_obligation",
    entityId: created.id,
    detail: `${created.customerName} · $${created.aggregateUsd.toLocaleString()} · due ${created.dueAt.slice(0, 10)}`,
    after: created.status,
  });
  return created;
}

export async function maybeRegisterCtrFromTmAlert(
  candidate: TmCtrCandidate,
  actor = "system:tm-ctr-detector",
): Promise<CtrObligationRecord | null> {
  const existing = await findCtrByTmAlert(candidate.tmAlertId);
  if (existing) return existing;

  const amountUsd = candidate.currency?.toUpperCase() === "USD"
    ? candidate.amount
    : candidate.amount;

  if (!warrantsCtrReporting({
    licenseRegion: candidate.licenseRegion,
    amountUsd,
    channel: candidate.channel,
  })) {
    return null;
  }

  const txnDate = candidate.at;
  return registerCtrObligation({
    customerId: candidate.customerId,
    customerName: candidate.customerName,
    transactionDate: txnDate,
    cashIn: amountUsd,
    cashOut: 0,
    aggregateUsd: amountUsd,
    channel: candidate.channel,
    tmAlertId: candidate.tmAlertId,
    licenseRegion: candidate.licenseRegion,
    dueAt: ctrDueDate(new Date(txnDate)),
    metadata: {
      ruleId: candidate.ruleId,
      ruleName: candidate.ruleName,
      source: "tm_alert",
    },
  }, actor);
}

export async function createCtrFilingDraft(
  obligationId: string,
  actor: string,
): Promise<{ obligation: CtrObligationRecord; draftId: string } | null> {
  const obligation = await findCtrById(obligationId);
  if (!obligation) return null;

  if (obligation.filingDraftId) {
    return { obligation, draftId: obligation.filingDraftId };
  }

  const meta = obligation.metadata ?? {};
  const body = buildCtrDocument({
    obligationId: obligation.id,
    customerId: obligation.customerId,
    customerName: obligation.customerName,
    transactionDate: obligation.transactionDate,
    cashIn: obligation.cashIn ?? undefined,
    cashOut: obligation.cashOut ?? undefined,
    aggregateUsd: obligation.aggregateUsd,
    accountNumber: obligation.accountNumber ?? undefined,
    tin: obligation.tin ?? undefined,
    branchLocation: obligation.branchLocation ?? undefined,
    channel: obligation.channel ?? undefined,
    aggregated: obligation.aggregated,
    aggregationNote: obligation.aggregationNote ?? undefined,
    tmRuleId: typeof meta.ruleId === "string" ? meta.ruleId : undefined,
    tmRuleName: typeof meta.ruleName === "string" ? meta.ruleName : undefined,
  });

  const draft = await createDraftStandalone({
    filingType: "ctr_us",
    templateId: "RPT-CTR-US-001",
    title: `CTR — ${obligation.customerName} — $${obligation.aggregateUsd.toLocaleString()}`,
    customerId: obligation.customerId,
    customerName: obligation.customerName,
    body,
    createdBy: actor,
  });

  const updated = await updateCtrObligation(obligation.id, {
    status: "draft_created",
    filingDraftId: draft.id,
  });

  await appendAudit({
    actor,
    action: "ctr.draft.created",
    entity: "filing_draft",
    entityId: draft.id,
    detail: `CTR Form 104 draft for ${obligation.customerName} · obligation ${obligation.id}`,
    after: "draft_created",
  });

  return { obligation: updated!, draftId: draft.id };
}

export async function markCtrFiled(obligationId: string, filingDraftId: string): Promise<void> {
  await updateCtrObligation(obligationId, {
    status: "filed",
    filedAt: new Date(),
    filingDraftId,
  });
}

export {
  ctrStats,
  findCtrById,
  listCtrObligations,
  seedCtrIfEmpty,
};
