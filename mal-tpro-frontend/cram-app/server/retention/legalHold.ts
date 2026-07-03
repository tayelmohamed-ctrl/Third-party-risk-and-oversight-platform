import { appendAudit } from "../db/auditStore";
import { prisma } from "../db/client";
import type { CreateLegalHoldInput, LegalHoldRecord } from "./types";

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function mapHold(r: {
  id: string; scopeType: string; scopeId: string | null; customerId: string | null;
  reason: string; matterRef: string | null; placedBy: string; placedAt: Date;
  releasedBy: string | null; releasedAt: Date | null; status: string;
  metadata: unknown; createdAt: Date; updatedAt: Date;
}): LegalHoldRecord {
  return {
    id: r.id,
    scopeType: r.scopeType as LegalHoldRecord["scopeType"],
    scopeId: r.scopeId,
    customerId: r.customerId,
    reason: r.reason,
    matterRef: r.matterRef,
    placedBy: r.placedBy,
    placedAt: r.placedAt.toISOString(),
    releasedBy: r.releasedBy,
    releasedAt: r.releasedAt?.toISOString() ?? null,
    status: r.status as LegalHoldRecord["status"],
    metadata: (r.metadata as Record<string, unknown>) ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function listLegalHolds(opts?: { status?: string }): Promise<LegalHoldRecord[]> {
  const rows = await prisma.legalHold.findMany({
    where: opts?.status ? { status: opts.status } : undefined,
    orderBy: { placedAt: "desc" },
    take: 200,
  });
  return rows.map(mapHold);
}

export async function findLegalHold(id: string): Promise<LegalHoldRecord | null> {
  const row = await prisma.legalHold.findUnique({ where: { id } });
  return row ? mapHold(row) : null;
}

export async function activeLegalHolds(): Promise<LegalHoldRecord[]> {
  return listLegalHolds({ status: "active" });
}

export async function createLegalHold(input: CreateLegalHoldInput, actor: string): Promise<LegalHoldRecord> {
  const row = await prisma.legalHold.create({
    data: {
      id: uid("hold"),
      scopeType: input.scopeType,
      scopeId: input.scopeId ?? null,
      customerId: input.customerId ?? null,
      reason: input.reason,
      matterRef: input.matterRef ?? null,
      placedBy: actor,
      status: "active",
      metadata: input.metadata ? (input.metadata as object) : null,
    },
  });
  await appendAudit({
    actor,
    action: "retention.legal_hold.placed",
    entity: "legal_hold",
    entityId: row.id,
    detail: `${input.scopeType} · ${input.reason.slice(0, 80)}`,
    after: "active",
  });
  return mapHold(row);
}

export async function releaseLegalHold(id: string, actor: string): Promise<LegalHoldRecord | null> {
  const existing = await findLegalHold(id);
  if (!existing || existing.status !== "active") return null;
  const row = await prisma.legalHold.update({
    where: { id },
    data: {
      status: "released",
      releasedBy: actor,
      releasedAt: new Date(),
    },
  });
  await appendAudit({
    actor,
    action: "retention.legal_hold.released",
    entity: "legal_hold",
    entityId: id,
    detail: `Released hold ${id}`,
    after: "released",
  });
  return mapHold(row);
}

export async function legalHoldCount(): Promise<number> {
  return prisma.legalHold.count({ where: { status: "active" } });
}

/** Returns hold IDs affecting a record (customer, case, filing, or global). */
export function matchingHoldIds(
  holds: LegalHoldRecord[],
  ctx: { customerId?: string | null; caseId?: string | null; filingId?: string | null },
): string[] {
  const ids: string[] = [];
  for (const h of holds) {
    if (h.status !== "active") continue;
    if (h.scopeType === "global") {
      ids.push(h.id);
      continue;
    }
    if (h.scopeType === "customer" && ctx.customerId && (h.customerId === ctx.customerId || h.scopeId === ctx.customerId)) {
      ids.push(h.id);
    }
    if (h.scopeType === "case" && ctx.caseId && h.scopeId === ctx.caseId) {
      ids.push(h.id);
    }
    if (h.scopeType === "investigation" && ctx.caseId && h.scopeId === ctx.caseId) {
      ids.push(h.id);
    }
    if (h.scopeType === "filing" && ctx.filingId && h.scopeId === ctx.filingId) {
      ids.push(h.id);
    }
    if (ctx.customerId && h.customerId === ctx.customerId && h.scopeType !== "global") {
      ids.push(h.id);
    }
  }
  return [...new Set(ids)];
}

export async function seedLegalHoldIfEmpty(): Promise<number> {
  const count = await prisma.legalHold.count();
  if (count > 0) return 0;
  await createLegalHold({
    scopeType: "customer",
    customerId: "US-BAAS-0042",
    scopeId: "US-BAAS-0042",
    reason: "Demo legal hold — Zenus sponsor exam prep; suspend archive eligibility",
    matterRef: "LH-2026-ZENUS-001",
  }, "system:retention-seed");
  return 1;
}
