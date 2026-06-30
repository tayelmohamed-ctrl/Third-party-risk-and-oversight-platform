import { prisma } from "../db/client";
import type { LicenseRegion } from "../../src/config/partnerIntegration";
import type {
  ScreeningCaseRecord, ScreeningDisposition, ScreeningSnapshot,
  ScreeningCaseStatus, ScreeningType,
} from "./types";

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function rowToRecord(r: {
  id: string; customerId: string; customerName: string; vendor: string; vendorCaseId: string;
  screeningType: string; status: string; licenseRegion: string;
  sanctions: string | null; pep: string | null; adverse: string | null; watchlist: string | null;
  disposition: string; dispositionNotes: string | null; disposedBy: string | null;
  disposedAt: Date | null; slaDueAt: Date | null; mirrorSource: string | null;
  oscilarAlertId: string | null; snapshot: unknown; createdAt: Date; updatedAt: Date;
}): ScreeningCaseRecord {
  return {
    id: r.id,
    customerId: r.customerId,
    customerName: r.customerName,
    vendor: r.vendor,
    vendorCaseId: r.vendorCaseId,
    screeningType: r.screeningType as ScreeningType,
    status: r.status as ScreeningCaseStatus,
    licenseRegion: r.licenseRegion as LicenseRegion,
    sanctions: r.sanctions as ScreeningCaseRecord["sanctions"],
    pep: r.pep as ScreeningCaseRecord["pep"],
    adverse: r.adverse as ScreeningCaseRecord["adverse"],
    watchlist: r.watchlist as ScreeningCaseRecord["watchlist"],
    disposition: r.disposition as ScreeningDisposition,
    dispositionNotes: r.dispositionNotes,
    disposedBy: r.disposedBy,
    disposedAt: r.disposedAt?.toISOString() ?? null,
    slaDueAt: r.slaDueAt?.toISOString() ?? null,
    mirrorSource: r.mirrorSource,
    oscilarAlertId: r.oscilarAlertId,
    snapshot: r.snapshot as ScreeningSnapshot | null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function createScreeningCase(data: {
  customerId: string;
  customerName: string;
  vendorCaseId: string;
  screeningType?: ScreeningType;
  licenseRegion: LicenseRegion;
  status?: ScreeningCaseStatus;
  snapshot?: ScreeningSnapshot;
  rawPayload?: unknown;
  mirrorSource?: string;
  oscilarAlertId?: string;
  slaDueAt?: Date | null;
}): Promise<ScreeningCaseRecord> {
  const id = uid("scr");
  const snap = data.snapshot;
  const row = await prisma.screeningCase.create({
    data: {
      id,
      customerId: data.customerId,
      customerName: data.customerName,
      vendor: "vital4",
      vendorCaseId: data.vendorCaseId,
      screeningType: data.screeningType ?? "bundle",
      status: data.status ?? "pending",
      licenseRegion: data.licenseRegion,
      sanctions: snap?.sanctions ?? null,
      pep: snap?.pep ?? null,
      adverse: snap?.adverse ?? null,
      watchlist: snap?.watchlist ?? null,
      disposition: snap?.disposition ?? "pending",
      slaDueAt: data.slaDueAt ?? null,
      mirrorSource: data.mirrorSource ?? null,
      oscilarAlertId: data.oscilarAlertId ?? null,
      rawPayload: data.rawPayload ? (data.rawPayload as object) : null,
      snapshot: snap ? (snap as object) : null,
    },
  });
  return rowToRecord(row);
}

export async function updateScreeningFromWebhook(
  vendorCaseId: string,
  update: {
    status: ScreeningCaseStatus;
    snapshot: ScreeningSnapshot;
    rawPayload: unknown;
    slaDueAt?: Date | null;
  },
): Promise<ScreeningCaseRecord | null> {
  const existing = await prisma.screeningCase.findFirst({ where: { vendor: "vital4", vendorCaseId } });
  if (!existing) return null;
  const row = await prisma.screeningCase.update({
    where: { id: existing.id },
    data: {
      status: update.status,
      sanctions: update.snapshot.sanctions,
      pep: update.snapshot.pep,
      adverse: update.snapshot.adverse,
      watchlist: update.snapshot.watchlist,
      disposition: update.snapshot.disposition,
      snapshot: update.snapshot as object,
      rawPayload: update.rawPayload as object,
      slaDueAt: update.slaDueAt ?? existing.slaDueAt,
    },
  });
  return rowToRecord(row);
}

export async function findCaseByVendorId(vendorCaseId: string): Promise<ScreeningCaseRecord | null> {
  const row = await prisma.screeningCase.findFirst({ where: { vendor: "vital4", vendorCaseId } });
  return row ? rowToRecord(row) : null;
}

export async function findCaseById(id: string): Promise<ScreeningCaseRecord | null> {
  const row = await prisma.screeningCase.findUnique({ where: { id } });
  return row ? rowToRecord(row) : null;
}

export async function latestScreeningForCustomer(customerId: string): Promise<ScreeningCaseRecord | null> {
  const row = await prisma.screeningCase.findFirst({
    where: { customerId },
    orderBy: { createdAt: "desc" },
  });
  return row ? rowToRecord(row) : null;
}

export async function listScreeningForCustomer(customerId: string): Promise<ScreeningCaseRecord[]> {
  const rows = await prisma.screeningCase.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(rowToRecord);
}

/** Disposition queue — pending analyst review (Phase 1c). */
export async function listScreeningQueue(opts?: {
  disposition?: ScreeningDisposition;
  limit?: number;
}): Promise<ScreeningCaseRecord[]> {
  const disposition = opts?.disposition ?? "pending";
  const rows = await prisma.screeningCase.findMany({
    where: {
      disposition,
      status: { in: ["potential", "pending", "true_match"] },
    },
    orderBy: [{ slaDueAt: "asc" }, { createdAt: "desc" }],
    take: opts?.limit ?? 100,
  });
  return rows.map(rowToRecord);
}

export async function applyDisposition(
  caseId: string,
  disposition: ScreeningDisposition,
  disposedBy: string,
  notes?: string,
): Promise<ScreeningCaseRecord | null> {
  const existing = await prisma.screeningCase.findUnique({ where: { id: caseId } });
  if (!existing) return null;

  const snap = existing.snapshot as ScreeningSnapshot | null;
  let sanctions = existing.sanctions;
  let adverse = existing.adverse;
  let watchlist = existing.watchlist;
  let status: ScreeningCaseStatus = existing.status as ScreeningCaseStatus;

  if (disposition === "false_positive") {
    sanctions = "Clear";
    adverse = "None";
    watchlist = "Clear";
    status = "false_positive";
  } else if (disposition === "true_match") {
    status = "true_match";
    if (sanctions === "Potential Match") sanctions = "True Match";
    if (adverse === "Potential") adverse = "True Match";
    watchlist = watchlist === "Clear" ? watchlist : "True Match";
  } else {
    status = "clear";
  }

  const updatedSnap: ScreeningSnapshot | null = snap ? {
    ...snap,
    sanctions: (sanctions ?? snap.sanctions) as ScreeningSnapshot["sanctions"],
    adverse: (adverse ?? snap.adverse) as ScreeningSnapshot["adverse"],
    watchlist: (watchlist ?? snap.watchlist) as ScreeningSnapshot["watchlist"],
    disposition,
    screenedAt: new Date().toISOString(),
  } : null;

  const row = await prisma.screeningCase.update({
    where: { id: caseId },
    data: {
      disposition,
      dispositionNotes: notes ?? null,
      disposedBy,
      disposedAt: new Date(),
      status,
      sanctions,
      adverse,
      watchlist,
      snapshot: updatedSnap ? (updatedSnap as object) : existing.snapshot,
      slaDueAt: null,
    },
  });
  return rowToRecord(row);
}

export async function logWebhook(vendor: string, eventId: string, payload: unknown, outcome: string, detail?: string): Promise<boolean> {
  try {
    await prisma.webhookLog.create({
      data: {
        id: uid("wh"),
        vendor,
        eventId,
        payload: payload as object,
        outcome,
        detail: detail ?? null,
      },
    });
    return true;
  } catch {
    return false; // duplicate event_id — idempotent
  }
}

export async function createCaseLink(data: {
  customerId: string;
  cramScreeningId: string;
  vital4CaseId: string;
  oscilarAlertId?: string;
  oscilarCaseId?: string;
}) {
  return prisma.caseLink.create({
    data: {
      id: uid("link"),
      customerId: data.customerId,
      cramScreeningId: data.cramScreeningId,
      vital4CaseId: data.vital4CaseId,
      oscilarAlertId: data.oscilarAlertId ?? null,
      oscilarCaseId: data.oscilarCaseId ?? null,
    },
  });
}
