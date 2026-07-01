import { appendAudit } from "../db/auditStore";
import { submitToFincen, submitToFincenCtr, submitToGoaml } from "../goaml/client";
import { buildFincenCtrPayload, buildFincenPayload, buildGoamlPayload } from "../goaml/payloadBuilder";
import { findCaseById } from "../investigations/store";
import type { InvestigationCaseRecord } from "../investigations/types";
import {
  buildDraftBody,
  selectTemplateForCase,
} from "./templates";
import {
  createDraft,
  findDraftByCaseId,
  findDraftById,
  filingStats,
  listDrafts,
  updateDraft,
} from "./store";
import { createSubmission, findSubmissionsByDraft, type FilingSubmissionRecord } from "./submissions";
import type {
  FilingDraftRecord,
  UpdateFilingDraftInput,
} from "./types";
import { normalizeDraftBody, type FilingDraftDocument } from "../../src/lib/filingDraftDocument";
import { evaluateDraftCompliance } from "../../src/config/filingGuidanceRequirements";
import { evaluateCtrCompliance } from "../../src/config/ctrGuidanceRequirements";
import { markCtrFiled } from "../ctr/orchestrator";
import { prisma } from "../db/client";

const FILING_DISPOSITIONS = new Set(["sar_recommended", "escalate"]);

export function warrantsFilingDraft(disposition: string): boolean {
  return FILING_DISPOSITIONS.has(disposition);
}

export async function createFilingDraftFromCase(
  caseId: string,
  actor: string,
  dispositionNotes?: string,
): Promise<FilingDraftRecord | null> {
  const c = await findCaseById(caseId);
  if (!c) return null;

  const selection = selectTemplateForCase(c);

  const existing = await findDraftByCaseId(c.id, selection.filingType);
  if (existing) return existing;

  const body = buildDraftBody(c, selection.templateId, dispositionNotes);
  const created = await createDraft({
    caseId: c.id,
    filingType: selection.filingType,
    templateId: selection.templateId,
    title: `${selection.title} — ${c.caseNumber}`,
    customerId: c.customerId,
    customerName: c.customerName,
    body,
    createdBy: actor,
  });

  await appendAudit({
    actor,
    action: "filing.draft.created",
    entity: "filing_draft",
    entityId: created.id,
    detail: `${selection.filingType} · ${c.caseNumber} · ${c.customerName} · template ${selection.templateId}`,
    after: created.status,
  });

  return created;
}

export async function getDraft(id: string): Promise<FilingDraftRecord | null> {
  return findDraftById(id);
}

export async function getDraftsForCase(caseId: string): Promise<FilingDraftRecord[]> {
  const c = await findCaseById(caseId);
  if (!c) return [];
  return listDrafts({ caseId: c.id });
}

export async function submitDraftForReview(
  id: string,
  actor: string,
): Promise<FilingDraftRecord | null> {
  const updated = await updateDraft(id, { status: "pending_review", checkerBy: actor });
  if (!updated) return null;
  await appendAudit({
    actor,
    action: "filing.draft.review",
    entity: "filing_draft",
    entityId: updated.id,
    detail: `Submitted for maker-checker review`,
    after: updated.status,
  });
  return updated;
}

export async function mlroApproveDraft(
  id: string,
  actor: string,
): Promise<FilingDraftRecord | null> {
  const updated = await updateDraft(id, { status: "mlro_approved", mlroBy: actor });
  if (!updated) return null;
  await appendAudit({
    actor,
    action: "filing.draft.mlro_approved",
    entity: "filing_draft",
    entityId: updated.id,
    detail: `MLRO approved draft — ready for FIU submission`,
    after: updated.status,
  });
  return updated;
}

export async function patchDraft(
  id: string,
  input: UpdateFilingDraftInput,
  actor: string,
): Promise<FilingDraftRecord | null> {
  const updated = await updateDraft(id, input);
  if (!updated) return null;
  await appendAudit({
    actor,
    action: input.body ? "filing.draft.saved" : "filing.draft.updated",
    entity: "filing_draft",
    entityId: updated.id,
    detail: input.body
      ? `Editor save · ${updated.filingType} · ${updated.templateId ?? "—"}`
      : input.status ? `status → ${input.status}` : "metadata updated",
    after: updated.status,
  });
  return updated;
}

export async function maybeCreateDraftOnDisposition(
  c: InvestigationCaseRecord,
  disposition: string,
  actor: string,
  notes?: string,
): Promise<FilingDraftRecord | null> {
  if (!warrantsFilingDraft(disposition)) return null;
  return createFilingDraftFromCase(c.id, actor, notes);
}

function asV2Doc(body: FilingDraftRecord["body"]): FilingDraftDocument | null {
  if (!body) return null;
  return normalizeDraftBody(body as Parameters<typeof normalizeDraftBody>[0]);
}

export async function submitDraftToFiu(
  id: string,
  actor: string,
): Promise<{ draft: FilingDraftRecord; submission: FilingSubmissionRecord } | null> {
  const draft = await findDraftById(id);
  if (!draft) return null;

  if (draft.status !== "mlro_approved") {
    throw new Error("Draft must be MLRO-approved before FIU submission");
  }

  const doc = asV2Doc(draft.body);
  if (!doc) {
    throw new Error("Draft body must be structured v2 document");
  }

  const compliance = doc.reportType === "CTR_US"
    ? evaluateCtrCompliance(doc.sections)
    : evaluateDraftCompliance({
      sections: doc.sections,
      reportType: doc.reportType,
      fiuId: doc.fiu.id,
      defensiveFilingDenied: doc.defensiveFilingDenied,
    });
  if (compliance.blockers.length) {
    throw new Error(`Compliance blockers remain: ${compliance.blockers.slice(0, 2).join("; ")}`);
  }

  let fiuSystem: string;
  let payload: unknown;
  let result;

  if (doc.reportType === "CTR_US") {
    fiuSystem = "FinCEN-CTR";
    payload = buildFincenCtrPayload(doc, draft.id);
    result = await submitToFincenCtr(payload);
  } else if (doc.fiu.id === "US") {
    fiuSystem = "FinCEN";
    payload = buildFincenPayload(doc, draft.id);
    result = await submitToFincen(payload);
  } else {
    fiuSystem = "goAML";
    payload = buildGoamlPayload(doc, draft.id);
    result = await submitToGoaml(payload);
  }

  if (!result.ok) {
    throw new Error(result.message);
  }

  const submission = await createSubmission({
    filingDraftId: draft.id,
    fiuSystem,
    fiuReference: result.fiuReference,
    status: result.status,
    payload,
    response: result,
    submittedBy: actor,
  });

  const updated = await updateDraft(id, { status: "submitted" });
  if (!updated) return null;

  await appendAudit({
    actor,
    action: "filing.fiu.submitted",
    entity: "filing_submission",
    entityId: submission.id,
    detail: `${fiuSystem} · ${result.fiuReference} · ${draft.customerName} · mode ${result.mode}`,
    after: result.fiuReference,
  });

  if (doc.reportType === "CTR_US") {
    const ctrRow = await prisma.ctrObligation.findFirst({ where: { filingDraftId: draft.id } });
    if (ctrRow) {
      await markCtrFiled(ctrRow.id, draft.id);
    }
  }

  return { draft: updated, submission };
}

export async function getDraftSubmissions(draftId: string): Promise<FilingSubmissionRecord[]> {
  return findSubmissionsByDraft(draftId);
}

export { listDrafts, filingStats };
