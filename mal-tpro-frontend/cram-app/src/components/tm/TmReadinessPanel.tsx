import { useMemo, useState } from "react";
import { Card, Sec } from "../ui";
import {
  TM_ALERT_BUSINESS_RULES,
  TM_GO_LIVE_GATES,
  TM_INVESTIGATION_RULES,
  TM_SCREENING_BUSINESS_RULES,
  TM_BRD_META,
  TM_FUNCTIONAL_REQUIREMENTS,
} from "../../config/tmImplementationBrd";
import {
  TM_ASSESSMENT_META,
  TM_NO_GO_CONDITIONS,
  type AssessmentResponse,
} from "../../config/tmPreImplementationAssessment";
import ruleLibrary from "../../data/oscilar_rule_library.json";

type Tab = "gates" | "alerts" | "screening" | "investigation" | "rules";

const TABS: { id: Tab; label: string }[] = [
  { id: "gates", label: "Go-live gates" },
  { id: "alerts", label: "Alert rules" },
  { id: "screening", label: "Screening rules" },
  { id: "investigation", label: "Investigation" },
  { id: "rules", label: "Oscilar crosswalk" },
];

export default function TmReadinessPanel({
  compact = false,
  defaultTab = "gates",
}: {
  compact?: boolean;
  defaultTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const oscilarRules = ruleLibrary.rules as { id: string; name: string; category: string; status: string }[];

  const ruleCrosswalk = useMemo(() => {
    return TM_FUNCTIONAL_REQUIREMENTS.filter((fr) => fr.oscilarRuleIds?.length).flatMap((fr) =>
      (fr.oscilarRuleIds ?? []).map((rid) => ({
        brdId: fr.id,
        brdCategory: fr.category,
        ruleId: rid,
        rule: oscilarRules.find((r) => r.id === rid),
      })),
    );
  }, [oscilarRules]);

  return (
    <div className={compact ? "mt-3" : "mt-4"}>
      <Sec>TM pre-implementation readiness (BRD + questionnaire)</Sec>
      <p className="text-[11px] text-muted -mt-3 mb-3">
        {TM_BRD_META.title} · v{TM_BRD_META.version} · {TM_ASSESSMENT_META.title}
      </p>
      <div className="flex gap-2 flex-wrap mb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition ${
              tab === t.id ? "bg-ai/20 border-ai text-ink" : "border-line text-muted hover:bg-panel2"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "gates" && (
        <div className="grid gap-3">
          {TM_GO_LIVE_GATES.map((g) => (
            <Card key={g.id} className="p-3">
              <div className="flex justify-between gap-2 flex-wrap">
                <span className="font-bold text-[13px]">{g.id} · {g.name}</span>
                <span className="text-[10px] text-muted mono">{g.approver}</span>
              </div>
              <p className="text-[12px] text-muted mt-1">{g.requirement}</p>
            </Card>
          ))}
          <Card className="p-3 border-hi/30">
            <div className="font-bold text-[12px] mb-2">No-go conditions (sample)</div>
            <div className="space-y-2">
              {TM_NO_GO_CONDITIONS.slice(0, 8).map((n) => (
                <div key={n.id} className="text-[11px] border-b border-line/50 pb-2">
                  <span className="font-semibold text-hi">{n.id}</span>
                  <span className="text-muted"> — {n.condition}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "alerts" && (
        <div className="grid gap-2">
          {TM_ALERT_BUSINESS_RULES.map((r) => (
            <Card key={r.id} className="p-3">
              <div className="font-bold text-[12px]">{r.id} · {r.title}</div>
              <p className="text-[12px] mt-1">{r.requirement}</p>
              <p className="text-[10px] text-muted mt-1 mono">{r.policyRef}</p>
            </Card>
          ))}
        </div>
      )}

      {tab === "screening" && (
        <div className="grid gap-2">
          {TM_SCREENING_BUSINESS_RULES.map((r) => (
            <Card key={r.id} className="p-3">
              <div className="flex justify-between gap-2">
                <span className="font-bold text-[12px]">{r.id} · {r.title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-panel2">{r.authority}</span>
              </div>
              <p className="text-[12px] mt-1">{r.requirement}</p>
              <p className="text-[10px] text-muted mt-1 mono">{r.policyRef}</p>
            </Card>
          ))}
        </div>
      )}

      {tab === "investigation" && (
        <div className="grid gap-2">
          {TM_INVESTIGATION_RULES.map((r) => (
            <Card key={r.id} className="p-3">
              <div className="flex justify-between gap-2">
                <span className="font-bold text-[12px]">{r.id} · {r.title}</span>
                {r.mohsenStep != null && (
                  <span className="text-[10px] text-ai">Pipeline step {r.mohsenStep + 1}</span>
                )}
              </div>
              <p className="text-[12px] mt-1">{r.requirement}</p>
              <p className="text-[10px] text-muted mt-1 mono">{r.policyRef}</p>
            </Card>
          ))}
        </div>
      )}

      {tab === "rules" && (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-muted border-b border-line">
                <th className="py-2 pr-3">BRD</th>
                <th className="py-2 pr-3">Oscilar rule</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {ruleCrosswalk.map((row) => (
                <tr key={`${row.brdId}-${row.ruleId}`} className="border-b border-line/40">
                  <td className="py-2 pr-3 mono">{row.brdId}</td>
                  <td className="py-2 pr-3">{row.rule?.name ?? row.ruleId}</td>
                  <td className="py-2 pr-3">{row.rule?.category ?? "—"}</td>
                  <td className="py-2">{row.rule?.status ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-muted mt-2">
            Deployed rules must satisfy FR-007 alert generation and linked UAT scenarios before GATE-3 sign-off.
          </p>
        </div>
      )}
    </div>
  );
}

export function responseLabel(score: number): string {
  if (score >= TM_ASSESSMENT_META.scoring.goLiveReady) return "Go-live ready";
  if (score >= TM_ASSESSMENT_META.scoring.conditional) return "Conditionally ready";
  if (score >= TM_ASSESSMENT_META.scoring.notReady) return "Not ready";
  return "Blocked";
}

export type { AssessmentResponse };
