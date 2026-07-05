import type { Assessment } from "../engine/rerating";
import type { FeedEvent } from "../pipeline/feeds";
import type { ProcessedEvent } from "../pipeline/triggerEngine";
import { getAuthHeaders, getMlroAuthHeaders, getServiceAuthHeaders, type PublicAuthConfig } from "./authSession";

const BASE = "/api/v1/crr";

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...getServiceAuthHeaders(),
    ...extra,
  };
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { ...authHeaders(), ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string; detail?: string };
    throw new Error(err.detail ?? err.error ?? `${res.status} ${path}`);
  }
  return res.json() as Promise<T>;
}

export interface AuthMe {
  email: string;
  name?: string;
  roles: string[];
  authMode?: string;
  capabilities: {
    override: boolean;
    score: boolean;
    review?: boolean;
    readAudit: boolean;
    readMi?: boolean;
    configPropose?: boolean;
    configApprove?: boolean;
  };
}

export async function apiAuthConfig(): Promise<PublicAuthConfig> {
  const res = await fetch(`${BASE}/auth/config`);
  if (!res.ok) throw new Error(`${res.status} /auth/config`);
  return res.json() as Promise<PublicAuthConfig>;
}

export async function apiExchangeOidcCode(
  code: string,
  redirectUri?: string,
): Promise<{ accessToken: string; idToken?: string; expiresIn?: number }> {
  const res = await fetch(`${BASE}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirectUri }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string; detail?: unknown };
    throw new Error(String(err.detail ?? err.error ?? res.status));
  }
  const body = await res.json() as { accessToken: string; idToken?: string; expiresIn?: number };
  return body;
}

export interface SchedulerStatus {
  running: boolean;
  schedule: string;
  nextRunAt: string | null;
  lastRun: { at: string; dueCount: number; processed: number; rerated: number } | null;
  dueNow: number;
  customerCount: number;
}

export interface MlroAlert {
  id: string;
  at: string;
  customerId: string;
  customerName: string;
  prevRating: string;
  newRating: string;
  trigger: string;
  headline: string;
  source: string;
  status: "open" | "acknowledged";
}

export interface AuditLogEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  detail: string;
  before?: string;
  after?: string;
}

export interface HealthStatus {
  ok: boolean;
  auditStore: string;
  queue: string;
  queueStats: { pending: number; processing: number; done: number; deadLetter: number };
  scheduler: boolean;
  auth: string;
}

export async function apiHealth(): Promise<HealthStatus> {
  const res = await fetch(`${BASE}/health`);
  if (!res.ok) throw new Error(`${res.status} /health`);
  return res.json() as Promise<HealthStatus>;
}

export async function apiAuthMe(): Promise<AuthMe> {
  return req("/auth/me", { headers: getAuthHeaders() });
}

export async function apiSeed(): Promise<void> {
  await req("/seed", { method: "POST" });
}

export async function apiLatestAssessments(): Promise<Assessment[]> {
  const data = await req<{ latest: Assessment[] }>("/assessments");
  return data.latest;
}

export async function apiHistory(customerId: string): Promise<Assessment[]> {
  return req(`/history/${encodeURIComponent(customerId)}`);
}

export async function apiAddAssessment(
  a: Assessment & { overrideJustification?: string },
  dq?: { capture: import("../engine/dataQualityGate").AssessmentCapture; kycContext: import("../engine/dataQualityGate").KycQualityContext },
): Promise<Assessment> {
  return req("/assessments", {
    method: "POST",
    body: JSON.stringify({ ...a, ...dq }),
    headers: getAuthHeaders(),
  });
}

export async function apiIngestEvent(e: FeedEvent): Promise<ProcessedEvent> {
  return req("/events", {
    method: "POST",
    body: JSON.stringify(e),
    headers: { "X-CRAM-Sync": "true" },
  });
}

export async function apiAllEvents(): Promise<ProcessedEvent[]> {
  return req("/events");
}

export async function apiProcessedIds(): Promise<Set<string>> {
  const events = await apiAllEvents();
  return new Set(events.map((ev) => ev.id));
}

export async function apiSchedulerStatus(): Promise<SchedulerStatus> {
  return req("/scheduler/status");
}

export interface SchedulerRun {
  at: string;
  dueCount: number;
  processed: number;
  rerated: number;
  customers: { customerId: string; customerName: string; prevRating: string; newRating: string }[];
}

export async function apiRunScheduler(): Promise<SchedulerRun> {
  return req("/scheduler/run", {
    method: "POST",
    headers: getServiceAuthHeaders(),
  });
}

export async function apiMlroAlerts(): Promise<MlroAlert[]> {
  return req("/mlro/alerts", { headers: getMlroAuthHeaders() });
}

export async function apiAuditLog(): Promise<AuditLogEntry[]> {
  return req("/audit", { headers: getMlroAuthHeaders() });
}

export async function isApiAvailable(): Promise<boolean> {
  try {
    const h = await apiHealth();
    return h.ok;
  } catch {
    return false;
  }
}

export async function countOverrideAuditEntries(): Promise<number> {
  const log = await apiAuditLog();
  return log.filter((e) => e.action === "override.applied").length;
}

export interface ValidationGate {
  id: string;
  name: string;
  objective: string;
  passed: boolean;
  detail: string;
  approver: string;
}

export interface ValidationGovernance {
  modelVersionId: string;
  status: "draft" | "frozen";
  gates: ValidationGate[];
  allGatesPassed: boolean;
  canPromoteToFrozen: boolean;
  openItems: number;
  registerOpenItems?: number;
  registerCounts?: { open: number; accepted: number; corrected: number; total: number };
}

export interface OpenItemRow {
  id: string;
  title: string;
  where: string;
  impact: string;
  dispositionNeeded: string;
  buildHandling: string;
  status: "open" | "accepted" | "corrected";
  decision?: string;
  dispositionedBy?: string;
  dispositionedAt?: string;
}

export interface ValidationRunRow {
  id: string;
  at: string;
  actor: string;
  runType: string;
  modelVersionId: string;
  verdict: string;
  goldenSummary: unknown;
  backtestSummary: unknown;
  gates: unknown;
  report: unknown;
}

export async function apiValidationGovernance(): Promise<ValidationGovernance> {
  return req("/validation/governance", { headers: getMlroAuthHeaders() });
}

export async function apiValidationRuns(): Promise<ValidationRunRow[]> {
  return req("/validation/runs", { headers: getMlroAuthHeaders() });
}

export async function apiRunValidation(): Promise<{ run: ValidationRunRow; report: unknown }> {
  return req("/validation/run", { method: "POST", headers: getMlroAuthHeaders() });
}

export async function apiPromoteModel(): Promise<{ ok: boolean; state: ValidationGovernance }> {
  return req("/validation/promote", { method: "POST", headers: getMlroAuthHeaders() });
}

export async function apiOpenItems(): Promise<{ items: OpenItemRow[]; counts: { open: number; accepted: number; corrected: number; total: number } }> {
  return req("/governance/open-items", { headers: getMlroAuthHeaders() });
}

export async function apiGetConfig(table: string): Promise<{ table: string; version: number; payload: unknown }> {
  return req(`/config/${table}`, { headers: getMlroAuthHeaders() });
}

export interface OnboardingCaseRecord {
  id: string;
  customerId: string;
  customerName: string;
  licenseRegion: string;
  mode: "individual" | "entity";
  state: string;
  shuftiReference: string | null;
  shuftiStatus: string | null;
  screeningCaseId: string | null;
  vital4CaseId: string | null;
  finalRating: string | null;
  composite: number | null;
  blockReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerSyncPayload {
  onboarding: OnboardingCaseRecord;
  kyc: import("../engine/dataQualityGate").KycQualityContext | null;
  screening: {
    sanctions: string;
    pep: string;
    adverse: string;
    watchlist: string;
    screeningCompletedAt: string;
  } | null;
}

export async function apiStartOnboarding(body: {
  customerId: string;
  customerName: string;
  licenseRegion?: "UAE" | "US";
  mode?: "individual" | "entity";
  subject: { type: "individual" | "entity"; fullName: string; nationality?: string; country?: string };
  capture?: Partial<import("../engine/dataQualityGate").AssessmentCapture>;
}): Promise<OnboardingCaseRecord> {
  return req("/onboarding/start", {
    method: "POST",
    body: JSON.stringify(body),
    headers: getAuthHeaders(),
  });
}

export async function apiPartnerSync(customerId: string): Promise<PartnerSyncPayload> {
  return req(`/onboarding/customer/${encodeURIComponent(customerId)}/partner-sync`, {
    headers: getAuthHeaders(),
  });
}

export async function apiLatestOnboarding(customerId: string): Promise<{ customerId: string; latest: OnboardingCaseRecord | null }> {
  return req(`/onboarding/customer/${encodeURIComponent(customerId)}`, {
    headers: getAuthHeaders(),
  });
}

export async function apiActiveOnboarding(): Promise<{ count: number; cases: OnboardingCaseRecord[] }> {
  return req("/onboarding/active", { headers: getAuthHeaders() });
}

export interface ScreeningCaseRecord {
  id: string;
  customerId: string;
  customerName: string;
  vendor: string;
  vendorCaseId: string;
  screeningType: string;
  status: string;
  licenseRegion: string;
  sanctions: string | null;
  pep: string | null;
  adverse: string | null;
  watchlist: string | null;
  disposition: string;
  dispositionNotes: string | null;
  disposedBy: string | null;
  disposedAt: string | null;
  slaDueAt: string | null;
  mirrorSource: string | null;
  oscilarAlertId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScreeningQueueResponse {
  count: number;
  breached: number;
  cases: ScreeningCaseRecord[];
}

export async function apiScreeningQueue(): Promise<ScreeningQueueResponse> {
  return req("/screening/queue", { headers: getAuthHeaders() });
}

export async function apiGetScreeningCase(caseId: string): Promise<ScreeningCaseRecord> {
  return req(`/screening/${encodeURIComponent(caseId)}`, { headers: getAuthHeaders() });
}

export async function apiDisposeScreeningCase(
  caseId: string,
  body: { disposition: "clear" | "false_positive" | "true_match"; notes?: string },
): Promise<ScreeningCaseRecord> {
  return req(`/screening/${encodeURIComponent(caseId)}/disposition`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: getAuthHeaders(),
  });
}

export interface TmAlertRecord {
  id: string;
  oscilarAlertId: string;
  oscilarCaseId: string | null;
  customerId: string;
  customerName: string;
  alertType: string;
  severity: string;
  ruleId: string | null;
  ruleName: string | null;
  channel: string | null;
  amount: number | null;
  currency: string | null;
  licenseRegion: string;
  status: string;
  listHit: boolean;
  vital4CaseId: string | null;
  cramScreeningId: string | null;
  feedEventId: string | null;
  feedOutcome: string | null;
  paymentRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TmAlertsResponse {
  count: number;
  open: number;
  mirrored: number;
  alerts: TmAlertRecord[];
}

export async function apiTmAlerts(): Promise<TmAlertsResponse> {
  return req("/tm/alerts", { headers: getAuthHeaders() });
}

export async function apiSimulateOscilarAlert(body: {
  customerId: string;
  customerName: string;
  licenseRegion?: "UAE" | "US";
  alertType?: "transaction_monitoring" | "transaction_screening" | "both";
  severity?: "low" | "medium" | "high" | "critical";
  ruleId?: string;
  ruleName?: string;
  channel?: "transfer" | "card";
  amount?: number;
  currency?: string;
  listHit?: boolean;
  paymentRef?: string;
}): Promise<TmAlertRecord> {
  return req("/tm/simulate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: getAuthHeaders(),
  });
}

export interface RegulatoryMonitorSource {
  id: string;
  name: string;
  publisher: string;
  url: string;
  licenseProfiles: string[];
  regulationIds: string[];
}

export interface RegulatoryMonitorStatus {
  agent: string;
  cadence: string;
  cronUtc: string;
  lastRunAt: string | null;
  lastRunId: string | null;
  sourcesTotal: number;
  pendingChanges: number;
  lastErrors: number;
  notifyTo?: string;
  channels?: { primary: string[]; backup: string[]; notify: string[] };
  sources: RegulatoryMonitorSource[];
  lastRun?: {
    id: string;
    at: string;
    changed: number;
    errors: number;
    results: { sourceId: string; name: string; status: string; error?: string }[];
  } | null;
}

export async function apiRegulatoryMonitor(): Promise<RegulatoryMonitorStatus> {
  return req("/regulatory/monitor", { headers: getAuthHeaders() });
}

export async function apiRunRegulatoryMonitor(): Promise<{ id: string; changed: number; errors: number }> {
  return req("/regulatory/monitor/run", {
    method: "POST",
    headers: getAuthHeaders(),
  });
}

// ── Investigation cases (Phase 1) ───────────────────────────────────────────

export type CaseStatus = "open" | "assigned" | "investigating" | "pending_mlro" | "closed";
export type CaseDisposition = "no_action" | "escalate" | "sar_recommended" | "closed_fp";
export type CaseSource = "tm_alert" | "screening" | "manual" | "onboarding";

export interface CaseEvidenceRecord {
  id: string;
  caseId: string;
  kind: string;
  label: string;
  detail: string | null;
  payload: Record<string, unknown> | null;
  createdBy: string;
  createdAt: string;
}

export interface InvestigationCaseRecord {
  id: string;
  caseNumber: string;
  title: string;
  customerId: string;
  customerName: string;
  status: CaseStatus;
  priority: string;
  severity: string;
  source: CaseSource;
  tmAlertId: string | null;
  screeningCaseId: string | null;
  onboardingCaseId: string | null;
  assignedTo: string | null;
  typologyId: string | null;
  ruleId: string | null;
  ruleName: string | null;
  craRating: string | null;
  slaDueAt: string | null;
  disposition: CaseDisposition | null;
  dispositionNotes: string | null;
  disposedBy: string | null;
  disposedAt: string | null;
  pipelineStep: number;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  evidence?: CaseEvidenceRecord[];
}

export interface CaseStats {
  total: number;
  open: number;
  investigating: number;
  pendingMlro: number;
  closed: number;
  breachSlaSoon: number;
}

export async function apiCaseStats(): Promise<CaseStats> {
  return req("/cases/stats", { headers: getAuthHeaders() });
}

export async function apiListCases(status?: string): Promise<{ count: number; cases: InvestigationCaseRecord[] }> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return req(`/cases${q}`, { headers: getAuthHeaders() });
}

export async function apiGetCase(id: string): Promise<InvestigationCaseRecord> {
  return req(`/cases/${encodeURIComponent(id)}`, { headers: getAuthHeaders() });
}

export async function apiCreateCase(body: {
  title: string;
  customerId: string;
  customerName: string;
  source: CaseSource;
  severity?: string;
  summary?: string;
}): Promise<InvestigationCaseRecord> {
  return req("/cases", {
    method: "POST",
    body: JSON.stringify(body),
    headers: getAuthHeaders(),
  });
}

export async function apiAdvanceCase(id: string, pipelineStep: number): Promise<InvestigationCaseRecord> {
  return req(`/cases/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ pipelineStep }),
    headers: getAuthHeaders(),
  });
}

