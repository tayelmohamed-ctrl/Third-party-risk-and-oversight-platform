import { prisma } from "../db/client";
import type {
  AddEvidenceInput,
  CaseEvidenceRecord,
  CreateCaseInput,
  DispositionInput,
  InvestigationCaseRecord,
  UpdateCaseInput,
} from "./types";

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function caseNumber(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const seq = Math.floor(Math.random() * 9000 + 1000);
  return `CLC${y}${m}${day}${seq}`;
}

function slaForSeverity(severity: string): Date {
  const hours = severity === "critical" ? 24 : severity === "high" ? 48 : 72;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function mapCase(r: {
  id: string; caseNumber: string; title: string; customerId: string; customerName: string;
  status: string; priority: string; severity: string; source: string;
  tmAlertId: string | null; screeningCaseId: string | null; onboardingCaseId: string | null;
  assignedTo: string | null; typologyId: string | null; ruleId: string | null; ruleName: string | null;
  craRating: string | null; slaDueAt: Date | null; disposition: string | null;
  dispositionNotes: string | null; disposedBy: string | null; disposedAt: Date | null;
  pipelineStep: number; summary: string | null; metadata: unknown;
  createdAt: Date; updatedAt: Date;
  evidence?: {
    id: string; caseId: string; kind: string; label: string; detail: string | null;
    payload: unknown; createdBy: string; createdAt: Date;
  }[];
}): InvestigationCaseRecord {
  return {
    id: r.id,
    caseNumber: r.caseNumber,
    title: r.title,
    customerId: r.customerId,
    customerName: r.customerName,
    status: r.status as InvestigationCaseRecord["status"],
    priority: r.priority,
    severity: r.severity,
    source: r.source as InvestigationCaseRecord["source"],
    tmAlertId: r.tmAlertId,
    screeningCaseId: r.screeningCaseId,
    onboardingCaseId: r.onboardingCaseId,
    assignedTo: r.assignedTo,
    typologyId: r.typologyId,
    ruleId: r.ruleId,
    ruleName: r.ruleName,
    craRating: r.craRating,
    slaDueAt: r.slaDueAt?.toISOString() ?? null,
    disposition: r.disposition as InvestigationCaseRecord["disposition"],
    dispositionNotes: r.dispositionNotes,
    disposedBy: r.disposedBy,
    disposedAt: r.disposedAt?.toISOString() ?? null,
    pipelineStep: r.pipelineStep,
    summary: r.summary,
    metadata: (r.metadata as Record<string, unknown> | null) ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    evidence: r.evidence?.map(mapEvidence),
  };
}

function mapEvidence(r: {
  id: string; caseId: string; kind: string; label: string; detail: string | null;
  payload: unknown; createdBy: string; createdAt: Date;
}): CaseEvidenceRecord {
  return {
    id: r.id,
    caseId: r.caseId,
    kind: r.kind,
    label: r.label,
    detail: r.detail,
    payload: (r.payload as Record<string, unknown> | null) ?? null,
    createdBy: r.createdBy,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function findCaseByTmAlertId(tmAlertId: string): Promise<InvestigationCaseRecord | null> {
  const row = await prisma.investigationCase.findUnique({ where: { tmAlertId } });
  return row ? mapCase(row) : null;
}

export async function findCaseById(id: string): Promise<InvestigationCaseRecord | null> {
  const row = await prisma.investigationCase.findFirst({
    where: { OR: [{ id }, { caseNumber: id }] },
    include: { evidence: { orderBy: { createdAt: "desc" } } },
  });
  return row ? mapCase(row) : null;
}

export async function listCases(opts?: {
  status?: string;
  limit?: number;
}): Promise<InvestigationCaseRecord[]> {
  const rows = await prisma.investigationCase.findMany({
    where: opts?.status ? { status: opts.status } : undefined,
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 200,
  });
  return rows.map(mapCase);
}

export async function createCase(input: CreateCaseInput): Promise<InvestigationCaseRecord> {
  const severity = input.severity ?? "medium";
  const row = await prisma.investigationCase.create({
    data: {
      id: uid("case"),
      caseNumber: caseNumber(),
      title: input.title,
      customerId: input.customerId,
      customerName: input.customerName,
      source: input.source,
      severity,
      priority: input.priority ?? (severity === "critical" ? "critical" : severity === "high" ? "high" : "medium"),
      tmAlertId: input.tmAlertId ?? null,
      screeningCaseId: input.screeningCaseId ?? null,
      onboardingCaseId: input.onboardingCaseId ?? null,
      ruleId: input.ruleId ?? null,
      ruleName: input.ruleName ?? null,
      typologyId: input.typologyId ?? null,
      craRating: input.craRating ?? null,
      summary: input.summary ?? null,
      metadata: input.metadata ? (input.metadata as object) : null,
      slaDueAt: slaForSeverity(severity),
      status: "open",
    },
  });
  return mapCase(row);
}

export async function updateCase(id: string, input: UpdateCaseInput): Promise<InvestigationCaseRecord | null> {
  const existing = await findCaseById(id);
  if (!existing) return null;

  const row = await prisma.investigationCase.update({
    where: { id: existing.id },
    data: {
      status: input.status,
      assignedTo: input.assignedTo,
      pipelineStep: input.pipelineStep,
      summary: input.summary,
      priority: input.priority,
    },
    include: { evidence: { orderBy: { createdAt: "desc" } } },
  });
  return mapCase(row);
}

export async function addCaseEvidence(
  id: string,
  input: AddEvidenceInput,
  createdBy: string,
): Promise<CaseEvidenceRecord | null> {
  const existing = await findCaseById(id);
  if (!existing) return null;

  const row = await prisma.caseEvidence.create({
    data: {
      id: uid("evd"),
      caseId: existing.id,
      kind: input.kind,
      label: input.label,
      detail: input.detail ?? null,
      payload: input.payload ? (input.payload as object) : null,
      createdBy,
    },
  });
  return mapEvidence(row);
}

export async function disposeCase(
  id: string,
  input: DispositionInput,
  disposedBy: string,
): Promise<InvestigationCaseRecord | null> {
  const existing = await findCaseById(id);
  if (!existing) return null;

  const status = input.disposition === "sar_recommended" ? "pending_mlro" : "closed";
  const row = await prisma.investigationCase.update({
    where: { id: existing.id },
    data: {
      disposition: input.disposition,
      dispositionNotes: input.notes ?? null,
      disposedBy,
      disposedAt: new Date(),
      status,
    },
    include: { evidence: { orderBy: { createdAt: "desc" } } },
  });
  return mapCase(row);
}

export async function caseStats(): Promise<{
  total: number;
  open: number;
  investigating: number;
  pendingMlro: number;
  closed: number;
  breachSlaSoon: number;
}> {
  const all = await prisma.investigationCase.findMany({
    select: { status: true, slaDueAt: true, disposition: true },
  });
  const soon = Date.now() + 6 * 60 * 60 * 1000;
  return {
    total: all.length,
    open: all.filter((c) => c.status === "open" || c.status === "assigned").length,
    investigating: all.filter((c) => c.status === "investigating").length,
    pendingMlro: all.filter((c) => c.status === "pending_mlro").length,
    closed: all.filter((c) => c.status === "closed").length,
    breachSlaSoon: all.filter(
      (c) => c.slaDueAt && c.status !== "closed" && c.slaDueAt.getTime() < soon,
    ).length,
  };
}
