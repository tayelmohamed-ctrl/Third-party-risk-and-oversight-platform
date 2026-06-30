/**
 * Onboarding Orchestrator — Phase 1b: Shufti KYC → Vital4 screening → CRAM score.
 */
import { scoreWithDataQualityGate, type AssessmentCapture, type KycQualityContext } from "../../src/engine/dataQualityGate";
import { buildAssessment } from "../../src/engine/rerating";
import { appendAssessment, appendAudit } from "../db/auditStore";
import { notifyCoreBanking, notificationFromCase } from "../integrations/coreBanking/notify";
import {
  isShuftiAccepted, isShuftiDeclined, logIgnoredShuftiAml, shuftiToKycContext,
} from "../integrations/shuftipro/normalize";
import {
  isShuftiMockMode, shuftiCreateVerification, shuftiMockAcceptedPayload,
} from "../integrations/shuftipro/client";
import { isVital4MockMode } from "../integrations/vital4/client";
import {
  getCustomerScreeningSnapshot, initiateScreening, snapshotToCaptureFields,
} from "../screening/orchestrator";
import type { ScreeningCaseRecord, Vital4WebhookPayload } from "../screening/types";
import {
  createOnboardingCase, findOnboardingById, findOnboardingByShuftiRef,
  findOnboardingByVital4Case, latestOnboardingForCustomer, listActiveOnboardingCases,
  listRecentOnboardingCases, updateOnboardingCase,
} from "./store";
import type {
  OnboardingCaseRecord, OnboardingState, PartnerSyncPayload,
  ShuftiWebhookPayload, StartOnboardingRequest,
} from "./types";

function defaultCapture(req: StartOnboardingRequest): Partial<AssessmentCapture> {
  const sub = req.subject;
  return {
    customerId: req.customerId,
    customerName: req.customerName,
    segment: req.mode === "entity" ? "SME" : "Retail",
    lifecycle: "New",
    mode: req.mode,
    residenceCountry: sub.country ?? "United Arab Emirates",
    nationalityCountry: sub.nationality ?? "United Arab Emirates",
    birthCountry: sub.nationality ?? "United Arab Emirates",
    sowCountry: sub.country ?? "United Arab Emirates",
    sofCountry: sub.country ?? "United Arab Emirates",
    opcoCountry: sub.country ?? "United Arab Emirates",
    incorpCountry: sub.country ?? "United Arab Emirates",
    uboCountry: sub.country ?? "United Arab Emirates",
    activity: req.mode === "entity" ? "General trading" : "Information technology (including manufacturing, trade and repair of computers, peripheral equipment and software)",
    profession: req.mode === "individual" ? "Employee" : "",
    providedIsicCode: "",
    product: "Current account",
    pep: "",
    expectedMonthlyBand: "2",
    actualMonthlyBand: "2",
    legalForm: req.mode === "entity" ? "legal" : "natural",
    uboStatus: req.mode === "entity" ? "verified" : "na",
    uboLayers: "1",
    employment: "2",
    service: "1",
    initChannel: "1",
    deliveryChannel: "2",
    behaviour: "in_line",
    investigations: "1",
    strs: "1",
    sanctions: "",
    watchlist: "",
    adverse: "",
    entityType: req.mode === "entity" ? "Limited Liability Company (LLC)" : undefined,
  };
}

function mergeCapture(
  base: Partial<AssessmentCapture> | null,
  screening: ReturnType<typeof snapshotToCaptureFields> | null,
): Partial<AssessmentCapture> {
  return {
    ...(base ?? {}),
    ...(screening ?? {}),
  };
}

function fullCapture(
  ob: OnboardingCaseRecord,
  screening: ReturnType<typeof snapshotToCaptureFields> | null,
): AssessmentCapture {
  const defaults = defaultCapture({
    customerId: ob.customerId,
    customerName: ob.customerName,
    licenseRegion: ob.licenseRegion,
    mode: ob.mode,
    subject: ob.subject,
  });
  const merged = {
    ...defaults,
    ...(ob.capture ?? {}),
    ...mergeCapture(null, screening),
    customerId: ob.customerId,
    customerName: ob.customerName,
    mode: ob.mode,
    lifecycle: "New" as const,
  };
  return merged as AssessmentCapture;
}

function kycWithScreening(kyc: KycQualityContext, screenedAt: string): KycQualityContext {
  return { ...kyc, screeningCompletedAt: screenedAt };
}

