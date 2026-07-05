import { useCallback, useEffect, useMemo, useState } from "react";
import { usePerimeter } from "../context/PerimeterContext";
import {
  apiCaseStats,
  apiFilingStats,
  apiListCases,
  apiOpenItems,
  apiRegulatoryMonitor,
  apiScreeningQueue,
  apiTmAlerts,
  apiValidationGovernance,
  isApiAvailable,
  type CaseStats,
  type ExaminationReadiness,
  type FilingStats,
  type InvestigationCaseRecord,
  type RegulatoryMonitorStatus,
  type ScreeningCaseRecord,
  type TmAlertRecord,
  type ValidationGovernance,
} from "../lib/api";
import {
  buildActionKpis,
  buildAgentPipelines,
  buildControlState,
  buildDecisionQueue,
  buildExternalDeadlines,
  buildTimeCriticalQueue,
  type ActionKpi,
  type AgentPipelineMetrics,
  type ControlStateRow,
  type DecisionRow,
  type ExternalDeadlineRow,
  type TimeCriticalRow,
} from "../lib/executiveDashboard";

export interface ExecutiveDashboardData {
  loading: boolean;
  apiLive: boolean;
  caseStats: CaseStats | null;
  decisionQueue: DecisionRow[];
  timeCritical: TimeCriticalRow[];
  externalDeadlines: ExternalDeadlineRow[];
  actionKpis: ActionKpi[];
  agents: AgentPipelineMetrics;
  controlState: ControlStateRow[];
}

export function useExecutiveDashboard(examReadiness: ExaminationReadiness | null): ExecutiveDashboardData {
  const { perimeter, customerType, corridor } = usePerimeter();
  const [loading, setLoading] = useState(true);
  const [apiLive, setApiLive] = useState(false);
  const [caseStats, setCaseStats] = useState<CaseStats | null>(null);
  const [cases, setCases] = useState<InvestigationCaseRecord[]>([]);
  const [screening, setScreening] = useState<ScreeningCaseRecord[]>([]);
  const [tmAlerts, setTmAlerts] = useState<TmAlertRecord[]>([]);
  const [filings, setFilings] = useState<FilingStats | null>(null);
  const [regMonitor, setRegMonitor] = useState<RegulatoryMonitorStatus | null>(null);
  const [validation, setValidation] = useState<ValidationGovernance | null>(null);
  const [govOpen, setGovOpen] = useState(0);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const live = await isApiAvailable();
    setApiLive(live);
    if (!live) {
      setLoading(false);
      return;
    }
    try {
      const [stats, caseList, scr, tm, fil, reg, val, gov] = await Promise.all([
        apiCaseStats().catch(() => null),
        apiListCases().catch(() => ({ count: 0, cases: [] as InvestigationCaseRecord[] })),
        apiScreeningQueue().catch(() => ({ count: 0, breached: 0, cases: [] as ScreeningCaseRecord[] })),
        apiTmAlerts().catch(() => ({ count: 0, open: 0, mirrored: 0, alerts: [] as TmAlertRecord[] })),
        apiFilingStats().catch(() => null),
        apiRegulatoryMonitor().catch(() => null),
        apiValidationGovernance().catch(() => null),
        apiOpenItems().catch(() => null),
      ]);
      setCaseStats(stats);
      setCases(caseList.cases);
      setScreening(scr.cases);
      setTmAlerts(tm.alerts);
      setFilings(fil);
      setRegMonitor(reg);
      setValidation(val);
      setGovOpen(gov?.counts.open ?? val?.openItems ?? 0);
      setHealthOk(true);
    } catch {
      setHealthOk(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [load, perimeter]);

  return useMemo(() => {
    const decisionQueue = buildDecisionQueue(perimeter, customerType, corridor, cases, govOpen);
    const timeCritical = buildTimeCriticalQueue(
      perimeter,
      customerType,
      corridor,
      cases,
      screening,
      tmAlerts,
    );
    const externalDeadlines = buildExternalDeadlines(perimeter, filings, examReadiness, regMonitor);
    const actionKpis = buildActionKpis(perimeter, caseStats, cases, screening, tmAlerts);
    const agents = buildAgentPipelines(perimeter, cases, filings, { open: govOpen }, validation, regMonitor);
    const controlState = buildControlState(perimeter, screening, regMonitor, validation, healthOk);

    return {
      loading,
      apiLive,
      caseStats,
      decisionQueue,
      timeCritical,
      externalDeadlines,
      actionKpis,
      agents,
      controlState,
    };
  }, [
    perimeter,
    customerType,
    corridor,
    loading,
    apiLive,
    caseStats,
    cases,
    screening,
    tmAlerts,
    filings,
    regMonitor,
    validation,
    govOpen,
    healthOk,
    examReadiness,
  ]);
}
