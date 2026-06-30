import { Card } from "../ui";
import type { RiskAssessmentSummary, RiskImpact } from "../../engine/riskExplainability";
import type { CustomerMode } from "../../engine/cramSuiteConfig";
import {
  RiskGauge,
  RadarChart,
  HorizontalBarChart,
  ChartGrid,
  bandColor,
  CHART,
} from "../charts/svgCharts";

const IMPACT_COLOR: Record<RiskImpact, string> = {
  increase: CHART.hi,
  floor: CHART.proh,
  decrease: CHART.low,
  neutral: CHART.muted,
};

export default function RiskVisualizationDashboard({
  summary,
  mode,
}: {
  summary: RiskAssessmentSummary;
  mode?: CustomerMode;
}) {
  const driverRows = summary.drivers
    .filter((d) => d.impact !== "neutral")
    .slice(0, 8)
    .map((d) => ({
      label: d.label,
      value: d.score ?? (d.impact === "floor" ? 3 : d.impact === "increase" ? 2 : 1),
      color: IMPACT_COLOR[d.impact],
      suffix: "",
    }));

  const impactCounts = summary.drivers.reduce(
    (acc, d) => {
      acc[d.impact] = (acc[d.impact] ?? 0) + 1;
      return acc;
    },
    {} as Record<RiskImpact, number>,
  );

  return (
    <Card className="p-4">
      <div className="text-[10px] uppercase tracking-wide text-faint mb-3 font-semibold">
        Risk visualization dashboard
      </div>

      <ChartGrid>
        <RiskGauge score={summary.inherentScore} rating={summary.overallRiskRating} label="Inherent composite" />
        <RiskGauge score={summary.residualScore} rating={summary.residualRating} label="Residual (control-adjusted)" />
      </ChartGrid>

      <div className="mt-4 pt-4 border-t border-lineSoft">
        <RadarChart
          title="Six-factor risk profile"
          caption="Source: live CRA engine · weighted factors"
          axes={summary.factorBreakdown
            .filter((f) => f.contribution > 0)
            .map((f) => ({
              label: f.name.replace(/ factor/i, "").replace(" (worst-of)", ""),
              value: f.score,
            }))}
        />
      </div>

      <div className="mt-4 pt-4 border-t border-lineSoft">
        <HorizontalBarChart
          title="Factor contribution to composite"
          caption="Contribution = score × weight · units: composite points"
          max={Math.max(...summary.factorBreakdown.map((f) => f.contribution), 0.5)}
          rows={summary.factorBreakdown
            .filter((f) => f.contribution > 0 || f.key === "product" || f.key === "service" || f.key === "channelInit" || f.key === "channelDelivery" || f.key === "pep")
            .map((f) => ({
              label: f.key === "productService"
                ? `P&S max (${summary.factorBreakdown.find((x) => x.key === "product")?.score}/${summary.factorBreakdown.find((x) => x.key === "service")?.score})`
                : f.key === "channel"
                  ? `Ch max (${summary.factorBreakdown.find((x) => x.key === "channelInit")?.score}/${summary.factorBreakdown.find((x) => x.key === "channelDelivery")?.score})`
                  : `${f.name} (${(f.weight * 100).toFixed(0)}%)`,
              value: f.contribution > 0 ? f.contribution : (f.auditContribution ?? 0),
              color: f.contribution > 0 ? undefined : CHART.muted,
              suffix: f.contribution > 0 ? "" : " audit",
            }))}
        />
      </div>

      {driverRows.length > 0 && (
        <div className="mt-4 pt-4 border-t border-lineSoft">
          <HorizontalBarChart
            title="Active risk drivers by severity"
            caption="Non-neutral drivers only · score proxy where available"
            max={3}
            rows={driverRows}
          />
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-lineSoft grid grid-cols-4 gap-2 text-center">
        {(["increase", "floor", "decrease", "neutral"] as RiskImpact[]).map((k) => (
          <div key={k} className="rounded-lg bg-panel2 py-2 px-1">
            <div className="font-mono text-lg font-bold" style={{ color: IMPACT_COLOR[k] }}>
              {impactCounts[k] ?? 0}
            </div>
            <div className="text-[9px] text-faint uppercase mt-0.5">{k}</div>
          </div>
        ))}
      </div>

      {summary.entityLegalType && mode === "entity" && (
        <div className="mt-4 pt-4 border-t border-lineSoft">
          <HorizontalBarChart
            title="Entity legal type score"
            caption={`${summary.entityLegalType.name} · 10% customer-type weight`}
            max={4}
            rows={[{
              label: summary.entityLegalType.rating,
              value: summary.entityLegalType.score,
              color: summary.entityLegalType.prohibited ? CHART.proh : bandColor(summary.entityLegalType.rating),
            }]}
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
        <Pill active={summary.eddRequired} label="EDD required" color={CHART.hi} />
        <Pill active={summary.isicClassification !== null && summary.isicClassification.score >= 3} label="High ISIC" color={CHART.med} />
        <Pill active={summary.professionRisk !== null && summary.professionRisk.eddTrigger} label="Occupation EDD typology" color={CHART.proh} />
        <Pill active={summary.entityLegalType?.prohibited ?? false} label="Prohibited entity type" color={CHART.proh} />
        <Pill active={summary.entityLegalType?.eddTrigger ?? false} label="Legal-form EDD" color={CHART.med} />
        <Pill active={summary.overrides.length > 0} label={`${summary.overrides.length} override floor(s)`} color={CHART.med} />
      </div>
    </Card>
  );
}

function Pill({ active, label, color }: { active: boolean; label: string; color: string }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full border ${active ? "font-semibold" : "opacity-40"}`}
      style={{ borderColor: color, color: active ? color : CHART.muted }}
    >
      {label}
    </span>
  );
}