async function mockVital4ClearWebhook(vital4CaseId: string, customerId: string): Promise<void> {
  const { handleVital4Webhook } = await import("../screening/orchestrator");
  const payload: Vital4WebhookPayload = {
    event_id: `ev-mock-${Date.now().toString(36)}`,
    event_type: "screening.completed",
    case_id: vital4CaseId,
    customer_id: customerId,
    status: "completed",
    results: { sanctions: "clear", pep: "none", adverse_media: "none", watchlist: "clear" },
    timestamp: new Date().toISOString(),
  };
  await handleVital4Webhook(payload);
}

export async function startOnboarding(
  req: StartOnboardingRequest,
  actor: string,
): Promise<OnboardingCaseRecord> {
  const capture = { ...defaultCapture(req), ...(req.capture ?? {}) };
  const ob = await createOnboardingCase({
    customerId: req.customerId,
    customerName: req.customerName,
    licenseRegion: req.licenseRegion,
    mode: req.mode,
    subject: req.subject,
    capture,
  });

  const shufti = await shuftiCreateVerification({
    customerId: req.customerId,
    licenseRegion: req.licenseRegion,
    subject: req.subject,
  });

  let updated = await updateOnboardingCase(ob.id, {
    state: "KYC_PENDING",
    shuftiReference: shufti.reference,
    shuftiStatus: shufti.event,
  });

  await appendAudit({
    actor,
    action: "onboarding.started",
    entity: "onboarding_case",
    entityId: ob.id,
    detail: `Shufti ref ${shufti.reference} · ${req.customerName} (${req.customerId})`,
  });

  if (isShuftiMockMode() && updated) {
    updated = await handleShuftiWebhook(shuftiMockAcceptedPayload(shufti.reference));
  }

  return updated ?? ob;
}

export async function handleShuftiWebhook(payload: ShuftiWebhookPayload): Promise<OnboardingCaseRecord | null> {
  const ignored = logIgnoredShuftiAml(payload);
  if (ignored) console.info("[shufti]", ignored);

  const ob = await findOnboardingByShuftiRef(payload.reference);
  if (!ob) return null;

  if (isShuftiDeclined(payload)) {
    const blocked = await updateOnboardingCase(ob.id, {
      state: "BLOCKED",
      shuftiStatus: payload.verification_status ?? payload.event,
      blockReason: payload.declined_reason ?? "Shufti verification declined",
    });
    if (blocked) {
      await notifyCoreBanking(notificationFromCase(blocked, "onboarding.blocked"));
      await appendAudit({
        actor: "shufti:webhook",
        action: "onboarding.blocked",
        entity: "onboarding_case",
        entityId: ob.id,
        detail: blocked.blockReason ?? "KYC declined",
      });
    }
    return blocked;
  }

  if (!isShuftiAccepted(payload)) {
    await updateOnboardingCase(ob.id, {
      shuftiStatus: payload.verification_status ?? payload.event,
    });
    return findOnboardingById(ob.id);
  }

  const kyc = shuftiToKycContext(payload);
  await updateOnboardingCase(ob.id, {
    state: "SCREENING_PENDING",
    shuftiStatus: "accepted",
    kycContext: kyc,
  });

  const screening = await initiateScreening(
    {
      customerId: ob.customerId,
      customerName: ob.customerName,
      licenseRegion: ob.licenseRegion,
      subject: ob.subject,
      screeningType: "bundle",
    },
    "onboarding:orchestrator",
  );

  const withScreening = await updateOnboardingCase(ob.id, {
    screeningCaseId: screening.id,
    vital4CaseId: screening.vendorCaseId,
  });

  await appendAudit({
    actor: "shufti:webhook",
    action: "onboarding.screening_chained",
    entity: "onboarding_case",
    entityId: ob.id,
    detail: `Vital4 ${screening.vendorCaseId} chained after KYC accept`,
  });

  if (isVital4MockMode()) {
    await mockVital4ClearWebhook(screening.vendorCaseId, ob.customerId);
    return findOnboardingById(ob.id);
  }

  return withScreening;
}

