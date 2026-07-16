/**
 * KYC data-quality gate — FR-007 / methodology §15.3.
 * Missing mandatory inputs → BLOCKED. No silent defaults to Low.
 */
import { lookupCountry, PRODUCTS } from "./data";
import { resolveCustomerTypeActivityScores } from "./activityRisk";
import { entityTypeScore } from "../config/activityRiskConfig";
import { deliveryScoreFromCapture, initiationScoreFromCapture } from "../config/channelRisk";
import { behaviourStatusFromCapture, suggestBehaviourStatus } from "../config/behaviourGate";
import { segmentScoreFor } from "./cramSuiteConfig";
import { scoreCustomer } from "./cram";
import { normalizeScoreInput } from "./normalizeInput";
import {
  cramActivityScore,
  cramProductScore,
  cramSegmentScore,
  cramUseCaseScore,
  lookupBusinessActivity,
  lookupProduct,
  MASTER_REGISTRY_VERSION,
} from "../registries/master/registryService";
import { CARD_ISSUER, isCardProduct, isRainCardMarket } from "../config/rainCardMarkets";
import type {
  AdverseResult, Band, Boundary, CustomerLegalForm, PepStatus,
  Score, ScoreInput, ScoreResult, ScreenResult, UboVerificationStatus,
} from "./types";

export type CustomerMode = "individual" | "entity";

import type { CompliancePerimeter } from "../config/perimeters";

/** Raw capture — empty string means "not provided" (not defaulted). */
export interface AssessmentCapture {
  customerId: string;
  customerName: string;
  segment: string;
  lifecycle: "New" | "Existing";
  mode: CustomerMode;
  residenceCountry: string;
  nationalityCountry: string;
  birthCountry: string;
  sowCountry: string;
  sofCountry: string;
  opcoCountry: string;
  incorpCountry: string;
  uboCountry: string;
  activity: string;
  profession: string;
  providedIsicCode: string;
  product: string;
  pep: PepStatus | "";
  expectedMonthlyBand: string;
  actualMonthlyBand: string;
  legalForm: CustomerLegalForm | "";
  uboStatus: UboVerificationStatus | "";
  uboLayers: string;
  employment: string;
  service: string;
  /** Initiation / onboarding channel score (1–3) or channel id */
  initChannel: string;
  /** Ongoing delivery channel score (1–3) or channel id */
  deliveryChannel: string;
  /** Expected-vs-actual behaviour gate (Policy §12.6) */
  behaviour: string;
  /** @deprecated use initChannel */
  channel?: string;
  /** @deprecated use deliveryChannel */
  interface?: string;
  investigations: string;
  strs: string;
  sanctions: ScreenResult | "";
  watchlist: "Clear" | "True Match" | "";
  adverse: AdverseResult | "";
  entityType?: string;
  manualOverride?: "" | Band;
  /** Regulatory perimeter — drives Master Registry jurisdiction (UAE vs US). */
  compliancePerimeter?: CompliancePerimeter;
  /** Payment purpose / use case ID from Master Use Case Registry. */
  useCaseId?: string;
  /** Corridor ID from Master Corridor Registry (optional geography uplift). */
  corridorId?: string;
}

export interface KycQualityContext {
  identitySource: "uae_pass" | "emirates_id" | "idsp" | "document" | "branch" | "";
  identityVerified: boolean;
  documentIssuedAt: string;
  lastKycRefreshAt: string;
  screeningCompletedAt: string;
  livenessPass: boolean;
}

export type DataQualityStatus = "READY" | "BLOCKED";

export interface DataQualityIssue {
  code: string;
  field: string;
  message: string;
  severity: "blocking" | "freshness" | "verification";
}

export interface DataQualityVerdict {
  status: DataQualityStatus;
  workflowState: "CALCULATION_READY" | "DATA_PENDING" | "SCREENING_PENDING";
  missingFields: string[];
  issues: DataQualityIssue[];
  summary: string;
}

export interface GatedScoreResult {
  ready: true;
  input: ScoreInput;
  result: ScoreResult;
  verdict: DataQualityVerdict;
}

