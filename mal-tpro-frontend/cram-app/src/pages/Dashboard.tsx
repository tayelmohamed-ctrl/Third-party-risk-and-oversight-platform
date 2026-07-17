import { useEffect, useState } from "react";
import clsx from "clsx";
import { usePerimeter } from "../context/PerimeterContext";
import { PERIMETERS } from "../config/perimeters";
import { apiExaminationReadiness, type ExaminationReadiness } from "../lib/api";
import { useExecutiveDashboard } from "../hooks/useExecutiveDashboard";
import { Sec } from "../components/ui";
import { PerimeterSwitch, DashboardFilters } from "../components/dashboard/executive/PerimeterBar";
import DecisionQueuePanel from "../components/dashboard/executive/DecisionQueuePanel";
import TimeCriticalPanel from "../components/dashboard/executive/TimeCriticalPanel";
import ExternalDeadlinesPanel from "../components/dashboard/executive/ExternalDeadlinesPanel";
import AgentPipelineRow from "../components/dashboard/executive/AgentPipelineRow";
import ActionKpiRow from "../components/dashboard/executive/ActionKpiRow";
import ControlStatePanel from "../components/dashboard/executive/ControlStatePanel";
import DashboardMetricsTab from "../components/dashboard/executive/DashboardMetricsTab";
import ApproverDirectoryPanel from "../components/dashboard/executive/ApproverDirectoryPanel";
import OnboardingCyclesPanel from "../components/dashboard/executive/OnboardingCyclesPanel";

type Tab = "operations" | "metrics";

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("operations");
  const { perimeter } = usePerimeter();
  const [examReadiness, setExamReadiness] = useState<ExaminationReadiness | null>(null);
  const dash = useExecutiveDashboard(examReadiness);

  useEffect(() => {
    apiExaminationReadiness().then(setExamReadiness).catch(() => setExamReadiness(null));
  }, [perimeter]);

  const perimeterDef = PERIMETERS[perimeter];

  return (
    <div>
      <div className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <PerimeterSwitch />
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-line bg-panel2 text-muted font-semibold">
                Approver: {perimeterDef.approverLabel}
              </span>
            </div>
            <p className="text-[12px] text-muted mt-2 mb-0 max-w-3xl">
              {perimeterDef.subtitle} · Queues, KPIs, and agent pipelines filter to this perimeter.
            </p>
            <DashboardFilters />
          </div>
          <div className="flex rounded-lg border border-line overflow-hidden text-[11px] font-semibold shrink-0">
            <button
              type="button"
              className={clsx(
                "px-3 py-1.5 border-none cursor-pointer",
                tab === "operations" ? "bg-ai/15 text-white" : "bg-panel2 text-muted",
              )}
              onClick={() => setTab("operations")}
            >
              Operations
            </button>
            <button
              type="button"
              className={clsx(
                "px-3 py-1.5 border-none cursor-pointer",
                tab === "metrics" ? "bg-ai/15 text-white" : "bg-panel2 text-muted",
              )}
              onClick={() => setTab("metrics")}
            >
              Metrics
            </button>
          </div>
        </div>
      </div>

      {tab === "metrics" ? (
        <DashboardMetricsTab />
      ) : (
        <>
          <Sec>Action KPIs — click to drill down</Sec>
          <ActionKpiRow kpis={dash.actionKpis} />

          <OnboardingCyclesPanel />

          <Sec>Operational queues</Sec>
          <div className="space-y-4">
            <DecisionQueuePanel rows={dash.decisionQueue} loading={dash.loading} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TimeCriticalPanel rows={dash.timeCritical} loading={dash.loading} />
              <ExternalDeadlinesPanel rows={dash.externalDeadlines} loading={dash.loading} />
            </div>
          </div>

          <Sec>Agent pipelines · {perimeterDef.label}</Sec>
          <AgentPipelineRow agents={dash.agents} loading={dash.loading} />

          <div className="mt-5">
            <ControlStatePanel rows={dash.controlState} />
          </div>

          <ApproverDirectoryPanel />

          {!dash.apiLive && (
            <p className="text-[11px] text-med mt-4">
              API offline — start <code className="mono text-[10px]">npm run dev</code> for live queues. Seed data may still appear for partner deadlines.
            </p>
          )}
        </>
      )}
    </div>
  );
}
