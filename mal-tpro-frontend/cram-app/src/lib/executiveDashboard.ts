import type { CompliancePerimeter, CorridorFilter, CustomerTypeFilter } from "../config/perimeters";
import { matchesPerimeter, perimeterFromLicenseRegion, PERIMETERS } from "../config/perimeters";
import {
  approvalRule,
  classifyDecision,
  approverContact,
  type ApproverRole,
  type DecisionCategory,
} from "../config/approvalRouting";
import type {
  CaseStats,
  ExaminationReadiness,
  FilingStats,
  InvestigationCaseRecord,
  RegulatoryMonitorStatus,
  ScreeningCaseRecord,
  TmAlertRecord,
  ValidationGovernance,
} from "./api";

export type Priority = "P0" | "P1" | "P2";

export interface DecisionRow {
  id: string;
  priority: Priority;
  ageingHours: number;
  entity: string;
  entityId: string;
  reason: string;
  owner: string;
  caseId?: string;
  route: string;
  customerType?: "individual" | "sme";
  corridor?: string;
  category: DecisionCategory;
  primaryApproverRole: ApproverRole;
  primaryApproverLabel: string;
  notifyRoles: ApproverRole[];
  defaultNotifyRoles: ApproverRole[];
  routingSummary: string;
}

export interface TimeCriticalRow {
  id: string;
  alertType: string;
  listOrSource: string;
  slaLabel: string;
  slaMs: number;
  requiredAction: string;
  owner: string;
  constraint?: string;
  route: string;
  customerType?: "individual" | "sme";
  corridor?: string;
}

export interface ExternalDeadlineRow {
  id: string;
  counterparty: string;
  title: string;
  deadline: string;
  deadlineMs: number;
  status: string;
  owner: string;
  route: string;
}

export interface AgentPipelineMetrics {
  sayed: {
    policyPending: number;
    scoringConflicts: number;
    controlGaps: number;
    lastPublished: string;
    route: string;
  };
  mohsen: {
    triagedToday: number;
    casesDrafted: number;
    awaitingEvidence: number;
    avgTriageHours: number | null;
    route: string;
  };
  jana: {
    draftsPendingSignoff: number;
    auditPacksCompiling: number;
    partnerResponsesReady: number;
    templateSet: string;
    route: string;
  };
}

export interface ActionKpi {
  id: string;
  label: string;
  value: number;
  hint: string;
  severity: "low" | "med" | "hi";
  route: string;
  live: boolean;
}

export interface ControlStateRow {
  label: string;
  value: string;
  status: "ok" | "warn" | "error" | "unknown";
  live: boolean;
}

function licenseFromCase(c: InvestigationCaseRecord): string {
  const meta = c.metadata as { licenseRegion?: string } | null;
  return meta?.licenseRegion ?? "UAE";
}

function inferCustomerType(name: string, id: string): "individual" | "sme" {
  if (id.startsWith("ACT") || name.includes("LLC") || name.includes("Ltd") || name.includes("Trading")) {
    return "sme";
  }
  return "individual";
}

function passesFilters(
  customerType: CustomerTypeFilter,
  corridor: CorridorFilter,
  rowType?: "individual" | "sme",
  rowCorridor?: string,
): boolean {
  if (customerType !== "all" && rowType && rowType !== customerType) return false;
  if (corridor !== "all" && rowCorridor && rowCorridor !== corridor) return false;
  return true;
}

export function hoursSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 3600_000));
}

export function slaRemainingMs(iso: string | null): number {
  if (!iso) return Infinity;
  return new Date(iso).getTime() - Date.now();
}