export interface GatedScoreBlocked {
  ready: false;
  verdict: DataQualityVerdict;
}

export type GatedScore = GatedScoreResult | GatedScoreBlocked;

const ID_MAX_AGE_MONTHS = 120;
const KYC_REFRESH_MAX_MONTHS = { New: 0, Existing: 36 } as const;

function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

function parseDate(s: string): Date | null {
  if (!s?.trim()) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isBlank(s: string | undefined | null): boolean {
  return s == null || String(s).trim() === "";
}

function baselineScore(b: string): Score {
  const t = b.toLowerCase();
  if (t.includes("prohibit") || t.includes("high")) return 3;
  if (t.includes("medium")) return 2;
  return 1;
}

function firm(name: string, perimeter: CompliancePerimeter = "mal_bank"): number {
  return lookupCountry(name, perimeter)?.firm ?? NaN;
}

/** KYC verification & freshness checks (shared by capture and snapshot validation). */
export function validateKycContext(
  kyc: KycQualityContext,
  lifecycle: "New" | "Existing",
  at: Date = new Date(),
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  if (isBlank(kyc.identitySource)) {
    issues.push({ code: "IDENTITY_SOURCE", field: "identitySource", message: "Digital ID source required", severity: "verification" });
  }
  if (!kyc.identityVerified) {
    issues.push({ code: "IDENTITY_UNVERIFIED", field: "identityVerified", message: "Identity not verified — block final assessment", severity: "verification" });
  }
  if (!kyc.livenessPass && kyc.identitySource !== "branch") {
    issues.push({ code: "LIVENESS_FAIL", field: "livenessPass", message: "Liveness check not passed", severity: "verification" });
  }
  const docDate = parseDate(kyc.documentIssuedAt);
  if (!docDate) {
    issues.push({ code: "DOC_DATE_MISSING", field: "documentIssuedAt", message: "Identity document issue date required", severity: "freshness" });
  } else if (monthsBetween(docDate, at) > ID_MAX_AGE_MONTHS) {
    issues.push({ code: "DOC_STALE", field: "documentIssuedAt", message: `Identity document older than ${ID_MAX_AGE_MONTHS} months`, severity: "freshness" });
  }
  if (lifecycle === "Existing") {
    const refresh = parseDate(kyc.lastKycRefreshAt);
    if (!refresh) {
      issues.push({ code: "KYC_STALE", field: "lastKycRefreshAt", message: "Last KYC refresh date required for existing customers", severity: "freshness" });
    } else if (monthsBetween(refresh, at) > KYC_REFRESH_MAX_MONTHS.Existing) {
      issues.push({ code: "KYC_OVERDUE", field: "lastKycRefreshAt", message: `KYC refresh overdue (>${KYC_REFRESH_MAX_MONTHS.Existing} months)`, severity: "freshness" });
    }
  }
  if (isBlank(kyc.screeningCompletedAt)) {
    issues.push({ code: "SCREENING_INCOMPLETE", field: "screeningCompletedAt", message: "Mandatory screening not completed", severity: "verification" });
  }
  return issues;
}

function buildVerdict(issues: DataQualityIssue[], missing: string[]): DataQualityVerdict {
  const blocking = issues.filter((i) => i.severity === "blocking" || i.severity === "verification" || i.severity === "freshness");
  const status: DataQualityStatus = blocking.length === 0 ? "READY" : "BLOCKED";
  const workflowState = issues.some((i) => i.code.startsWith("SCREENING"))
    ? "SCREENING_PENDING"
    : status === "BLOCKED"
      ? "DATA_PENDING"
      : "CALCULATION_READY";
  return {
    status,
    workflowState,
    missingFields: [...new Set(missing)],
    issues,
    summary: status === "READY"
      ? "KYC data quality passed — eligible for scoring"
      : `BLOCKED — ${blocking.length} issue(s): ${blocking.slice(0, 3).map((i) => i.message).join("; ")}`,
  };
}

/** Validate a persisted ScoreInput snapshot before re-rating (when full capture unavailable). */
export function validateScoreInputSnapshot(
  input: ScoreInput,
  kyc: KycQualityContext,
  at: Date = new Date(),
): DataQualityVerdict {
  const i = normalizeScoreInput(input);
  const issues: DataQualityIssue[] = [];
  const missing: string[] = [];

  if (!i.pep) {
    missing.push("pep");
    issues.push({ code: "MISSING_MANDATORY", field: "pep", message: "PEP status is mandatory (incl. explicit None)", severity: "blocking" });
  }
  if (!i.sanctions) {
    missing.push("sanctions");
    issues.push({ code: "MISSING_MANDATORY", field: "sanctions", message: "Sanctions screening result required", severity: "blocking" });
  } else if (i.sanctions === "Potential Match") {
    issues.push({ code: "SCREENING_PENDING", field: "sanctions", message: "Sanctions potential match unresolved — hold activation", severity: "verification" });
  }
  if (!i.watchlist) {
    missing.push("watchlist");
    issues.push({ code: "MISSING_MANDATORY", field: "watchlist", message: "Watchlist screening result required", severity: "blocking" });
  }
  if (!i.adverse) {
    missing.push("adverse");
    issues.push({ code: "MISSING_MANDATORY", field: "adverse", message: "Adverse media screening result required", severity: "blocking" });
  }
  if (i.legalForm !== "natural" && !i.uboStatus) {
    missing.push("uboStatus");
    issues.push({ code: "MISSING_MANDATORY", field: "uboStatus", message: "UBO verification status required for entities", severity: "blocking" });
  }

  issues.push(...validateKycContext(kyc, i.lifecycle, at));
  return buildVerdict(issues, missing);
}

/** Score via snapshot DQ gate — used by re-rating when capture is unavailable. */
export function scoreWithSnapshotGate(
  input: ScoreInput,
  kyc: KycQualityContext,
  boundary: Boundary = "calculator",
  at: Date = new Date(),
): GatedScore {
  const verdict = validateScoreInputSnapshot(input, kyc, at);
  if (verdict.status === "BLOCKED") {
    return { ready: false, verdict };
  }
  const normalized = normalizeScoreInput(input);
  const result = scoreCustomer(normalized, boundary);
  return { ready: true, input: normalized, result, verdict };
}

/** Validate completeness, verification, and freshness before scoring. */
export function validateDataQuality(
  capture: AssessmentCapture,
  kyc: KycQualityContext,
  at: Date = new Date(),
): DataQualityVerdict {
  const issues: DataQualityIssue[] = [];
  const missing: string[] = [];
  const perimeter = capture.compliancePerimeter ?? "mal_bank";
  const countryFirm = (name: string) => firm(name, perimeter);

  const req = (field: keyof AssessmentCapture | string, value: string | undefined, label: string) => {
    if (isBlank(value)) {
      missing.push(field);
      issues.push({ code: "MISSING_MANDATORY", field, message: `${label} is mandatory`, severity: "blocking" });
    }
  };

  req("customerId", capture.customerId, "Customer ID");
  req("customerName", capture.customerName, "Customer name");
  req("segment", capture.segment, "Segment");
  req("product", capture.product, "Product");
  const selfEmployed = +capture.employment >= 2;
  if (capture.mode === "individual") {
    req("profession", capture.profession, "Profession / occupation");
    if (selfEmployed) req("activity", capture.activity, "Self-employed business activity / ISIC");
  } else {
    req("activity", capture.activity, "Registered business activity / ISIC");
    if (isBlank(capture.entityType)) {
      missing.push("entityType");
      issues.push({ code: "MISSING_MANDATORY", field: "entityType", message: "Entity legal type is mandatory", severity: "blocking" });
    }
  }
  req("expectedMonthlyBand", capture.expectedMonthlyBand, "Expected monthly activity band");
  req("actualMonthlyBand", capture.actualMonthlyBand, "Observed activity band (TM)");
  if (capture.mode === "individual") req("employment", capture.employment, "Employment status");
  req("service", capture.service, "Service");
  const initVal = capture.initChannel || capture.channel || "";
  const delVal = capture.deliveryChannel || capture.interface || "";
  if (isBlank(initVal)) {
    missing.push("initChannel");
    issues.push({ code: "MISSING_MANDATORY", field: "initChannel", message: "Initiation channel is mandatory", severity: "blocking" });
  }
  if (isBlank(delVal)) {
    missing.push("deliveryChannel");
    issues.push({ code: "MISSING_MANDATORY", field: "deliveryChannel", message: "Delivery channel is mandatory", severity: "blocking" });
  }
  if (isBlank(capture.behaviour)) {
    missing.push("behaviour");
    issues.push({ code: "MISSING_MANDATORY", field: "behaviour", message: "Transaction behaviour (expected vs actual) is mandatory", severity: "blocking" });
  }
  req("investigations", capture.investigations, "Investigations status");
  req("strs", capture.strs, "STR / SAR status");

  if (capture.pep === "") {
    missing.push("pep");
    issues.push({ code: "MISSING_MANDATORY", field: "pep", message: "PEP status is mandatory (incl. explicit None)", severity: "blocking" });
  }

  if (capture.sanctions === "") {
    missing.push("sanctions");
    issues.push({ code: "MISSING_MANDATORY", field: "sanctions", message: "Sanctions screening result required", severity: "blocking" });
  } else if (capture.sanctions === "Potential Match") {
    issues.push({ code: "SCREENING_PENDING", field: "sanctions", message: "Sanctions potential match unresolved — hold activation", severity: "verification" });
  }

  if (capture.watchlist === "") {
    missing.push("watchlist");
    issues.push({ code: "MISSING_MANDATORY", field: "watchlist", message: "Watchlist screening result required", severity: "blocking" });
  }

  if (capture.adverse === "") {
    missing.push("adverse");
    issues.push({ code: "MISSING_MANDATORY", field: "adverse", message: "Adverse media screening result required", severity: "blocking" });
  }

  if (capture.mode === "individual") {
    req("residenceCountry", capture.residenceCountry, "Country of residence");
    req("nationalityCountry", capture.nationalityCountry, "Nationality");
    req("birthCountry", capture.birthCountry, "Country of birth");
    req("sowCountry", capture.sowCountry, "Source-of-wealth country");
    req("sofCountry", capture.sofCountry, "Source-of-funds country");
    if (!isBlank(capture.residenceCountry) && Number.isNaN(countryFirm(capture.residenceCountry))) {
      issues.push({ code: "UNMAPPED_COUNTRY", field: "residenceCountry", message: "Residence country not in library — remediation required", severity: "blocking" });
    }
  } else {
    req("legalForm", capture.legalForm, "Legal form");
    req("uboStatus", capture.uboStatus, "UBO verification status");
    req("opcoCountry", capture.opcoCountry, "Operating country");
    req("incorpCountry", capture.incorpCountry, "Incorporation country");
    req("uboCountry", capture.uboCountry, "UBO country");
    req("sowCountry", capture.sowCountry, "Source-of-wealth country");
    req("sofCountry", capture.sofCountry, "Source-of-funds country");
  }

  // Rain card launch-market eligibility (Global Account / US only). The USD card is issued by Rain
  // and is live only in the launch markets — a customer may hold a card only if resident (or, for
  // entities, operating) in one of them. USD account + payout remain available everywhere else.
  if (perimeter === "global_account" && isCardProduct(capture.product)) {
    const cardGeo = capture.mode === "entity" ? capture.opcoCountry : capture.residenceCountry;
    if (!isBlank(cardGeo) && !isRainCardMarket(cardGeo)) {
      issues.push({
        code: "CARD_MARKET_INELIGIBLE",
        field: "product",
        message: `Card product unavailable — ${CARD_ISSUER} issues USD cards only in the launch markets; residence (${cardGeo}) is not eligible. USD account + payout remain available.`,
        severity: "blocking",
      });
    }
  }

  // Identity verification (digital KYC gate)
  issues.push(...validateKycContext(kyc, capture.lifecycle, at));

  const blocking = issues.filter((i) => i.severity === "blocking" || i.severity === "verification" || i.severity === "freshness");
  const status: DataQualityStatus = blocking.length === 0 ? "READY" : "BLOCKED";
  const workflowState = issues.some((i) => i.code.startsWith("SCREENING"))
    ? "SCREENING_PENDING"
    : status === "BLOCKED"
      ? "DATA_PENDING"
      : "CALCULATION_READY";

  return {
    status,
    workflowState,
    missingFields: [...new Set(missing)],
    issues,
    summary: status === "READY"
      ? "KYC data quality passed — eligible for scoring"
      : `BLOCKED — ${blocking.length} issue(s): ${blocking.slice(0, 3).map((i) => i.message).join("; ")}`,
  };
}

/** Build ScoreInput only from validated capture (no silent defaults). */
export function captureToScoreInput(capture: AssessmentCapture): ScoreInput {
  const perimeter = capture.compliancePerimeter ?? "mal_bank";
  const selfEmployed = capture.mode === "individual" && +capture.employment >= 2;
  const resolved = resolveCustomerTypeActivityScores({
    mode: capture.mode,
    declaredProfession: capture.mode === "individual" ? capture.profession : "",
    declaredActivity: capture.activity,
    providedIsicCode: capture.providedIsicCode || undefined,
    entityTypeScore: capture.mode === "entity" ? entityTypeScore(capture.entityType) : undefined,
    selfEmployed,
    perimeter,
  });
  const cr = (n: string) => lookupCountry(n, perimeter)!.firm;
  const prodObj = PRODUCTS.find((p) => p.name === capture.product);
  const legacyProductScore = (prodObj ? baselineScore(prodObj.baseline) : 2) as Score;
  const isEntity = capture.mode === "entity";
  const isNewCustomer = capture.lifecycle === "New";

  const registryActivity = lookupBusinessActivity(
    capture.activity,
    perimeter,
    capture.providedIsicCode || undefined,
  );
  const natureOfBusinessScore = cramActivityScore(
    capture.activity,
    perimeter,
    capture.providedIsicCode || undefined,
    resolved.natureOfBusinessScore,
  );
  const professionScore = capture.mode === "entity"
    ? resolved.professionScore
    : (selfEmployed
      ? cramActivityScore(capture.activity, perimeter, capture.providedIsicCode || undefined, resolved.professionScore)
      : resolved.professionScore);

  const productScore = cramProductScore(capture.product, perimeter, legacyProductScore);
  const serviceScore = capture.useCaseId
    ? cramUseCaseScore(capture.useCaseId, perimeter, +capture.service as Score)
    : (+capture.service as Score);
  const segmentScore = cramSegmentScore(capture.segment, capture.mode, perimeter, segmentScoreFor(capture.segment));

  const geoRes = isEntity ? capture.opcoCountry : capture.residenceCountry;

  return {
    segment: capture.segment,
    lifecycle: capture.lifecycle,
    employmentScore: (+capture.employment || 1) as Score,
    professionScore,
    natureOfBusinessScore,
    customerMode: capture.mode,
    declaredProfession: capture.mode === "individual" ? capture.profession : undefined,
    declaredActivity: capture.activity,
    providedIsicCode: capture.providedIsicCode || undefined,
    selfEmployed,
    entityTypeScore: isEntity ? entityTypeScore(capture.entityType) : undefined,
    declaredEntityType: isEntity ? capture.entityType : undefined,
    pep: capture.pep as PepStatus,
    segmentScore,
    expectedMonthlyBand: +capture.expectedMonthlyBand as Score,
    actualMonthlyBand: +capture.actualMonthlyBand as Score,
    legalForm: (capture.legalForm || "natural") as CustomerLegalForm,
    uboStatus: (capture.uboStatus || "na") as UboVerificationStatus,
    uboLayers: +(capture.uboLayers || "1"),
    residenceFirm: cr(geoRes),
    nationalityFirm: cr(isEntity ? capture.uboCountry : capture.nationalityCountry),
    birthFirm: cr(isEntity ? capture.incorpCountry : capture.birthCountry),
    incorpFirm: isEntity ? cr(capture.incorpCountry) : undefined,
    sowFirm: cr(capture.sowCountry),
    sofFirm: cr(capture.sofCountry),
    residenceName: geoRes,
    nationalityName: isEntity ? capture.uboCountry : capture.nationalityCountry,
    birthName: isEntity ? capture.incorpCountry : capture.birthCountry,
    sowName: capture.sowCountry,
    sofName: capture.sofCountry,
    incorpName: isEntity ? capture.incorpCountry : undefined,
    uboName: isEntity ? capture.uboCountry : undefined,
    productScore,
    serviceScore,
    initiationChannelScore: initiationScoreFromCapture(capture.initChannel || capture.channel || "2"),
    deliveryChannelScore: deliveryScoreFromCapture(capture.deliveryChannel || capture.interface || "2"),
    behaviourStatus: behaviourStatusFromCapture(
      capture.behaviour,
      suggestBehaviourStatus(
        +capture.expectedMonthlyBand as Score,
        +capture.actualMonthlyBand as Score,
        capture.lifecycle,
      ),
    ),
    investigationsScore: isNewCustomer ? 1 : (+capture.investigations as Score),
    strsScore: isNewCustomer ? 1 : (+capture.strs as Score),
    sanctions: capture.sanctions as ScreenResult,
    watchlist: capture.watchlist as "Clear" | "True Match",
    adverse: capture.adverse as AdverseResult,
    manualOverride: capture.manualOverride,
    masterRegistryVersion: MASTER_REGISTRY_VERSION,
    masterRegistryActivityId: registryActivity?.entry.id,
    masterRegistryProductId: lookupProduct(capture.product, perimeter)?.entry.id,
    masterRegistryPerimeter: perimeter,
  };
}

/** Gate then score — returns BLOCKED without computing a rating when DQ fails. */
export function scoreWithDataQualityGate(
  capture: AssessmentCapture,
  kyc: KycQualityContext,
  boundary: Boundary = "calculator",
  at: Date = new Date(),
): GatedScore {
  const verdict = validateDataQuality(capture, kyc, at);
  if (verdict.status === "BLOCKED") {
    return { ready: false, verdict };
  }
  const input = captureToScoreInput(capture);
  const result = scoreCustomer(input, boundary);
  return { ready: true, input, result, verdict };
}

/** GV-19 — incomplete mandatory capture must block. */
export function incompleteCaptureDemo(): AssessmentCapture {
  const c = validCaptureDemo();
  return { ...c, expectedMonthlyBand: "", customerId: "" };
}

export function validCaptureDemo(): AssessmentCapture {
  return {
    customerId: "ACT00005",
    customerName: "Omar Khalid",
    segment: "HNW",
    lifecycle: "Existing",
    mode: "individual",
    residenceCountry: "United Arab Emirates",
    nationalityCountry: "India",
    birthCountry: "India",
    sowCountry: "United Arab Emirates",
    sofCountry: "Germany",
    opcoCountry: "",
    incorpCountry: "",
    uboCountry: "",
    activity: "Information technology (including manufacturing, trade and repair of computers, peripheral equipment and software)",
    profession: "Computer Engineer",
    providedIsicCode: "",
    product: PRODUCTS[1]?.name ?? "Current Account",
    pep: "None",
    expectedMonthlyBand: "2",
    actualMonthlyBand: "3",
    legalForm: "natural",
    uboStatus: "na",
    uboLayers: "1",
    employment: "2",
    service: "2",
    initChannel: "1",
    deliveryChannel: "2",
    behaviour: "moderately_above",
    investigations: "1",
    strs: "1",
    sanctions: "Clear",
    watchlist: "Clear",
    adverse: "None",
  };
}

export function validKycDemo(): KycQualityContext {
  const now = new Date();
  const refresh = new Date(now);
  refresh.setMonth(refresh.getMonth() - 6);
  const issued = new Date(now);
  issued.setFullYear(issued.getFullYear() - 2);
  return {
    identitySource: "emirates_id",
    identityVerified: true,
    documentIssuedAt: issued.toISOString().slice(0, 10),
    lastKycRefreshAt: refresh.toISOString().slice(0, 10),
    screeningCompletedAt: now.toISOString(),
    livenessPass: true,
  };
}
