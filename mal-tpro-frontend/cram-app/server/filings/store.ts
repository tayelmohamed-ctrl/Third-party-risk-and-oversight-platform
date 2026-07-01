import { prisma } from "../db/client";
import type {
  FilingDraftBody,
  FilingDraftRecord,
  FilingStatus,
  FilingType,
  UpdateFilingDraftInput,
} from "./types";

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function mapDraft(r: {
  id: string;
  caseId: string | null;
  filingType: string;
  templateId: string | null;
  status: string;
  customerId: string;
  customerName: string;
  title: string | null;
  body: unknown;
  createdBy: string;
  checkerBy: string | null;
  mlroBy: string | null;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): FilingDraftRecord {
  return {
    id: r.id,
    caseId: r.caseId,
    filingType: r.filingType as FilingType,
    templateId: r.templateId,
    status: r.status as FilingStatus,
    customerId: r.customerId,
    customerName: r.customerName,
    title: r.title,
    body: (r.body as FilingDraftBody | null) ?? null,
    createdBy: r.createdBy,
    checkerBy: r.checkerBy,
    mlroBy: r.mlroBy,
    submittedAt: r.submittedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function findDraftById(id: string): Promise<FilingDraftRecord | null> {
  const row = await prisma.filingDraft.findUnique({ where: { id } });
  return row ? mapDraft(row) : null;
}

export async function findDraftByCaseId(
  caseId: string,
  filingType?: FilingType,
): Promise<FilingDraftRecord | null> {
  const row = await prisma.filingDraft.findFirst({
    where: {
      caseId,
      ...(filingType ? { filingType } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  return row ? mapDraft(row) : null;
}

export async function listDrafts(opts?: {
  status?: string;
  caseId?: string;
  limit?: number;
}): Promise<FilingDraftRecord[]> {
  const rows = await prisma.filingDraft.findMany({
    where: {
      ...(opts?.status ? { status: opts.status } : {}),
      ...(opts?.caseId ? { caseId: opts.caseId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 200,
  });
  return rows.map(mapDraft);
}

export async function createDraft(input: {
  caseId: string;
  filingType: FilingType;
  templateId: string;
  title: string;
  customerId: string;
  customerName: string;
  body: FilingDraftBody;
  createdBy: string;
}): Promise<FilingDraftRecord> {
  return createDraftStandalone({ ...input, caseId: input.caseId });
}

export async function createDraftStandalone(input: {
  caseId?: string | null;
  filingType: FilingType;
  templateId: string;
  title: string;
  customerId: string;
  customerName: string;
  body: FilingDraftBody;
  createdBy: string;
}): Promise<FilingDraftRecord> {
  const row = await prisma.filingDraft.create({
    data: {
      id: uid("fil"),
      caseId: input.caseId ?? null,
      filingType: input.filingType,
      templateId: input.templateId,
      status: "draft",
      customerId: input.customerId,
      customerName: input.customerName,
      title: input.title,
      body: input.body as object,
      createdBy: input.createdBy,
    },
  });
  return mapDraft(row);
}

export async function updateDraft(
  id: string,
  input: UpdateFilingDraftInput,
): Promise<FilingDraftRecord | null> {
  const existing = await findDraftById(id);
  if (!existing) return null;

  const row = await prisma.filingDraft.update({
    where: { id },
    data: {
      status: input.status,
      checkerBy: input.checkerBy,
      mlroBy: input.mlroBy,
      title: input.title,
      body: input.body ? (input.body as object) : undefined,
      filingType: input.filingType,
      templateId: input.templateId,
      submittedAt: input.status === "submitted" ? new Date() : undefined,
    },
  });
  return mapDraft(row);
}

export async function filingStats(): Promise<{
  total: number;
  draft: number;
  pendingReview: number;
  mlroApproved: number;
  submitted: number;
}> {
  const all = await prisma.filingDraft.findMany({ select: { status: true } });
  return {
    total: all.length,
    draft: all.filter((f) => f.status === "draft").length,
    pendingReview: all.filter((f) => f.status === "pending_review").length,
    mlroApproved: all.filter((f) => f.status === "mlro_approved").length,
    submitted: all.filter((f) => f.status === "submitted").length,
  };
}
