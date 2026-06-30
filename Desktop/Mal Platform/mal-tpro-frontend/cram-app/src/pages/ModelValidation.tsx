import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, Sec } from "../components/ui";
import {
  apiValidationGovernance, apiValidationRuns, apiRunValidation, apiPromoteModel,
  type ValidationGovernance, type ValidationRunRow,
} from "../lib/api";

export default function ModelValidation() {
  const [gov, setGov] = useState<ValidationGovernance | null>(null);
  const [runs, setRuns] = useState<ValidationRunRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [g, r] = await Promise.all([apiValidationGovernance(), apiValidationRuns()]);
      setGov(g);
      setRuns(r);
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function handleRun() {
    setBusy(true);
    try {
      await apiRunValidation();
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePromote() {
    setBusy(true);
    try {
      await apiPromoteModel();
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const latest = runs[0]?.report as {
    outcomeAnalysis?: string;
    backtest?: { outcome: { byBand: { band: string; sarRate: number; adverseRate: number; count: number }[]; liftSarHighVsLow: number } };
    golden?: { passed: number; executed: number; passRate: number };
  } | undefined;

  return (
    <div>
      {err && <Card className="p-3 mb-4 text-hi text-[12px]">{err}</Card>}

      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <Card className="p-4">
          <h3 className="m-0 mb-1.5 text-sm font-display">Independent validation</h3>
          <div className="text-[13px]"><b className="mono">{gov?.modelVersionId ?? "—"}</b></div>
          <div className="text-muted text-[12px] my-1.5">
            Status{" "}
            <span className={`pill ${gov?.status === "frozen" ? "bg-low/15 text-low" : "bg-med/15 text-med"}`}>
              {gov?.status === "frozen" ? "Frozen" : "Draft freeze"}
            </span>
            {" · "}{gov?.openItems ?? "—"} open gate{gov?.openItems === 1 ? "" : "s"}
          </div>
          <div className="flex gap-2 mt-3">
            <button className="btn" disabled={busy} onClick={() => void handleRun()}>Run validation</button>
            <button
              className="btn"
              disabled={busy || !gov?.canPromoteToFrozen || gov?.status === "frozen"}
              onClick={() => void handlePromote()}
            >
              Promote to Frozen
            </button>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="m-0 mb-2 text-sm font-display">Outcome analysis — does the score predict SARs?</h3>
          {latest?.backtest?.outcome ? (
            <div className="text-[12px]">
              <p className="text-muted m-0 mb-2">{latest.outcomeAnalysis}</p>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-faint uppercase text-[10px]">
                    <th className="text-left pb-1">Band</th>
                    <th className="text-left pb-1">n</th>
                    <th className="text-left pb-1">SAR rate</th>
                    <th className="text-left pb-1">Adverse</th>
                  </tr>
                </thead>
                <tbody>
                  {latest.backtest.outcome.byBand.map((b) => (
                    <tr key={b.band} className="border-t border-lineSoft">
                      <td className="py-1.5">{b.band}</td>
                      <td>{b.count}</td>
                      <td>{(b.sarRate * 100).toFixed(1)}%</td>
                      <td>{(b.adverseRate * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-[11px] text-muted mt-2">
                Lift High vs Low: <b className="text-ink">{latest.backtest.outcome.liftSarHighVsLow}×</b>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-muted m-0">Run validation to populate back-test cohort analysis.</p>
          )}
        </Card>
      </div>

      <Sec>Governance gates G0–G6</Sec>
      <Card className="p-4">
        <div className="grid gap-2">
          {(gov?.gates ?? []).map((g) => (
            <div key={g.id} className="grid grid-cols-[48px_1fr_auto] gap-3 items-start py-2 border-b border-lineSoft last:border-0">
              <div className={`w-10 h-10 rounded-lg font-bold grid place-items-center text-[11px] ${g.passed ? "bg-low/15 text-low" : "bg-hi/15 text-hi"}`}>{g.id}</div>
              <div>
                <b className="text-[12px]">{g.name}</b>
                <div className="text-muted text-[11px]">{g.objective}</div>
                <div className="text-[10.5px] text-faint mt-0.5">{g.detail}</div>
              </div>
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${g.passed ? "bg-low/15 text-low" : "bg-hi/15 text-hi"}`}>
                {g.passed ? "Pass" : "Fail"}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Sec>Validation run history</Sec>
      <Card className="p-4">
        {runs.length === 0 ? (
          <p className="text-[12px] text-muted m-0">No validation runs yet. <button className="btn inline ml-2" disabled={busy} onClick={() => void handleRun()}>Run first validation</button></p>
        ) : (
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-faint text-[10px] uppercase">
                <th className="text-left pb-2">When</th>
                <th className="text-left pb-2">Actor</th>
                <th className="text-left pb-2">Verdict</th>
                <th className="text-left pb-2">Golden</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => {
                const gs = r.goldenSummary as { passRate?: number; passed?: number; executed?: number };
                return (
                  <tr key={r.id} className="border-t border-lineSoft">
                    <td className="py-2">{new Date(r.at).toLocaleString()}</td>
                    <td>{r.actor}</td>
                    <td><span className={`pill text-[10px] ${r.verdict === "APPROVED" ? "bg-low/15 text-low" : "bg-med/15 text-med"}`}>{r.verdict}</span></td>
                    <td>{gs.passed}/{gs.executed} ({((gs.passRate ?? 0) * 100).toFixed(0)}%)</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <Link to="/governance" className="text-[11px] text-muted mt-3 inline-block">← Governance &amp; Admin</Link>
      </Card>
    </div>
  );
}
