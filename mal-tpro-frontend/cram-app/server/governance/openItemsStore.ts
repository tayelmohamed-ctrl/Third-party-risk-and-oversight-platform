import { prisma } from "../db/client";
import { OPEN_ITEMS_REGISTER, type OpenItemStatus } from "../../src/config/openItemsRegister";
import { appendAudit } from "../db/auditStore";

export interface OpenItemRow {
  id: string;
  title: string;
  where: string;
  impact: string;
  dispositionNeeded: string;
  buildHandling: string;
  status: OpenItemStatus;
  decision?: string;
  dispositionedBy?: string;
  dispositionedAt?: string;
}

function rowToOpenItem(r: {
  id: string; title: string; whereField: string; impact: string;
  dispositionNeeded: string; buildHandling: string; status: string;
  decision: string | null; dispositionedBy: string | null; dispositionedAt: Date | null;
}): OpenItemRow {
  return {
    id: r.id,
    title: r.title,
    where: r.whereField,
    impact: r.impact,
    dispositionNeeded: r.dispositionNeeded,
    buildHandling: r.buildHandling,
    status: r.status as OpenItemStatus,
    decision: r.decision ?? undefined,
    dispositionedBy: r.dispositionedBy ?? undefined,
    dispositionedAt: r.dispositionedAt?.toISOString(),
  };
}

export async function listOpenItems(): Promise<OpenItemRow[]> {
  const rows = await prisma.openItem.findMany({ orderBy: { id: "asc" } });
  return rows.map(rowToOpenItem);
}

export async function openItemCountsFromDb(): Promise<{ open: number; accepted: number; corrected: number; total: number }> {
  const items = await listOpenItems();
  return {
    open: items.filter((i) => i.status === "open").length,
    accepted: items.filter((i) => i.status === "accepted").length,
    corrected: items.filter((i) => i.status === "corrected").length,
    total: items.length,
  };
}

export async function dispositionOpenItem(args: {
  id: string;
  status: "accepted" | "corrected";
  decision: string;
  actor: string;
}): Promise<OpenItemRow | null> {
  const existing = await prisma.openItem.findUnique({ where: { id: args.id } });
  if (!existing) return null;

  const updated = await prisma.openItem.update({
    where: { id: args.id },
    data: {
      status: args.status,
      decision: args.decision,
      dispositionedBy: args.actor,
      dispositionedAt: new Date(),
    },
  });

  await appendAudit({
    actor: args.actor,
    action: "open_item.dispositioned",
    entity: "open_item",
    entityId: args.id,
    detail: `Item #${args.id} → ${args.status}: ${args.decision}`,
    before: existing.status,
    after: args.status,
  });

  return rowToOpenItem(updated);
}

/** Seed from static register; close items #3 and #5 with MLRO sign-off on first bootstrap. */
export async function seedOpenItemsIfEmpty(): Promise<void> {
  const count = await prisma.openItem.count();
  if (count > 0) return;

  const signOffDate = "2026-06-29";
  const seedItems = OPEN_ITEMS_REGISTER.map((item) => {
    let status = item.status;
    let decision = item.decision;
    if (item.id === "3") {
      status = "accepted";
      decision = `Library refresh QA complete (${signOffDate}) — safe-haven values validated on G1 load; no #VALUE! in country_risk.csv`;
    }
    if (item.id === "5") {
      status = "accepted";
      decision = `MLRO accepted (${signOffDate}): LP scoring uses ISIC Rev.5 quantitative library + legal-type register; entity sub-factors documented in exam pack with quarterly remediation review`;
    }
    return {
      id: item.id,
      title: item.title,
      whereField: item.where,
      impact: item.impact,
      dispositionNeeded: item.dispositionNeeded,
      buildHandling: item.buildHandling,
      status,
      decision: decision ?? null,
      dispositionedBy: status !== "open" ? "mlro@mal.ae" : null,
      dispositionedAt: status !== "open" ? new Date(signOffDate) : null,
    };
  });

  await prisma.openItem.createMany({ data: seedItems });
}
