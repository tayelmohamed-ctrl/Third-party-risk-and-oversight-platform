import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui";
import AgentBanner from "../components/agents/AgentBanner";
import {
  apiGenerateExamPack,
  apiListExamPackRuns,
  type ExamPackDocument,
} from "../lib/api";
import { hasOverrideCapability } from "../lib/authSession";

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function ExamPack() {
  const [sampleSize, setSampleSize] = useState(25);
  const [pack, setPack] = useState<ExamPackDocument | null>(null);
  const [runs, setRuns] = useState<{ id: string; examRef: string; sampleSize: number; durationMs: number; createdAt: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const canGenerate = hasOverrideCapability();

  const refreshRuns = useCallback(async () => {
    try {
      const { runs: list } = await apiListExamPackRuns();
      setRuns(list);
    } catch {
      setRuns([]);
    }
  }, []);

  useEffect(() => { void refreshRuns(); }, [refreshRuns]);

  async function handleGenerate() {
    setBusy(true);
    setMsg("");
    try {
      const { pack: generated } = await apiGenerateExamPack(sampleSize);
      setPack(generated);
      setMsg(`Generated ${generated.examRef} in ${fmtMs(generated.durationMs)}`);
      await refreshRuns();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function copyPack() {
    if (!pack) return;
    void navigator.clipboard.writeText(JSON.stringify(pack, null, 2));
    setMsg("Exam pack copied to clipboard");
    setTimeout(() => setMsg(""), 2500);
  }

  const withinTarget = pack ? pack.durationMs < 2 * 60 * 60 * 1000 : null;

  return (
    <div>
      <AgentBanner agent="jana" title="CBUAE Examination Pack">
        Structured customer sample export for CBUAE / partner bank inspections — target &lt; 2 hours for 25 customers per build spec.
      </AgentBanner>

      {msg && <Card className="p-3 mt-4 text-[12px]">{msg}</Card>}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 mt-4">
        <div className="p-5 rounded-2xl border border-[#26285C] space-y-4" style={{ background: "linear-gradient(135deg,#0c1233 0%,#181c48 100%)" }}>
          <div className="text-[10px] text-[#6E72A6] uppercase tracking-[0.12em] font-semibold">Generate pack</div>
          <label className="block text-[11.5px] text-[#A7ACDB]">
            Sample size <span className="text-[#6E72A6]">(max 50)</span>
            <input
              type="number"
              min={1}
              max={50}
              className="input w-full mt-2"
              value={sampleSize}
              disabled={!canGenerate}
              onChange={(e) => setSampleSize(Number(e.target.value))}
            />
          </label>
          <button
            type="button"
            className="w-full py-2.5 px-4 rounded-xl text-[12px] font-semibold border border-transparent text-white transition-all"
            style={{ background: canGenerate && !busy ? "linear-gradient(90deg,#A953DF,#7C6CF7)" : "rgba(169,83,223,0.25)" }}
            disabled={busy || !canGenerate}
            onClick={() => void handleGenerate()}
          >
            {busy ? "Generating…" : `Generate ${sampleSize}-customer pack`}
          </button>
          {!canGenerate && (
            <p className="text-[10px] text-[#6E72A6] m-0">MLRO/Reviewer access required.</p>
          )}
          <Link to="/examination" className="btn btn-ghost w-full text-[11px]">FFIEC matrix →</Link>
        </div>

        <div className="space-y-4">
          {pack && (
            <Card className="p-4">
              <div className="flex flex-wrap gap-3 items-start justify-between mb-3">
                <div>
                  <div className="mono text-[10px] text-faint">{pack.examRef}</div>
                  <div className="font-display font-bold text-lg">{pack.sampleSize} customers</div>
                  <div className="text-[11px] text-muted">
                    Generated {new Date(pack.generatedAt).toLocaleString()} · {fmtMs(pack.durationMs)}
                    {withinTarget !== null && (
                      <span className={withinTarget ? " text-low ml-2" : " text-med ml-2"}>
                        {withinTarget ? "Within 2h target" : "Review timing for full sample"}
                      </span>
                    )}
                  </div>
                </div>
                <button type="button" className="btn btn-ghost text-[11px]" onClick={copyPack}>Copy JSON</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {[
                  { l: "Model", v: pack.programme.modelVersion },
                  { l: "Validation", v: pack.programme.validationStatus },
                  { l: "Training", v: `${pack.programme.trainingCompletionPct}%` },
                  { l: "Exam readiness", v: `${pack.programme.examinationReadiness}/100` },
                ].map((s) => (
                  <div key={s.l} className="p-3 rounded-xl border border-[#26285C] bg-[#10103C] text-[11px]">
                    <div className="text-[9px] text-[#6E72A6] uppercase tracking-wide font-semibold">{s.l}</div>
                    <div className="font-display font-bold text-white mt-0.5 truncate">{s.v}</div>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-faint uppercase mb-2">Evidence index (per customer)</div>
              <ul className="text-[10px] text-muted m-0 pl-4 list-disc columns-2 gap-x-4">
                {pack.index.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </Card>
          )}

          {pack && (
            <Card className="p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-line bg-panel2 text-[10px] uppercase text-faint font-semibold">
                Customer sample
              </div>
              <div className="overflow-x-auto max-h-[50vh]">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-faint border-b border-lineSoft text-left">
                      <th className="px-4 py-2">Customer</th>
                      <th className="px-4 py-2">CRA</th>
                      <th className="px-4 py-2">Cases</th>
                      <th className="px-4 py-2">Filings</th>
                      <th className="px-4 py-2">Checklist</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pack.customers.map((c) => (
                      <tr key={c.customerId} className="border-b border-lineSoft">
                        <td className="px-4 py-2">
                          <div className="font-semibold">{c.customerName}</div>
                          <div className="mono text-[9px] text-faint">{c.customerId}</div>
                        </td>
                        <td className="px-4 py-2"><span className="pill bg-panel2">{c.craRating}</span></td>
                        <td className="px-4 py-2">{c.investigationCases.length}</td>
                        <td className="px-4 py-2">{c.filingDrafts.length}</td>
                        <td className="px-4 py-2">
                          {c.checklist.filter((x) => x.status === "complete").length}/{c.checklist.length}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {runs.length > 0 && (
            <Card className="p-4">
              <div className="text-[10px] text-faint uppercase font-semibold mb-2">Recent runs</div>
              <ul className="text-[11px] m-0 p-0 list-none space-y-1">
                {runs.map((r) => (
                  <li key={r.id} className="flex justify-between text-muted">
                    <span className="mono">{r.examRef}</span>
                    <span>{r.sampleSize} · {fmtMs(r.durationMs)} · {new Date(r.createdAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
