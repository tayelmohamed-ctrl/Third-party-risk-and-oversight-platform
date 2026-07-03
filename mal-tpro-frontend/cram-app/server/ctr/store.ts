import { prisma } from "../db/client";
import type { CtrObligationRecord, RegisterCtrInput } from "./types";

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function mapRow(r: {
  id: string; customerId: string; customerName: string; transactionDate: Date;
  cashIn: number | null; cashOut: number | null; aggregateUsd: number; currency: string;
  channel: string | null; accountNumber: string | null; tin: string | null;
  branchLocation: string | null; aggregated: boolean; aggregationNote: string | null;
  status: string; filingDraftId: string | null; tmAlertId: string | null;
  licenseRegion: string; dueAt: Date; filedAt: Date | null; metadata: unknown;
  createdAt: Date; updatedAt: Date;
}): CtrObligationRecord {
  return {
    id: r.id,
    customerId: r.customerId,
    customerName: r.customerName,
    transactionDate: r.transactionDate.toISOString(),
    cashIn: r.cashIn,
    cashOut: r.cashOut,
    aggregateUsd: r.aggregateUsd,
    currency: r.currency,
    channel: r.channel,
    accountNumber: r.accountNumber,
    tin: r.tin,
    branchLocation: r.branchLocation,
    aggregated: r.aggregated,
    aggregationNote: r.aggregationNote,
    status: r.status as CtrObligationRecord["status"],
    filingDraftId: r.filingDraftId,
    tmAlertId: r.tmAlertId,
    licenseRegion: r.licenseRegion,
    dueAt: r.dueAt.toISOString(),
    filedAt: r.filedAt?.toISOString() ?? null,
    metadata: (r.metadata as Record<string, unknown>) ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function findCtrById(id: string): Promise<CtrObligationRecord | null> {
  const row = await prisma.ctrObligation.findUnique({ where: { id } });
  return row ? mapRow(row) : null;
}

export async function findCtrByTmAlert(tmAlertId: string): Promise<CtrObligationRecord | null> {
  const row = await prisma.ctrObligation.findFirst({ where: { tmAlertId } });
  return row ? mapRow(row) : null;
}

export async function listCtrObligations(opts?: {
  status?: string;
  limit?: number;
}): Promise<CtrObligationRecord[]> {
  const rows = await prisma.ctrObligation.findMany({
    where: opts?.status ? { status: opts.status } : undefined,
    orderBy: { dueAt: "asc" },
    take: opts?.limit ?? 200,
  });
  return rows.map(mapRow);
}

export async function createCtrObligation(input: RegisterCtrInput): Promise<CtrObligationRecord> {
  const row = await prisma.ctrObligation.create({
    data: {
      id: uid("ctr"),
      customerId: input.customerId,
      customerName: input.customerName,
      transactionDate: new Date(input.transactionDate),
      cashIn: input.cashIn ?? null,
      cashOut: input.cashOut ?? null,
      aggregateUsd: input.aggregateUsd,
      currency: input.currency ?? "USD",
      channel: input.channel ?? null,
      accountNumber: input.accountNumber ?? null,
      tin: input.tin ?? null,
      branchLocation: input.branchLocation ?? null,
      aggregated: input.aggregated ?? false,
      aggregationNote: input.aggregationNote ?? null,
      status: "pending",
      tmAlertId: input.tmAlertId ?? null,
      licenseRegion: input.licenseRegion ?? "US",
      dueAt: input.dueAt,
      metadata: input.metadata ? (input.metadata as object) : null,
    },
  });
  return mapRow(row);
}

export async function updateCtrObligation(
  id: string,
  data: Partial<{
    status: string;
    filingDraftId: string | null;
    filedAt: Date | null;
  }>,
): Promise<CtrObligationRecord | null> {
  const existing = await findCtrById(id);
  if (!existing) return null;
  const row = await prisma.ctrObligation.update({
    where: { id },
    data,
  });
  return mapRow(row);
}

export async function ctrStats(): Promise<{
  total: number;
  pending: number;
  draftCreated: number;
  filed: number;
  overdue: number;
  dueSoon: number;
}> {
  const all = await listCtrObligations({ limit: 500 });
  const now = Date.now();
  const soon = now + 3 * 24 * 60 * 60 * 1000;
  return {
    total: all.length,
    pending: all.filter((o) => o.status === "pending").length,
    draftCreated: all.filter((o) => o.status === "draft_created").length,
    filed: all.filter((o) => o.status === "filed").length,
    overdue: all.filter((o) => o.status !== "filed" && new Date(o.dueAt).getTime() < now).length,
    dueSoon: all.filter((o) => o.status !== "filed" && new Date(o.dueAt).getTime() <= soon && new Date(o.dueAt).getTime() >= now).length,
  };
}

export async function seedCtrIfEmpty(): Promise<number> {
  const count = await prisma.ctrObligation.count();
  if (count > 0) return 0;

  const txnDate = new Date();
  txnDate.setDate(txnDate.getDate() - 2);
  const dueAt = new Date(txnDate);
  dueAt.setDate(dueAt.getDate() + 15);

  await createCtrObligation({
    customerId: "US-BAAS-0042",
    customerName: "Riverdale Cash Services LLC",
    transactionDate: txnDate.toISOString(),
    cashIn: 12500,
    cashOut: 0,
    aggregateUsd: 12500,
    channel: "branch_cash_deposit",
    accountNumber: "****4821",
    tin: "88-1234567",
    branchLocation: "Mal US BaaS · New York correspondent node",
    licenseRegion: "US",
    dueAt,
    metadata: { seed: true, ruleId: "OS-TM-001" },
  });

  return 1;
}
