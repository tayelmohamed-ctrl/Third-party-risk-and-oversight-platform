import type { Assessment } from "../engine/rerating";
import type { FeedEvent } from "../pipeline/feeds";
import type { ProcessedEvent } from "../pipeline/triggerEngine";
import { getAuthHeaders, getMlroAuthHeaders, getServiceAuthHeaders } from "./authSession";

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
  capabilities: { override: boolean; score: boolean; readAudit: boolean };
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
