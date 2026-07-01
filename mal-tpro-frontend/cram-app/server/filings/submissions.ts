import { prisma } from "../db/client";
import type { GoamlSubmitResult } from "../goaml/client";
import type { FincenPayload, GoamlPayload } from "../goaml/payloadBuilder";

function uid(): string {
  return `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface FilingSubmissionRecord {
  id: string;
  filingDraftId: string;
  fiuSystem: string;
  fiuReference: string | null;
  status: string;
  submittedBy: string;
  submittedAt: string;
  payload: GoamlPayload | FincenPayload | null;
  response: GoamlSubmitResult | null;
}

export async function createSubmission(input: {
  filingDraftId: string;
  fiuSystem: string;
  fiuReference: string | null;
  status: string;
  payload: GoamlPayload | FincenPayload;
  response: GoamlSubmitResult;
  submittedBy: string;
}): Promise<FilingSubmissionRecord> {
  const row = await prisma.filingSubmission.create({
    data: {
      id: uid(),
      filingDraftId: input.filingDraftId,
      fiuSystem: input.fiuSystem,
      fiuReference: input.fiuReference,
      status: input.status,
      payload: input.payload as object,
      response: input.response as object,
      submittedBy: input.submittedBy,
    },
  });
  return {
    id: row.id,
    filingDraftId: row.filingDraftId,
    fiuSystem: row.fiuSystem,
    fiuReference: row.fiuReference,
    status: row.status,
    submittedBy: row.submittedBy,
    submittedAt: row.submittedAt.toISOString(),
    payload: row.payload as GoamlPayload | FincenPayload | null,
    response: row.response as GoamlSubmitResult | null,
  };
}

export async function findSubmissionsByDraft(filingDraftId: string): Promise<FilingSubmissionRecord[]> {
  const rows = await prisma.filingSubmission.findMany({
    where: { filingDraftId },
    orderBy: { submittedAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    filingDraftId: r.filingDraftId,
    fiuSystem: r.fiuSystem,
    fiuReference: r.fiuReference,
    status: r.status,
    submittedBy: r.submittedBy,
    submittedAt: r.submittedAt.toISOString(),
    payload: r.payload as GoamlPayload | FincenPayload | null,
    response: r.response as GoamlSubmitResult | null,
  }));
}

export async function findSubmissionById(id: string): Promise<FilingSubmissionRecord | null> {
  const r = await prisma.filingSubmission.findUnique({ where: { id } });
  if (!r) return null;
  return {
    id: r.id,
    filingDraftId: r.filingDraftId,
    fiuSystem: r.fiuSystem,
    fiuReference: r.fiuReference,
    status: r.status,
    submittedBy: r.submittedBy,
    submittedAt: r.submittedAt.toISOString(),
    payload: r.payload as GoamlPayload | FincenPayload | null,
    response: r.response as GoamlSubmitResult | null,
  };
}