export async function apiDisposeCase(
  id: string,
  disposition: CaseDisposition,
  notes?: string,
): Promise<{ case: InvestigationCaseRecord; filingDraft: FilingDraftRecord | null }> {
  return req(`/cases/${encodeURIComponent(id)}/disposition`, {
    method: "POST",
    body: JSON.stringify({ disposition, notes }),
    headers: getAuthHeaders(),
  });
}

export type FilingStatus = "draft" | "pending_review" | "mlro_approved" | "submitted";
export type FilingType = "str_uae" | "sar_uae" | "sar_us" | "ctr_us" | "aif" | "other";

export type { FilingDraftDocument, FilingSection } from "../lib/filingDraftDocument";

export interface FilingDraftBodyLegacy {
  templateId: string;
  renderedText: string;
  placeholders?: Record<string, string>;
  checklist?: string[];
  agent: "jana";
  generatedAt: string;
  caseNumber?: string;
  dispositionNotes?: string;
  version?: number;
}

export type FilingDraftBody = import("../lib/filingDraftDocument").FilingDraftDocument | FilingDraftBodyLegacy;

export interface FilingDraftRecord {
  id: string;
  caseId: string | null;
  filingType: FilingType;
  templateId: string | null;
  status: FilingStatus;
  customerId: string;
  customerName: string;
  title: string | null;
  body: FilingDraftBody | null;
  createdBy: string;
  checkerBy: string | null;
  mlroBy: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FilingStats {
  total: number;
  draft: number;
  pendingReview: number;
  mlroApproved: number;
  submitted: number;
}

export async function apiFilingStats(): Promise<FilingStats> {
  return req("/filings/stats", { headers: getAuthHeaders() });
}

export async function apiListFilingDrafts(status?: string): Promise<{ count: number; drafts: FilingDraftRecord[] }> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return req(`/filings${q}`, { headers: getAuthHeaders() });
}

