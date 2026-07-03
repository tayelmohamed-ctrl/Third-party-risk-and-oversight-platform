import { Card, ratingColor } from "../ui";
import type { RiskAssessmentSummary, RiskImpact } from "../../engine/riskExplainability";
import type { CustomerMode } from "../../engine/cramSuiteConfig";
import RiskVisualizationDashboard from "./RiskVisualizationDashboard";

const IMPACT_STYLE: Record<RiskImpact, string> = {
  increase: "text-hi",
  decrease: "text-low",
  neutral: "text-muted",
  floor: "text-proh",
};

const IMPACT_LABEL: Record<RiskImpact, string> = {
  increase: "↑ increases risk",
  decrease: "↓ decreases risk",
  neutral: "— neutral",
  floor: "⛔ floor / prohibit",
};

export default function RiskSummaryPanel({
  summary,
  mode,
}: {
  summary: RiskAssessmentSummary;
  mode: CustomerMode;
}) {
  const rating = summary.overallRiskRating;
  const increases = summary.drivers.filter((d) => d.impact === "increase" || d.impact === "floor");
  const decreases = summary.drivers.filter((d) => d.impact === "decrease");

  return (
    <div className="space-y-3">
      <RiskVisualizationDashboard summary={summary} mode={mode} />

      <Card className="p-4 bg-ink text-[#EDF1F4]">
        <div className="text-[10px] uppercase tracking-wide text-[#8F9BAA]">Overall risk assessment</div>
        <div className="flex justify-between items-start mt-1 gap-3">
          <div>
            <div className="font-mono text-[42px] font-medium leading-none">
              {summary.inherentScore.toFixed(2)}
              <small className="text-lg text-[#7E8B9A]">/3</small>
            </div>
            <div className="text-[11px] text-[#8F9BAA] mt-1">
              Math band {summary.mathBand} · Residual {summary.residualScore.toFixed(2)} ({summary.residualRating})
            </div>
          </div>
          <span
            className="font-display font-bold text-lg px-3 py-1 rounded-lg shrink-0"
            style={{ background: ratingColor(rating), color: "#fff" }}
          >
            {rating.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4 text-[11px]">
          <Out k="Inherent rating" v={summary.inherentRating} />
          <Out k="CDD / EDD level" v={summary.dueDiligence} />
          <Out k="EDD requirement" v={summary.eddRequired ? "Yes — mandatory" : "No"} />
          <Out k="Approval authority" v={summary.approvalAuthority} />
          <Out k="Review frequency" v={summary.reviewMonths ? `${summary.reviewMonths} mo` : "—"} />
          <Out k="Monitoring intensity" v={summary.monitoringIntensity} />
          <Out k="Next review date" v={summary.nextReviewDate ?? "—"} />
        </div>

        {summary.isicClassification && (
          <div className="mt-4 pt-3 border-t border-[#2a3544] text-[10px]">
            <div className="text-[#8F9BAA] uppercase mb-1">Industry / ISIC classification</div>
            <div>
              <b>{summary.isicClassification.code}</b> · {summary.isicClassification.title}
            </div>
            <div className="text-[#8F9BAA]">
              {summary.isicClassification.rating} · score {summary.isicClassification.score}/3 · theme: {summary.isicClassification.theme}
            </div>
            {summary.isicClassification.typologyRules.length > 0 && (
              <div className="text-[#8F9BAA] mt-0.5">Typology rules: {summary.isicClassification.typologyRules.join(", ")}</div>
            )}
          </div>
        )}

        {summary.professionRisk && mode === "individual" && (
          <div className="mt-3 pt-3 border-t border-[#2a3544] text-[10px]">
            <div className="text-[#8F9BAA] uppercase mb-1">Typology / profession risk</div>
            <div>
              Score {summary.professionRisk.score}/3 · {summary.professionRisk.basis}
            </div>
            {summary.professionRisk.typologyDrivers.length > 0 && (
              <div className="text-[#8F9BAA] mt-0.5">{summary.professionRisk.typologyDrivers.join(" · ")}</div>
            )}
            {summary.professionRisk.eddTrigger && (
              <div className="text-med mt-1">EDD trigger — gatekeeper / high-risk occupation typology</div>
            )}
          </div>
        )}

        {summary.pepGate && summary.pepGate.status !== "None" && (
          <div className="mt-3 pt-3 border-t border-[#2a3544] text-[10px]">
            <div className="text-[#8F9BAA] uppercase mb-1">PEP gate — categorical control</div>
            <div><b>{summary.pepGate.status}</b> · {summary.pepGate.gateType}</div>
            <div className="text-[#8F9BAA] mt-0.5">{summary.pepGate.approvalNote}</div>
            {summary.pepGate.overrideId && (
              <div className="text-med mt-1">{summary.pepGate.overrideId} floor — not included in composite</div>
            )}
          </div>
        )}

        {summary.behaviourGate && (
          <div className="mt-3 pt-3 border-t border-[#2a3544] text-[10px]">
            <div className="text-[#8F9BAA] uppercase mb-1">Behaviour gate — expected vs actual</div>
            <div><b>{summary.behaviourGate.label}</b> · {summary.behaviourGate.gateType}</div>
            <div className="text-[#8F9BAA] mt-0.5">
              {summary.behaviourGate.overrideHigh
                ? "Override — High floor (OVR-020)"
                : summary.behaviourGate.reviewRequired
                  ? "Review flag — compliance workflow (no automatic High floor)"
                  : "Clear — aligned with declared profile"}
            </div>
          </div>
        )}

        {summary.entityLegalType && mode === "entity" && (
          <div className="mt-3 pt-3 border-t border-[#2a3544] text-[10px]">
            <div className="text-[#8F9BAA] uppercase mb-1">Entity legal type</div>
            <div>
              <b>{summary.entityLegalType.name}</b> · score {summary.entityLegalType.score}/4 · {summary.entityLegalType.rating}
            </div>
            <div className="text-[#8F9BAA] mt-0.5">{summary.entityLegalType.rationale}</div>
            {summary.entityLegalType.prohibited && (
              <div className="text-proh mt-1">Prohibited — reject / exit (OVR-006)</div>
            )}
            {summary.entityLegalType.eddTrigger && !summary.entityLegalType.prohibited && (
              <div className="text-med mt-1">EDD trigger — legal-form typology</div>
            )}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="text-[10px] uppercase tracking-wide text-faint mb-2">Risk drivers — why this rating</div>
        <ul className="space-y-2 m-0 p-0 list-none">
          {summary.drivers.map((d) => (
            <li key={d.id} className="text-[11px] border-b border-lineSoft pb-2 last:border-0">
              <div className="flex justify-between gap-2">
                <span className="font-semibold text-ink">{d.label}</span>
                <span className={`shrink-0 text-[10px] font-medium ${IMPACT_STYLE[d.impact]}`}>
                  {IMPACT_LABEL[d.impact]}
                </span>
              </div>
              <div className="text-muted mt-0.5">{d.detail}</div>
              <div className="text-[10px] text-faint mt-0.5">{d.policyRef}</div>
            </li>
          ))}
        </ul>
        {(increases.length > 0 || decreases.length > 0) && (
          <div className="grid grid-cols-2 gap-2 mt-3 text-[10px]">
            <div className="rounded-lg bg-hi/5 p-2">
              <div className="font-semibold text-hi mb-1">↑ Risk contributors ({increases.length})</div>
              {increases.slice(0, 4).map((d) => (
                <div key={d.id} className="text-muted truncate">{d.label}</div>
              ))}
            </div>
            <div className="rounded-lg bg-low/5 p-2">
              <div className="font-semibold text-low mb-1">↓ Mitigating factors ({decreases.length})</div>
              {decreases.length === 0 ? (
                <div className="text-muted">None active</div>
              ) : (
                decreases.map((d) => <div key={d.id} className="text-muted truncate">{d.label}</div>)
              )}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="text-[10px] uppercase tracking-wide text-faint mb-2">Factor transparency — auditable breakdown</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="text-faint text-left border-b border-lineSoft">
                <th className="py-1 pr-2 font-semibold">Factor</th>
                <th className="py-1 px-1 font-semibold">Wt</th>
                <th className="py-1 px-1 font-semibold">Score</th>
                <th className="py-1 px-1 font-semibold">Contrib</th>
                <th className="py-1 px-1 font-semibold">Audit</th>
                <th className="py-1 pl-1 font-semibold">Policy</th>
              </tr>
            </thead>
            <tbody>
              {summary.factorBreakdown.map((f) => (
                <tr key={f.key} className={`border-b border-lineSoft last:border-0 ${f.contribution === 0 && f.auditContribution ? "opacity-80" : ""}`}>
                  <td className="py-1.5 pr-2 text-ink">
                    {f.name}
                    {f.compositeNote && <div className="text-[9px] text-faint font-normal">{f.compositeNote}</div>}
                  </td>
                  <td className="py-1.5 px-1 mono text-muted">{(f.weight * 100).toFixed(0)}%</td>
                  <td className="py-1.5 px-1 mono">{f.score}/3</td>
                  <td className="py-1.5 px-1 mono font-semibold">{f.contribution > 0 ? f.contribution.toFixed(3) : "—"}</td>
                  <td className="py-1.5 px-1 mono text-muted">{f.auditContribution !== undefined ? f.auditContribution.toFixed(3) : "—"}</td>
                  <td className="py-1.5 pl-1 text-faint">{f.policyRef.split("·")[0]?.trim()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold text-ink">
                <td className="pt-2">Composite (weighted sum)</td>
                <td />
                <td />
                <td className="pt-2 mono">{summary.inherentScore.toFixed(3)}</td>
                <td className="pt-2 text-faint">→ {summary.inherentRating}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {summary.overrides.length > 0 && (
          <div className="mt-3 pt-3 border-t border-lineSoft">
            <div className="text-[10px] uppercase text-faint mb-1">Override floors applied</div>
            {summary.overrides.map((o) => (
              <div key={o.id} className="text-[11px] py-1">
                <span className="font-semibold">{o.id}</span>
                <span className="text-muted"> ({o.cls}) — {o.why}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="text-[10px] uppercase tracking-wide text-faint mb-2">Policy alignment</div>
        <ul className="text-[11px] text-muted space-y-1 m-0 pl-4">
          {summary.policyAlignment.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Out({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] text-[#8F9BAA] uppercase">{k}</div>
      <div className="font-semibold text-[12px] mt-0.5">{v}</div>
    </div>
  );
}
