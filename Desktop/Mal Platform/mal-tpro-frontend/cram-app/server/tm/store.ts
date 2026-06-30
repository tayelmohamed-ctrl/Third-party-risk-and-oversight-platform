import { prisma } from "../db/client";
import type { LicenseRegion } from "../../src/config/partnerIntegration";
import type { OscilarAlertType, OscilarSeverity, TmAlertRecord, TmAlertStatus } from "./types";

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function rowToRecord(r: {
  id: string; oscilarAlertId: string; oscilarCaseId: string | null;
  customerId: string; customerName: string; alertType: string; severity: string;
  ruleId: string | null; ruleName: string | null; channel: string | null;
  amount: number | null; currency: string | null; licenseRegion: string;
  status: string; listHit: boolean; vital4CaseId: string | null;
  cramScreeningId: string | null; feedEventId: string | null; feedOutcome: string | null;
  paymentRef: string | null; createdAt: Date; updatedAt: Date;
}): TmAlertRecord {
  return {
    id: r.id,
    oscilarAlertId: r.oscilarAlertId,
    oscilarCaseId: r.oscilarCaseId,
    customerId: r.customerId,
    customerName: r.customerName,
    alertType: r.alertType as OscilarAlertType,
    severity: r.severity as OscilarSeverity,
    ruleId: r.ruleId,
    ruleName: r.ruleName,
    channel: r.channel,
    amount: r.amount,
    currency: r.currency,
    licenseRegion: r.licenseRegion as LicenseRegion,
    status: r.status as TmAlertStatus,
    listHit: r.listHit,
    vital4CaseId: r.vital4CaseId,
    cramScreeningId: r.cramScreeningId,
    feedEventId: r.feedEventId,
    feedOutcome: r.feedOutcome,
    paymentRef: r.paymentRef,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function createTmAlert(data: {
  oscilarAlertId: string;
  oscilarCaseId?: string;
  customerId: string;
  customerName: string;
  alertType: OscilarAlertType;
  severity: OscilarSeverity;
  ruleId?: string;
  ruleName?: string;
  channel?: string;
  amount?: number;
  currency?: string;
  licenseRegion: LicenseRegion;
  listHit: boolean;
  paymentRef?: string;
  rawPayload: unknown;
}): Promise<TmAlertRecord> {
  const row = await prisma.tmAlert.create({
    data: {
      id: uid("tma"),
      oscilarAlertId: data.oscilarAlertId,
      oscilarCaseId: data.oscilarCaseId ?? null,
      customerId: data.customerId,
      customerName: data.customerName,
      alertType: data.alertType,
      severity: data.severity,
      ruleId: data.ruleId ?? null,
      ruleName: data.ruleName ?? null,
      channel: data.channel ?? null,
      amount: data.amount ?? null,
      currency: data.currency ?? null,
      licenseRegion: data.licenseRegion,
      listHit: data.listHit,
      paymentRef: data.paymentRef ?? null,
      rawPayload: data.rawPayload as object,
      status: "open",
    },
  });
  return rowToRecord(row);
}

export async function findTmAlertByOscilarId(oscilarAlertId: string): Promise<TmAlertRecord | null> {
  const row = await prisma.tmAlert.findUnique({ where: { oscilarAlertId } });
  return row ? rowToRecord(row) : null;
}

export async function findTmAlertById(id: string): Promise<TmAlertRecord | null> {
  const row = await prisma.tmAlert.findUnique({ where: { id } });
  return row ? rowToRecord(row) : null;
}

export async function listTmAlerts(opts?: {
  status?: TmAlertStatus;
  severity?: OscilarSeverity;
  limit?: number;
}): Promise<TmAlertRecord[]> {
  const rows = await prisma.tmAlert.findMany({
    where: {
      ...(opts?.status && { status: opts.status }),
      ...(opts?.severity && { severity: opts.severity }),
    },
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 100,
  });
  return rows.map(rowToRecord);
}

export async function listTmAlertsForCustomer(customerId: string): Promise<TmAlertRecord[]> {
  const rows = await prisma.tmAlert.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(rowToRecord);
}

export async function updateTmAlert(
  id: string,
  data: Partial<{
    status: TmAlertStatus;
    vital4CaseId: string;
    cramScreeningId: string;
    feedEventId: string;
    feedOutcome: string;
  }>,
): Promise<TmAlertRecord | null> {
  try {
    const row = await prisma.tmAlert.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.vital4CaseId && { vital4CaseId: data.vital4CaseId }),
        ...(data.cramScreeningId && { cramScreeningId: data.cramScreeningId }),
        ...(data.feedEventId && { feedEventId: data.feedEventId }),
        ...(data.feedOutcome && { feedOutcome: data.feedOutcome }),
      },
    });
    return rowToRecord(row);
  } catch {
    return null;
  }
}

export async function findCaseLinkByOscilarAlert(oscilarAlertId: string) {
  return prisma.caseLink.findFirst({ where: { oscilarAlertId } });
}