export async function apiGetFilingDraft(id: string): Promise<FilingDraftRecord> {
  return req(`/filings/${encodeURIComponent(id)}`, { headers: getAuthHeaders() });
}

export async function apiCreateFilingFromCase(caseId: string, notes?: string): Promise<FilingDraftRecord> {
  return req(`/filings/from-case/${encodeURIComponent(caseId)}`, {
    method: "POST",
    body: JSON.stringify({ notes }),
    headers: getAuthHeaders(),
  });
}

export async function apiSubmitFilingReview(id: string): Promise<FilingDraftRecord> {
  return req(`/filings/${encodeURIComponent(id)}/submit-review`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
}

export async function apiMlroApproveFiling(id: string): Promise<FilingDraftRecord> {
  return req(`/filings/${encodeURIComponent(id)}/mlro-approve`, {
    method: "POST",
    headers: getMlroAuthHeaders(),
  });
}

export async function apiSaveFilingDraft(id: string, body: FilingDraftBody): Promise<FilingDraftRecord> {
  return req(`/filings/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ body }),
    headers: getAuthHeaders(),
  });
}

// ── Training records (Phase 1 Step 3) ──

export type TrainingStatus = "assigned" | "in_progress" | "completed" | "overdue" | "waived";

export interface TrainingRecord {
  id: string;
  userEmail: string;
  userName: string | null;
  courseId: string;
  courseName: string;
  status: TrainingStatus;
  dueAt: string | null;
  completedAt: string | null;
  attestedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingStats {
  total: number;
  completed: number;
  inProgress: number;
  assigned: number;
  overdue: number;
  waived: number;
  completionPct: number;
  dueWithin30Days: number;
}

export interface TrainingCourse {
  id: string;
  name: string;
  description: string;
  frequencyMonths: number;
  requiredRoles: string[];
  regulatorRef: string;
}

export async function apiTrainingStats(): Promise<TrainingStats> {
  return req("/training/stats", { headers: getAuthHeaders() });
}

export async function apiListTraining(opts?: {
  status?: string;
  userEmail?: string;
}): Promise<{ count: number; records: TrainingRecord[] }> {
  const params = new URLSearchParams();
  if (opts?.status) params.set("status", opts.status);
  if (opts?.userEmail) params.set("userEmail", opts.userEmail);
  const q = params.toString() ? `?${params}` : "";
  return req(`/training${q}`, { headers: getAuthHeaders() });
}

export async function apiTrainingCourses(): Promise<{ count: number; courses: TrainingCourse[] }> {
  return req("/training/courses", { headers: getAuthHeaders() });
}

export async function apiAssignTraining(input: {
  userEmail: string;
  userName?: string;
  courseId: string;
  dueAt?: string;
}): Promise<TrainingRecord> {
  return req("/training", {
    method: "POST",
    body: JSON.stringify(input),
    headers: getAuthHeaders(),
  });
}

export async function apiCompleteTraining(id: string): Promise<TrainingRecord> {
  return req(`/training/${encodeURIComponent(id)}/complete`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
}

export async function apiUpdateTraining(
  id: string,
  patch: { status?: TrainingStatus; dueAt?: string | null },
): Promise<TrainingRecord> {
  return req(`/training/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
    headers: getAuthHeaders(),
  });
}

