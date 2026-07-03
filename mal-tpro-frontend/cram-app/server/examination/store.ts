import { prisma } from "../db/client";
import type { ExaminationItemRecord, ExaminationStatus, UpdateExaminationInput } from "./types";

function mapItem(r: {
  id: string;
  domainId: string;
  domainName: string;
  procedure: string;
  ffiecRef: string;
  status: string;
  owner: string | null;
  evidenceRoute: string | null;
  evidenceType: string | null;
  notes: string | null;
  autoScore: number | null;
  lastReviewedAt: Date | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ExaminationItemRecord {
  return {
    id: r.id,
    domainId: r.domainId,
    domainName: r.domainName,
    procedure: r.procedure,
    ffiecRef: r.ffiecRef,
    status: r.status as ExaminationStatus,
    owner: r.owner,
    evidenceRoute: r.evidenceRoute,
    evidenceType: r.evidenceType,
    notes: r.notes,
    autoScore: r.autoScore,
    lastReviewedAt: r.lastReviewedAt?.toISOString() ?? null,
    updatedBy: r.updatedBy,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function examinationCount(): Promise<number> {
  return prisma.examinationItem.count();
}

export async function listExaminationItems(opts?: {
  domainId?: string;
  status?: string;
}): Promise<ExaminationItemRecord[]> {
  const rows = await prisma.examinationItem.findMany({
    where: {
      ...(opts?.domainId ? { domainId: opts.domainId } : {}),
      ...(opts?.status ? { status: opts.status } : {}),
    },
    orderBy: [{ domainId: "asc" }, { id: "asc" }],
  });
  return rows.map(mapItem);
}

export async function findExaminationItem(id: string): Promise<ExaminationItemRecord | null> {
  const row = await prisma.examinationItem.findUnique({ where: { id } });
  return row ? mapItem(row) : null;
}

export async function upsertExaminationItem(input: {
  id: string;
  domainId: string;
  domainName: string;
  procedure: string;
  ffiecRef: string;
  owner?: string;
  evidenceRoute?: string;
  evidenceType?: string;
  status?: ExaminationStatus;
  autoScore?: number;
}): Promise<ExaminationItemRecord> {
  const row = await prisma.examinationItem.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      domainId: input.domainId,
      domainName: input.domainName,
      procedure: input.procedure,
      ffiecRef: input.ffiecRef,
      owner: input.owner ?? null,
      evidenceRoute: input.evidenceRoute ?? null,
      evidenceType: input.evidenceType ?? null,
      status: input.status ?? "not_started",
      autoScore: input.autoScore ?? null,
    },
    update: {
      domainName: input.domainName,
      procedure: input.procedure,
      ffiecRef: input.ffiecRef,
      owner: input.owner ?? undefined,
      evidenceRoute: input.evidenceRoute ?? undefined,
      evidenceType: input.evidenceType ?? undefined,
      autoScore: input.autoScore ?? undefined,
    },
  });
  return mapItem(row);
}

export async function updateExaminationItem(
  id: string,
  input: UpdateExaminationInput & { autoScore?: number; updatedBy?: string },
): Promise<ExaminationItemRecord | null> {
  const existing = await findExaminationItem(id);
  if (!existing) return null;

  const row = await prisma.examinationItem.update({
    where: { id },
    data: {
      status: input.status,
      notes: input.notes,
      owner: input.owner,
      autoScore: input.autoScore,
      updatedBy: input.updatedBy,
      lastReviewedAt: input.lastReviewedAt ? new Date(input.lastReviewedAt) : input.status ? new Date() : undefined,
    },
  });
  return mapItem(row);
}