export function formatSla(ms: number): string {
  if (ms <= 0) return "Breached";
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h left`;
  return `${h}h ${m}m left`;
}

function decisionMeta(
  perimeter: CompliancePerimeter,
  input: { id: string; reason: string; title?: string },
): Pick<
  DecisionRow,
  | "category"
  | "primaryApproverRole"
  | "primaryApproverLabel"
  | "notifyRoles"
  | "defaultNotifyRoles"
  | "routingSummary"
> {
  const category = classifyDecision({
    reason: input.reason,
    title: input.title,
    sourceId: input.id,
  });
  const rule = approvalRule(perimeter, category);
  const primary = approverContact(rule.primaryRole);
  return {
    category,
    primaryApproverRole: rule.primaryRole,
    primaryApproverLabel: primary.label,
    notifyRoles: rule.notifyRoles,
    defaultNotifyRoles: rule.defaultNotify,
    routingSummary: rule.summary,
  };
}

function priorityFromSeverity(severity: string, status: string): Priority {
  if (severity === "critical" || status === "pending_mlro") return "P0";
  if (severity === "high") return "P1";
  return "P2";
}

export function buildDecisionQueue(
  perimeter: CompliancePerimeter,
  customerType: CustomerTypeFilter,
  corridor: CorridorFilter,
  cases: InvestigationCaseRecord[],
  openGovernanceItems: number,
): DecisionRow[] {
  const rows: DecisionRow[] = [];

  for (const c of cases) {
    const region = licenseFromCase(c);
    if (!matchesPerimeter(perimeter, region)) continue;
    if (c.status !== "pending_mlro" && c.status !== "open") continue;

    const ct = inferCustomerType(c.customerName, c.customerId);
    const corr = region === "US" ? "US" : "UAE";
    if (!passesFilters(customerType, corridor, ct, corr)) continue;

    const reason = c.status === "pending_mlro" ? "MLRO disposition required" : c.title;
    rows.push({
      id: c.id,
      priority: priorityFromSeverity(c.severity, c.status),
      ageingHours: hoursSince(c.createdAt),
      entity: c.customerName,
      entityId: c.customerId,
      reason,
      owner: c.assignedTo ?? "Unassigned",
      caseId: c.id,
      route: `/investigation?case=${encodeURIComponent(c.id)}`,
      customerType: ct,
      corridor: corr,
      ...decisionMeta(perimeter, { id: c.id, reason, title: c.title }),
    });
  }

  if (openGovernanceItems > 0 && perimeter === "mal_bank") {
    const reason = `${openGovernanceItems} open validation / control item(s) need disposition`;
    rows.push({
      id: "gov-open-items",
      priority: "P1",
      ageingHours: 48,
      entity: "Governance register",
      entityId: "—",
      reason,
      owner: "Head of Compliance",
      route: "/governance",
      customerType: "sme",
      corridor: "UAE",
      ...decisionMeta(perimeter, { id: "gov-open-items", reason }),
    });
  }

  if (perimeter === "global_account") {
    const reason = "Global Account onboarding · Zenus programme attestation pending MLRO";
    rows.push({
      id: "zenus-onboarding",
      priority: "P1",
      ageingHours: 36,
      entity: "SwiftX Trading LLC",
      entityId: "ACT-US-8812",
      reason,
      owner: "Partner Ops",
      route: "/kyb-checklist",
      customerType: "sme",
      corridor: "US",
      ...decisionMeta(perimeter, { id: "zenus-onboarding", reason }),
    });
  }

  return rows.sort((a, b) => {
    const p = { P0: 0, P1: 1, P2: 2 };
    return p[a.priority] - p[b.priority] || b.ageingHours - a.ageingHours;
  });
}

export function buildTimeCriticalQueue(
  perimeter: CompliancePerimeter,
  customerType: CustomerTypeFilter,
  corridor: CorridorFilter,
  cases: InvestigationCaseRecord[],
  screening: ScreeningCaseRecord[],
  tmAlerts: TmAlertRecord[],
): TimeCriticalRow[] {
  const rows: TimeCriticalRow[] = [];

  for (const s of screening) {
    if (!matchesPerimeter(perimeter, s.licenseRegion)) continue;
    if (s.status === "clear" || s.status === "false_positive") continue;
    const ms = slaRemainingMs(s.slaDueAt);
    if (ms > 48 * 3600_000 && s.status !== "true_match") continue;

    const ct = inferCustomerType(s.customerName, s.customerId);
    const corr = s.licenseRegion === "US" ? "US" : "UAE";
    if (!passesFilters(customerType, corridor, ct, corr)) continue;

    rows.push({
      id: s.id,
      alertType: s.status === "true_match" ? "Sanctions true match" : "Screening review",
      listOrSource: s.vendorCaseId ? `Vital4 · ${s.vendorCaseId}` : "Vital4",
      slaLabel: formatSla(ms),
      slaMs: ms,
      requiredAction: s.status === "true_match" ? "Freeze / Escalate" : "Review",
      owner: "Screening queue",
      constraint:
        perimeter === "mal_bank" && s.status === "true_match"
          ? "Tipping-off sensitive — restricted comms"
          : perimeter === "global_account"
            ? "Zenus escalation may be required"
            : undefined,
      route: `/screening?case=${encodeURIComponent(s.id)}`,
      customerType: ct,
      corridor: corr,
    });
  }

  for (const a of tmAlerts) {
    if (!matchesPerimeter(perimeter, a.licenseRegion)) continue;
    if (a.status === "closed" || a.status === "cleared") continue;
    if (a.severity !== "high" && a.severity !== "critical") continue;

    const ct = inferCustomerType(a.customerName, a.customerId);
    const corr = a.licenseRegion === "US" ? "US" : "UAE";
    if (!passesFilters(customerType, corridor, ct, corr)) continue;

    rows.push({
      id: a.id,
      alertType: a.listHit ? "TM + list hit" : "TM pattern",
      listOrSource: a.ruleName ?? a.ruleId ?? "Oscilar",
      slaLabel: "24h review SLA",
      slaMs: 24 * 3600_000,
      requiredAction: "Review / Investigate",
      owner: "Mohsen pipeline",
      route: `/transaction-monitoring?alert=${encodeURIComponent(a.id)}`,
      customerType: ct,
      corridor: corr,
    });
  }

  for (const c of cases) {
    const region = licenseFromCase(c);
    if (!matchesPerimeter(perimeter, region)) continue;
    if (!c.slaDueAt) continue;
    const ms = slaRemainingMs(c.slaDueAt);
    if (ms > 24 * 3600_000) continue;

    rows.push({
      id: `case-sla-${c.id}`,
      alertType: "Case SLA",
      listOrSource: c.caseNumber,
      slaLabel: formatSla(ms),
      slaMs: ms,
      requiredAction: c.status === "investigating" ? "Complete investigation" : "Assign / Review",
      owner: c.assignedTo ?? "Unassigned",
      route: `/investigation?case=${encodeURIComponent(c.id)}`,
    });
  }

  return rows.sort((a, b) => a.slaMs - b.slaMs);
}

export function buildExternalDeadlines(
  perimeter: CompliancePerimeter,
  filings: FilingStats | null,
  exam: ExaminationReadiness | null,
  regMonitor: RegulatoryMonitorStatus | null,
): ExternalDeadlineRow[] {
  const rows: ExternalDeadlineRow[] = [];
  const in7d = Date.now() + 7 * 86400_000;

  if (filings && filings.pendingReview + filings.draft > 0) {
    rows.push({
      id: "filings-pending",
      counterparty: perimeter === "mal_bank" ? "CBUAE FIU" : "FinCEN / Partner",
      title: `${filings.pendingReview + filings.draft} STR/SAR draft(s) pending sign-off`,
      deadline: new Date(in7d).toISOString(),
      deadlineMs: in7d - Date.now(),
      status: filings.pendingReview > 0 ? "awaiting sign-off" : "drafting",
      owner: "Jana · MLRO",
      route: "/reporting?status=pending_review",
    });
  }

  if (regMonitor && regMonitor.pendingChanges > 0) {
    rows.push({
      id: "reg-changes",
      counterparty: "Regulator sources",
      title: `${regMonitor.pendingChanges} regulatory source change(s) — impact review`,
      deadline: new Date(Date.now() + 3 * 86400_000).toISOString(),
      deadlineMs: 3 * 86400_000,
      status: "awaiting evidence",
      owner: "Sayed",
      route: "/regulatory",
    });
  }

  if (exam && exam.gaps > 0 && perimeter === "mal_bank") {
    rows.push({
      id: "exam-gaps",
      counterparty: "CBUAE examination",
      title: `${exam.gaps} FFIEC/CBUAE procedure gap(s) — readiness ${exam.readinessScore}/100`,
      deadline: new Date(in7d).toISOString(),
      deadlineMs: in7d - Date.now(),
      status: "awaiting evidence",
      owner: "MLRO",
      route: "/examination",
    });
  }

  if (perimeter === "global_account") {
    rows.push({
      id: "zenus-rfi",
      counterparty: "Zenus Bank",
      title: "Partner RFI — Global Account programme attestation Q2",
      deadline: new Date(Date.now() + 5 * 86400_000).toISOString(),
      deadlineMs: 5 * 86400_000,
      status: "drafting",
      owner: "Partner Compliance",
      route: "/partner",
    });
  }

  if (perimeter === "mal_bank") {
    rows.push({
      id: "audit-pack",
      counterparty: "Internal audit",
      title: "CBUAE examination pack — 25-customer sample",
      deadline: new Date(Date.now() + 10 * 86400_000).toISOString(),
      deadlineMs: 10 * 86400_000,
      status: "compiling",
      owner: "Jana",
      route: "/exam-pack",
    });
  }

  return rows.sort((a, b) => a.deadlineMs - b.deadlineMs);
}

export function buildActionKpis(
  perimeter: CompliancePerimeter,
  caseStats: CaseStats | null,
  cases: InvestigationCaseRecord[],
  screening: ScreeningCaseRecord[],
  tmAlerts: TmAlertRecord[],
): ActionKpi[] {
  const regionCases = cases.filter((c) => matchesPerimeter(perimeter, licenseFromCase(c)));
  const breaches24h = regionCases.filter((c) => {
    if (!c.slaDueAt) return false;
    const ms = slaRemainingMs(c.slaDueAt);
    return ms <= 0 || ms < 24 * 3600_000;
  }).length;

  const screeningBreaches = screening.filter(
    (s) => matchesPerimeter(perimeter, s.licenseRegion) && slaRemainingMs(s.slaDueAt) < 24 * 3600_000,
  ).length;

  const criticalOpen =
    regionCases.filter((c) => c.severity === "critical" && c.status !== "closed").length +
    tmAlerts.filter(
      (a) =>
        matchesPerimeter(perimeter, a.licenseRegion) &&
        (a.severity === "critical" || a.severity === "high") &&
        a.status !== "closed",
    ).length;

  const ageingThresholdDays = 7;
  const ageingCases = regionCases.filter(
    (c) => c.status !== "closed" && hoursSince(c.createdAt) > ageingThresholdDays * 24,
  ).length;

  return [
    {
      id: "breach-24h",
      label: "Breaches due < 24h",
      value: breaches24h + screeningBreaches + (caseStats?.breachSlaSoon ?? 0),
      hint: "Cases + screening SLA",
      severity: breaches24h + screeningBreaches > 0 ? "hi" : "low",
      route: "/screening",
      live: caseStats !== null,
    },
    {
      id: "critical-open",
      label: "Critical alerts open",
      value: criticalOpen || (caseStats ? caseStats.open + caseStats.investigating : 0),
      hint: "TM + investigation",
      severity: criticalOpen > 0 ? "hi" : "med",
      route: "/investigation",
      live: caseStats !== null,
    },
    {
      id: "ageing",
      label: `Cases ageing > ${ageingThresholdDays}d`,
      value: ageingCases,
      hint: "Open investigations",
      severity: ageingCases > 3 ? "med" : "low",
      route: "/investigation",
      live: cases.length > 0,
    },
  ];
}

export function buildAgentPipelines(
  perimeter: CompliancePerimeter,
  cases: InvestigationCaseRecord[],
  filings: FilingStats | null,
  governance: { open: number } | null,
  validation: ValidationGovernance | null,
  regMonitor: RegulatoryMonitorStatus | null,
): AgentPipelineMetrics {
  const regionCases = cases.filter((c) => matchesPerimeter(perimeter, licenseFromCase(c)));
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const triagedToday = regionCases.filter(
    (c) => new Date(c.updatedAt).getTime() >= todayStart.getTime(),
  ).length;

  const awaitingEvidence = regionCases.filter(
    (c) => c.status === "investigating" && c.pipelineStep < 3,
  ).length;

  const templateSet = PERIMETERS[perimeter].templateSet;

  return {
    sayed: {
      policyPending: regMonitor?.pendingChanges ?? governance?.open ?? 0,
      scoringConflicts: 0,
      controlGaps: governance?.open ?? 0,
      lastPublished: validation?.modelVersionId ?? "CRAM-CBUAE-2026-05",
      route: "/regulatory",
    },
    mohsen: {
      triagedToday,
      casesDrafted: regionCases.filter((c) => c.pipelineStep >= 4).length,
      awaitingEvidence,
      avgTriageHours: regionCases.length
        ? Math.round(
            regionCases.reduce((s, c) => s + hoursSince(c.createdAt), 0) / regionCases.length,
          )
        : null,
      route: "/investigation",
    },
    jana: {
      draftsPendingSignoff: (filings?.pendingReview ?? 0) + (filings?.draft ?? 0),
      auditPacksCompiling: perimeter === "mal_bank" ? 1 : 0,
      partnerResponsesReady: perimeter === "global_account" ? 1 : 0,
      templateSet,
      route: "/reporting",
    },
  };
}

export function buildControlState(
  perimeter: CompliancePerimeter,
  screening: ScreeningCaseRecord[],
  regMonitor: RegulatoryMonitorStatus | null,
  validation: ValidationGovernance | null,
  healthOk: boolean | null,
): ControlStateRow[] {
  const base: ControlStateRow[] = [
    {
      label: "Sanctions provider (Vital4)",
      value: healthOk === false ? "Degraded" : "OK",
      status: healthOk === false ? "error" : "ok",
      live: healthOk !== null,
    },
    {
      label: "Screening queue open",
      value: String(
        screening.filter((s) => matchesPerimeter(perimeter, s.licenseRegion) && s.status === "pending")
          .length,
      ),
      status: "ok",
      live: true,
    },
    {
      label: "Regulatory source monitor",
      value: regMonitor?.lastRunAt
        ? `Last run ${new Date(regMonitor.lastRunAt).toLocaleString()}`
        : "Not run",
      status: (regMonitor?.lastErrors ?? 0) > 0 ? "warn" : "ok",
      live: regMonitor !== null,
    },
    {
      label: "CRAM model version",
      value: validation?.modelVersionId ?? "CRAM-CBUAE-2026-05",
      status: validation?.status === "frozen" ? "ok" : "warn",
      live: validation !== null,
    },
  ];

  if (perimeter === "global_account") {
    base.push(
      {
        label: "Partner webhook (Zenus callbacks)",
        value: healthOk === false ? "Check logs" : "OK",
        status: healthOk === false ? "warn" : "ok",
        live: healthOk !== null,
      },
      {
        label: "TM rules deployed",
        value: "40 Oscilar rules",
        status: "ok",
        live: true,
      },
    );
  } else {
    base.push(
      {
        label: "Don't-say matrix version",
        value: "UAE-TIPOFF-2026-03",
        status: "ok",
        live: false,
      },
      {
        label: "Audit log pipeline",
        value: healthOk === false ? "Warning" : "Append-only OK",
        status: healthOk === false ? "warn" : "ok",
        live: healthOk !== null,
      },
      {
        label: "AML training register",
        value: "See /training",
        status: "ok",
        live: false,
      },
    );
  }

  return base;
}

export { perimeterFromLicenseRegion };