// ── FFIEC examination matrix (Phase 1 Step 4) ──

export type ExaminationStatus = "not_started" | "in_progress" | "ready" | "gap" | "na";

export interface ExaminationItemRecord {
  id: string;
  domainId: string;
  domainName: string;
  procedure: string;
  ffiecRef: string;
  status: ExaminationStatus;
  owner: string | null;
  evidenceRoute: string | null;
  evidenceType: string | null;
  notes: string | null;
  autoScore: number | null;
  lastReviewedAt: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExaminationReadiness {
  score: number;
  total: number;
  ready: number;
  inProgress: number;
  gaps: number;
  notStarted: number;
  completionPct: number;
  readinessScore: number;
  domains: { domainId: string; domainName: string; ready: number; total: number; pct: number }[];
}

export async function apiExaminationReadiness(): Promise<ExaminationReadiness> {
  return req("/examination/readiness", { headers: getAuthHeaders() });
}

export async function apiListExaminationItems(opts?: {
  domainId?: string;
  status?: string;
}): Promise<{ count: number; items: ExaminationItemRecord[] }> {
  const params = new URLSearchParams();
  if (opts?.domainId) params.set("domainId", opts.domainId);
  if (opts?.status) params.set("status", opts.status);
  const q = params.toString() ? `?${params}` : "";
  return req(`/examination/items${q}`, { headers: getAuthHeaders() });
}

export async function apiRefreshExamination(): Promise<{ updated: number; readiness: ExaminationReadiness }> {
  return req("/examination/refresh", { method: "POST", headers: getAuthHeaders() });
}

export async function apiPatchExaminationItem(
  id: string,
  patch: { status?: ExaminationStatus; notes?: string; owner?: string },
): Promise<ExaminationItemRecord> {
  return req(`/examination/items/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
    headers: getAuthHeaders(),
  });
}

// ── Phase 2: FIU submission + exam pack ──

export interface FilingSubmissionRecord {
  id: string;
  filingDraftId: string;
  fiuSystem: string;
  fiuReference: string | null;
  status: string;
  submittedBy: string;
  submittedAt: string;
  response: { mode: string; message: string; fiuReference: string } | null;
}

export async function apiSubmitFilingToFiu(id: string): Promise<{
  draft: FilingDraftRecord;
  submission: FilingSubmissionRecord;
}> {
  return req(`/filings/${encodeURIComponent(id)}/submit-fiu`, {
    method: "POST",
    headers: getMlroAuthHeaders(),
  });
}

export interface CtrObligationRecord {
  id: string;
  customerId: string;
  customerName: string;
  transactionDate: string;
  cashIn: number | null;
  cashOut: number | null;
  aggregateUsd: number;
  currency: string;
  channel: string | null;
  accountNumber: string | null;
  tin: string | null;
  branchLocation: string | null;
  aggregated: boolean;
  aggregationNote: string | null;
  status: "pending" | "draft_created" | "filed" | "exempt";
  filingDraftId: string | null;
  tmAlertId: string | null;
  licenseRegion: string;
  dueAt: string;
  filedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function apiCtrStats(): Promise<{
  total: number;
  pending: number;
  draftCreated: number;
  filed: number;
  overdue: number;
  dueSoon: number;
}> {
  return req("/ctr/stats", { headers: getAuthHeaders() });
}

export async function apiListCtrObligations(status?: string): Promise<{ count: number; obligations: CtrObligationRecord[] }> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return req(`/ctr/obligations${q}`, { headers: getAuthHeaders() });
}

export async function apiCreateCtrDraft(obligationId: string): Promise<{ obligation: CtrObligationRecord; draftId: string }> {
  return req(`/ctr/obligations/${encodeURIComponent(obligationId)}/create-draft`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
}

export interface ExamPackCustomer {
  customerId: string;
  customerName: string;
  craRating: string;
  composite: number;
  assessmentId: string;
  checklist: { item: string; status: string }[];
  investigationCases: { caseNumber: string; status: string }[];
  filingDrafts: { id: string; status: string; filingType: string }[];
}

export interface ExamPackDocument {
  examRef: string;
  generatedAt: string;
  sampleSize: number;
  durationMs: number;
  targetHours: number;
  programme: {
    modelVersion: string;
    validationStatus: string;
    trainingCompletionPct: number;
    examinationReadiness: number;
  };
  index: string[];
  customers: ExamPackCustomer[];
}

export async function apiGenerateExamPack(sampleSize = 25): Promise<{ runId: string; pack: ExamPackDocument }> {
  return req("/exam-pack/generate", {
    method: "POST",
    body: JSON.stringify({ sampleSize }),
    headers: getAuthHeaders(),
  });
}

export async function apiListExamPackRuns(): Promise<{
  runs: { id: string; examRef: string; sampleSize: number; durationMs: number; createdAt: string }[];
}> {
  return req("/exam-pack/runs", { headers: getAuthHeaders() });
}

// ── Record retention & evidence management ──

export interface RetentionStats {
  scanned: number;
  active: number;
  approachingExpiry: number;
  eligibleArchive: number;
  onHold: number;
  activeLegalHolds: number;
  exportRuns: number;
  lastRunAt: string | null;
  byClass: Record<string, { scanned: number; onHold: number; eligibleArchive: number }>;
}

export interface LegalHoldRecord {
  id: string;
  scopeType: string;
  scopeId: string | null;
  customerId: string | null;
  reason: string;
  matterRef: string | null;
  placedBy: string;
  placedAt: string;
  releasedBy: string | null;
  releasedAt: string | null;
  status: string;
}

export interface RetentionRecordSummary {
  recordClass: string;
  entityType: string;
  entityId: string;
  customerId: string | null;
  customerName: string | null;
  anchorDate: string;
  retentionUntil: string;
  disposition: string;
  onHold: boolean;
  holdIds: string[];
  policyRef: string;
  immutable: boolean;
}

export interface EvidenceExportRun {
  id: string;
  exportRef: string;
  policyId: string;
  recordCount: number;
  requestedBy: string;
  status: string;
  holdBlockedCount: number;
  createdAt: string;
  manifest?: unknown;
}

export async function apiRetentionStats(): Promise<RetentionStats> {
  return req("/retention/stats", { headers: getAuthHeaders() });
}

export async function apiRetentionPolicies(): Promise<{
  retentionClasses: { class: string; label: string; retentionYears: number; policyRef: string }[];
  exportPolicies: { id: string; label: string; requiredCapability: string; mlroApprovalRequired: boolean }[];
}> {
  return req("/retention/policies", { headers: getAuthHeaders() });
}

export async function apiListRetentionRecords(opts?: {
  customerId?: string;
  disposition?: string;
}): Promise<{ count: number; records: RetentionRecordSummary[] }> {
  const q = new URLSearchParams();
  if (opts?.customerId) q.set("customerId", opts.customerId);
  if (opts?.disposition) q.set("disposition", opts.disposition);
  const suffix = q.toString() ? `?${q}` : "";
  return req(`/retention/records${suffix}`, { headers: getAuthHeaders() });
}

export async function apiRunRetentionScheduler(): Promise<{ runId: string; stats: RetentionStats }> {
  return req("/retention/run", { method: "POST", headers: getAuthHeaders() });
}

export async function apiListLegalHolds(status?: string): Promise<{ count: number; holds: LegalHoldRecord[] }> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return req(`/retention/legal-holds${q}`, { headers: getAuthHeaders() });
}

export async function apiCreateLegalHold(body: {
  scopeType: string;
  scopeId?: string;
  customerId?: string;
  reason: string;
  matterRef?: string;
}): Promise<LegalHoldRecord> {
  return req("/retention/legal-holds", {
    method: "POST",
    body: JSON.stringify(body),
    headers: getAuthHeaders(),
  });
}

export async function apiReleaseLegalHold(id: string): Promise<LegalHoldRecord> {
  return req(`/retention/legal-holds/${encodeURIComponent(id)}/release`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
}

export async function apiListEvidenceExports(customerId?: string): Promise<{ exports: EvidenceExportRun[] }> {
  const q = customerId ? `?customerId=${encodeURIComponent(customerId)}` : "";
  return req(`/retention/exports${q}`, { headers: getAuthHeaders() });
}

export async function apiCreateEvidenceExport(body: {
  policyId: string;
  scopeType: string;
  scopeId?: string;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<{ export: EvidenceExportRun; deniedOnHold: number }> {
  return req("/retention/exports", {
    method: "POST",
    body: JSON.stringify(body),
    headers: getAuthHeaders(),
  });
}

// ── Executive approval notifications ──

export interface ApprovalNotifyPayload {
  decisionId: string;
  perimeter: "global_account" | "mal_bank";
  category: string;
  action: "approve" | "reject" | "escalate";
  entity: string;
  reason: string;
  primaryRole: string;
  notifyRoles: string[];
  recipients: { role: string; email: string; status: string }[];
}

export interface ApprovalNotifyResult {
  ok: boolean;
  decisionId: string;
  queued: { role: string; email: string; status: "queued" }[];
  skipped: { role: string; email: string; status: "skipped_no_email" }[];
  message: string;
}

export async function apiQueueApprovalNotify(
  body: ApprovalNotifyPayload,
): Promise<ApprovalNotifyResult> {
  return req("/approvals/notify", {
    method: "POST",
    body: JSON.stringify(body),
    headers: getAuthHeaders(),
  });
}
