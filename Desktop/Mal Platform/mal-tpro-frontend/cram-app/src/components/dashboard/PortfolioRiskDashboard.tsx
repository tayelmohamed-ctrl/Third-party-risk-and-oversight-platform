import { useMemo } from "react";
import { Card, Sec } from "../ui";
import { analyzeOutcomes } from "../../validation/backtest";
import { DonutChart, GroupedBars, CHART, bandColor } from "../charts/svgCharts";

export default function PortfolioRiskDashboard() {
  const outcome = useMemo(() => analyzeOutcomes(), []);

  const segments = outcome.byBand.map((b) => ({
    label: b.band,
    value: b.count,
    color: bandColor(b.band),
  }));

  return (
    <div>
      <Sec>CRA portfolio analytics — model validation cohort</Sec>
      <p className="text-[12px] text-muted -mt-3 mb-4 max-w-2xl">
        Rating distribution and outcome sensitivity from the {outcome.cohortSize.toLocaleString()}-customer back-test cohort ({outcome.periodMonths} months).
        Source: golden-thread scoring engine · directional sensitivity gate G5.
      </p>

      <div className="grid grid-cols-[1fr_1.4fr] gap-4 max-lg:grid-cols-1">
        <Card className="p-4">
          <DonutChart
            title="Customer risk rating distribution"
            caption={`Source: back-test cohort · n=${outcome.cohortSize}`}
            segments={segments}
          />
          <div className="mt-4 pt-3 border-t border-lineSoft grid grid-cols-2 gap-2 text-[11px]">
            <Stat k="SAR lift (High vs Low)" v={`${outcome.liftSarHighVsLow}×`} ok={outcome.liftSarHighVsLow >= 2} />
            <Stat k="SAR capture in High band" v={`${(outcome.sarCaptureInHigh * 100).toFixed(0)}%`} ok={outcome.sarCaptureInHigh >= 0.5} />
            <Stat k="Monotonic SAR" v={outcome.monotonicSar ? "Yes" : "No"} ok={outcome.monotonicSar} />
            <Stat k="Directional sensitivity" v={outcome.passesDirectionalSensitivity ? "Pass" : "Fail"} ok={outcome.passesDirectionalSensitivity} />
          </div>
        </Card>

        <Card className="p-4">
          <GroupedBars
            title="Outcome rate by risk band"
            caption="SAR filing · TM alert · investigation · adverse outcome · last 18 months"
            groups={outcome.byBand.map((b) => b.band)}
            series={[
              {
                name: "SAR rate",
                values: outcome.byBand.map((b) => b.sarRate * 100),
                color: CHART.hi,
              },
              {
                name: "TM alert",
                values: outcome.byBand.map((b) => b.tmAlertRate * 100),
                color: CHART.med,
              },
              {
                name: "Investigation",
                values: outcome.byBand.map((b) => b.investigationRate * 100),
                color: CHART.low,
              },
            ]}
          />
          <p className="text-[11px] text-muted mt-3 leading-relaxed">{outcome.summary}</p>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4 max-md:grid-cols-1">
        {outcome.byBand.map((b) => (
          <Card key={b.band} className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: bandColor(b.band) }} />
              <span className="text-[12px] font-semibold">{b.band} band</span>
              <span className="text-[10px] text-faint ml-auto">{b.count} customers</span>
            </div>
            <div className="space-y-1 text-[10px]">
              <Row label="Portfolio share" value={`${(b.share * 100).toFixed(1)}%`} />
              <Row label="SAR rate" value={`${(b.sarRate * 100).toFixed(2)}%`} />
              <Row label="TM alert rate" value={`${(b.tmAlertRate * 100).toFixed(1)}%`} />
              <Row label="Adverse outcome" value={`${(b.adverseRate * 100).toFixed(2)}%`} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Stat({ k, v, ok }: { k: string; v: string; ok: boolean }) {
  return (
    <div>
      <div className="text-faint text-[10px] uppercase">{k}</div>
      <div className={`font-semibold ${ok ? "text-low" : "text-hi"}`}>{v}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className="mono text-ink">{value}</span>
    </div>
  );
}