/** Called after Vital4 webhook or screening disposition updates linked onboarding case. */
export async function advanceOnboardingFromScreening(
  screening: ScreeningCaseRecord,
): Promise<OnboardingCaseRecord | null> {
  const ob = screening.vendorCaseId
    ? await findOnboardingByVital4Case(screening.vendorCaseId)
    : null;
  if (!ob || ob.state === "SCORED" || ob.state === "BLOCKED" || ob.state === "CLEARED") {
    return ob;
  }

  if (screening.status === "pending") {
    return updateOnboardingCase(ob.id, { state: "SCREENING_PENDING" });
  }

  if (screening.status === "true_match") {
    const blocked = await updateOnboardingCase(ob.id, {
      state: "BLOCKED",
      blockReason: "Vital4 true match — onboarding blocked per screening authority",
    });
    if (blocked) {
      await notifyCoreBanking(notificationFromCase(blocked, "onboarding.blocked"));
    }
    return blocked;
  }

  if (screening.status === "potential" && screening.disposition === "pending") {
    const pending = await updateOnboardingCase(ob.id, { state: "DISPOSITION_REQUIRED" });
    if (pending) {
      await notifyCoreBanking(notificationFromCase(pending, "onboarding.disposition_required"));
    }
    return pending;
  }

  const ready = screening.status === "clear"
    || screening.status === "false_positive"
    || (screening.disposition === "clear" || screening.disposition === "false_positive");

  if (!ready) return ob;

  await updateOnboardingCase(ob.id, { state: "READY_TO_SCORE" });
  return scoreOnboardingCase(ob.id, "onboarding:screening_complete");
}

async function scoreOnboardingCase(
  onboardingId: string,
  actor: string,
): Promise<OnboardingCaseRecord | null> {
  const ob = await findOnboardingById(onboardingId);
  if (!ob || !ob.kycContext) return null;

  const snap = await getCustomerScreeningSnapshot(ob.customerId);
  if (!snap) {
    await updateOnboardingCase(ob.id, {
      state: "BLOCKED",
      blockReason: "Screening snapshot missing — cannot score",
    });
    return findOnboardingById(ob.id);
  }

  const screeningFields = snapshotToCaptureFields(snap);
  const capture = fullCapture(ob, screeningFields);
  const kyc = kycWithScreening(ob.kycContext, screeningFields.screeningCompletedAt);

  const gated = scoreWithDataQualityGate(capture, kyc, "calculator");
  if (!gated.ready) {
    const blocked = await updateOnboardingCase(ob.id, {
      state: "BLOCKED",
      blockReason: gated.verdict.summary,
      kycContext: kyc,
      capture,
    });
    if (blocked) {
      await notifyCoreBanking(notificationFromCase(blocked, "onboarding.blocked"));
    }
    return blocked;
  }

  const assessment = buildAssessment({
    customerId: ob.customerId,
    customerName: ob.customerName,
    input: gated.input,
    result: gated.result,
    trigger: "ONBOARDING",
    triggerNote: `Partner orchestration · ${ob.mode}`,
    actor,
    capture,
    kycContext: kyc,
  });

  await appendAssessment(assessment);

  const terminal: OnboardingState = gated.result.finalRating === "Prohibited" ? "BLOCKED" : "SCORED";
  const updated = await updateOnboardingCase(ob.id, {
    state: terminal,
    finalRating: gated.result.finalRating,
    composite: gated.result.composite,
    kycContext: kyc,
    capture,
    scoreResult: { assessmentId: assessment.id, rating: gated.result.finalRating },
    blockReason: terminal === "BLOCKED" ? "Prohibited rating — onboarding blocked" : null,
  });

  if (updated) {
    if (terminal === "SCORED") {
      await notifyCoreBanking(notificationFromCase(updated, "onboarding.rating_ready"));
    } else {
      await notifyCoreBanking(notificationFromCase(updated, "onboarding.blocked"));
    }
    await appendAudit({
      actor,
      action: "onboarding.scored",
      entity: "onboarding_case",
      entityId: ob.id,
      detail: `${gated.result.finalRating} · composite ${gated.result.composite.toFixed(1)} · assessment ${assessment.id}`,
    });
  }

  return updated;
}

export async function getPartnerSync(customerId: string): Promise<PartnerSyncPayload | null> {
  const ob = await latestOnboardingForCustomer(customerId);
  if (!ob) return null;

  const snap = await getCustomerScreeningSnapshot(customerId);
  return {
    onboarding: ob,
    kyc: ob.kycContext,
    screening: snap
      ? {
          sanctions: snap.sanctions,
          pep: snap.pep,
          adverse: snap.adverse,
          watchlist: snap.watchlist,
          screeningCompletedAt: snap.screenedAt,
        }
      : null,
  };
}

export async function getOnboardingCase(id: string) {
  return findOnboardingById(id);
}

export async function getLatestOnboarding(customerId: string) {
  return latestOnboardingForCustomer(customerId);
}

export async function getActiveOnboardingCases() {
  return listActiveOnboardingCases();
}

export async function getRecentOnboardingCases() {
  return listRecentOnboardingCases();
}

/** Re-score after analyst disposition on linked screening case. */
export async function onScreeningDisposition(screening: ScreeningCaseRecord): Promise<void> {
  await advanceOnboardingFromScreening(screening);
}
