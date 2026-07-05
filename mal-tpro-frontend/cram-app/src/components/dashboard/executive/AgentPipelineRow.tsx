import { useNavigate } from "react-router-dom";
import AgentAvatar from "../../agents/AgentAvatar";
import { AGENTS, type AgentId } from "../../../config/agents";
import type { AgentPipelineMetrics } from "../../../lib/executiveDashboard";

const PIPELINE_ROWS: Record<
  AgentId,
  { label: string; key: keyof AgentPipelineMetrics["sayed"] | keyof AgentPipelineMetrics["mohsen"] | keyof AgentPipelineMetrics["jana"] }[]
> = {
  sayed: [
    { label: "Policy changes pending approval", key: "policyPending" },
    { label: "Scoring conflicts detected", key: "scoringConflicts" },
    { label: "Controls mapping gaps", key: "controlGaps" },
    { label: "Last published version", key: "lastPublished" },
  ],
  mohsen: [
    { label: "Alerts triaged today", key: "triagedToday" },
    { label: "Cases drafted", key: "casesDrafted" },
    { label: "Cases awaiting evidence", key: "awaitingEvidence" },
    { label: "Avg time to triage (7d)", key: "avgTriageHours" },
  ],
  jana: [
    { label: "STR/SAR drafts pending sign-off", key: "draftsPendingSignoff" },
    { label: "Audit packs compiling", key: "auditPacksCompiling" },
    { label: "Partner responses ready", key: "partnerResponsesReady" },
    { label: "Template set", key: "templateSet" },
  ],
};

export default function AgentPipelineRow({
  agents,
  loading,
}: {
  agents: AgentPipelineMetrics;
  loading: boolean;
}) {
  const nav = useNavigate();
  const ids: AgentId[] = ["sayed", "mohsen", "jana"];

  return (
    <div className="grid grid-cols-3 gap-3.5 max-lg:grid-cols-1">
      {ids.map((id) => {
        const profile = AGENTS[id];
        const metrics = agents[id];
        const rows = PIPELINE_ROWS[id];

        return (
          <button
            key={id}
            type="button"
            onClick={() => nav(metrics.route)}
            className="text-left rounded-2xl p-4 border border-line bg-panel w-full cursor-pointer transition hover:border-ai/30 hover:bg-panel2/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ai"
          >
            <div className="flex items-center gap-2.5 mb-3">
              <AgentAvatar agent={id} size="sm" active />
              <div>
                <div className="font-display font-bold text-sm">{profile.name}</div>
                <div className="text-[10px] text-muted uppercase tracking-wide font-semibold">
                  {id === "sayed" ? "Policy & Scoring" : id === "mohsen" ? "Investigations" : "Reporting & Packs"}
                </div>
              </div>
            </div>
            {loading ? (
              <div className="text-[11px] text-faint">Loading pipeline…</div>
            ) : (
              <dl className="space-y-1.5 m-0">
                {rows.map(({ label, key }) => {
                  const val = metrics[key as keyof typeof metrics];
                  const display =
                    val === null || val === undefined
                      ? "—"
                      : typeof val === "number"
                        ? String(val)
                        : String(val);
                  return (
                    <div key={key} className="flex justify-between gap-2 text-[11px]">
                      <dt className="text-muted m-0">{label}</dt>
                      <dd className="font-semibold text-ink m-0 mono text-[11px]">{display}</dd>
                    </div>
                  );
                })}
              </dl>
            )}
          </button>
        );
      })}
    </div>
  );
}
