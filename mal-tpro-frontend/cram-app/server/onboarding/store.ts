import { prisma } from "../db/client";
import type { LicenseRegion } from "../../src/config/partnerIntegration";
import type { AssessmentCapture, KycQualityContext } from "../../src/engine/dataQualityGate";
import type { CustomerMode } from "../../src/config/activityRiskConfig";
import type { OnboardingCaseRecord, OnboardingState, OnboardingSubject } from "./types";

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function rowToRecord(r: {
  id: string; customerId: string; customerName: string; licenseRegion: string;
  mode: string; state: string; shuftiReference: string | null; shuftiStatus: string | null;
  screeningCaseId: string | null; vital4CaseId: string | null;
  kycContext: unknown; capture: unknown; subject: unknown;
  blockReason: string | null; scoreResult: unknown; finalRating: string | null;
  composite: number | null; createdAt: Date; updatedAt: Date;
}): OnboardingCaseRecord {
  return {
    id: r.id,
    customerId: r.customerId,
    customerName: r.customerName,
    licenseRegion: r.licenseRegion as LicenseRegion,
    mode: r.mode as CustomerMode,
    state: r.state as OnboardingState,
    shuftiReference: r.shuftiReference,
    shuftiStatus: r.shuftiStatus,
    screeningCaseId: r.screeningCaseId,
    vital4CaseId: r.vital4CaseId,
    kycContext: r.kycContext as KycQualityContext | null,
    capture: r.capture as Partial<AssessmentCapture> | null,
    subject: r.subject as OnboardingSubject,
    blockReason: r.blockReason,
    finalRating: r.finalRating,
    composite: r.composite,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function createOnboardingCase(data: {
  customerId: string;
  customerName: string;
  licenseRegion: LicenseRegion;
  mode: CustomerMode;
  subject: OnboardingSubject;
  capture?: Partial<AssessmentCapture>;
}): Promise<OnboardingCaseRecord> {
  const row = await prisma.onboardingCase.create({
    data: {
      id: uid("onb"),
      customerId: data.customerId,
      customerName: data.customerName,
      licenseRegion: data.licenseRegion,
      mode: data.mode,
      state: "INITIATED",
      subject: data.subject as object,
      capture: data.capture ? (data.capture as object) : null,
    },
  });
  return rowToRecord(row);
}

export async function findOnboardingById(id: string): Promise<OnboardingCaseRecord | null> {
  const row = await prisma.onboardingCase.findUnique({ where: { id } });
  return row ? rowToRecord(row) : null;
}

export async function findOnboardingByShuftiRef(reference: string): Promise<OnboardingCaseRecord | null> {
  const row = await prisma.onboardingCase.findFirst({ where: { shuftiReference: reference } });
  return row ? rowToRecord(row) : null;
}

export async function findOnboardingByVital4Case(vital4CaseId: string): Promise<OnboardingCaseRecord | null> {
  const row = await prisma.onboardingCase.findFirst({ where: { vital4CaseId } });
  return row ? rowToRecord(row) : null;
}

export async function latestOnboardingForCustomer(customerId: string): Promise<OnboardingCaseRecord | null> {
  const row = await prisma.onboardingCase.findFirst({
    where: { customerId },
    orderBy: { createdAt: "desc" },
  });
  return row ? rowToRecord(row) : null;
}

export async function updateOnboardingCase(
  id: string,
  data: Partial<{
    state: OnboardingState;
    shuftiReference: string;
    shuftiStatus: string;
    screeningCaseId: string;
    vital4CaseId: string;
    kycContext: KycQualityContext;
    capture: Partial<AssessmentCapture>;
    blockReason: string;
    finalRating: string;
    composite: number;
    scoreResult: unknown;
  }>,
): Promise<OnboardingCaseRecord | null> {
  try {
    const row = await prisma.onboardingCase.update({
      where: { id },
      data: {
        ...(data.state && { state: data.state }),
        ...(data.shuftiReference && { shuftiReference: data.shuftiReference }),
        ...(data.shuftiStatus && { shuftiStatus: data.shuftiStatus }),
        ...(data.screeningCaseId && { screeningCaseId: data.screeningCaseId }),
        ...(data.vital4CaseId && { vital4CaseId: data.vital4CaseId }),
        ...(data.kycContext && { kycContext: data.kycContext as object }),
        ...(data.capture && { capture: data.capture as object }),
        ...(data.blockReason !== undefined && { blockReason: data.blockReason ?? null }),
        ...(data.finalRating && { finalRating: data.finalRating }),
        ...(data.composite != null && { composite: data.composite }),
        ...(data.scoreResult && { scoreResult: data.scoreResult as object }),
      },
    });
    return rowToRecord(row);
  } catch {
    return null;
  }
}

const TERMINAL_ONBOARDING: OnboardingState[] = ["SCORED", "BLOCKED", "CLEARED"];

/** Active onboarding cases for MLRO dashboard (Phase 1c). */
export async function listActiveOnboardingCases(limit = 50): Promise<OnboardingCaseRecord[]> {
  const rows = await prisma.onboardingCase.findMany({
    where: { state: { notIn: TERMINAL_ONBOARDING } },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  return rows.map(rowToRecord);
}

/** Recent onboarding cases including terminal states. */
export async function listRecentOnboardingCases(limit = 20): Promise<OnboardingCaseRecord[]> {
  const rows = await prisma.onboardingCase.findMany({
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  return rows.map(rowToRecord);
}
