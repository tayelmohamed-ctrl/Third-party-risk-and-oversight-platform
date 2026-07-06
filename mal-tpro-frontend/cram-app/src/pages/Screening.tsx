import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "../components/ui";
import AgentBanner from "../components/agents/AgentBanner";
import AgentAiTag from "../components/agents/AgentAiTag";
import {
  apiDisposeScreeningCase, apiGetScreeningCase, apiScreeningQueue, isApiAvailable,
  type ScreeningCaseRecord,
} from "../lib/api";
import { isSlaBreached, slaRemaining, STATUS_PILL } from "../lib/screeningUi";
import { SCREENING_SLA } from "../config/partnerIntegration";

export default function Screening() {
  const [params, setParams] = useSearchParams();
  const [queue, setQueue] = useState<ScreeningCaseRecord[]>([]);
  const [breached, setBreached] = useState(0);
  const [selected, setSelected] = useState<ScreeningCaseRecord | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const caseIdParam = params.get("caseId");

  const refresh = useCallback(async () => {
    if (!(await isApiAvailable())) {
      setLive(false);
      return;
    }
    setLive(true);
    try {
      const data = await apiScreeningQueue();
      setQueue(data.cases);
      setBreached(data.breached);
      setMsg(null);
      if (caseIdParam) {
        const inQueue = data.cases.find((c) => c.id === caseIdParam);
        if (inQueue) {
          setSelected(inQueue);
        } else {
          try {
            setSelected(await apiGetScreeningCase(caseIdParam));
          } catch {
            setSelected(null);
          }
        }
      }
    } catch (e) {
      setMsg((e as Error).message);
    }
  }, [caseIdParam]);

  useEffect(() => { void refresh(); }, [refresh]);

  const selectCase = (c: ScreeningCaseRecord) => {
    setSelected(c);
    setNotes("");
    setParams({ caseId: c.id });
  };

  async function dispose(disposition: "clear" | "false_positive" | "true_match") {
    if (!selected) return;
    setBusy(true);
    setMsg(null);
    try {
      const updated = await apiDisposeScreeningCase(selected.id, { disposition, notes: notes.trim() || undefined });
      setMsg(`Disposition recorded: ${disposition.replace("_", " ")}`);
      setSelected(updated);
      await refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const stats = useMemo(() => ({
    potential: queue.filter((c) => c.status === "potential").length,
    pending: queue.filter((c) => c.status === "pending").length,
    trueMatch: queue.filter((c) => c.status === "true_match").length,
  }), [queue]);

  if (!live) {
    return (
      <div>
        <AgentBanner agent="sayed" title="Screening disposition queue">
          Start the CRAM API (`npm run dev` in cram-app) to load the Vital4 disposition queue.
        </AgentBanner>
        <Card className="p-4 mt-4 text-[13px] text-muted">
          Phase 1c — analyst review for potential matches. Requires `review` capability (Analyst or MLRO persona).
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-4 items-center flex-wrap p-5 border border-[#26285C] rounded-2xl mb-4" style={{ background: "linear-gradient(135deg,#0c1233 0%,#181c48 100%)" }}>
        <div className="min-w-0">
          <div className="font-display text-[17px] font-bold text-white leading-tight">Vital4 disposition queue</div>
          <div className="text-[#A7ACDB] text-[11.5px] mt-1">
            Sole screening authority · {queue.length} open
            {breached > 0 && <span className="text-[#FF5C77] ml-1">· {breached} SLA breached</span>}
          </div>
        </div>
        <div className="ml-auto flex gap-5 text-right shrink-0">
          <div>
            <div className="text-[10px] text-[#6E72A6] uppercase tracking-[0.08em] font-medium">Potential</div>
            <div className="font-display text-[22px] font-bold text-white leading-none mt-0.5">{stats.potential}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#6E72A6] uppercase tracking-[0.08em] font-medium">Pending</div>
            <div className="font-display text-[22px] font-bold text-white leading-none mt-0.5">{stats.pending}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#6E72A6] uppercase tracking-[0.08em] font-medium">True match</div>
            <div className="font-display text-[22px] font-bold text-[#FF5C77] leading-none mt-0.5">{stats.trueMatch}</div>
          </div>
        </div>
      </div>

      <AgentBanner agent="sayed" title="Analyst disposition — Vital4 authority">
        Review potential matches within {SCREENING_SLA.potentialMatchHours}h SLA. Disposition triggers onboarding re-score when linked.
      </AgentBanner>

      {msg && <Card className="p-3 mb-4 text-[12px] mt-4">{msg}</Card>}

      <div className="grid grid-cols-[1.2fr_1fr] gap-4 mt-4 max-lg:grid-cols-1">
        <Card>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
            <h3 className="m-0 text-sm font-display">Open cases</h3>
            <AgentAiTag agent="sayed">Vital4</AgentAiTag>
            <button type="button" className="btn btn-ghost text-[11px] ml-auto px-2 py-1" onClick={() => void refresh()}>Refresh</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-faint text-[10px] uppercase tracking-wide">
                  <th className="text-left font-semibold p-3">Customer</th>
                  <th className="text-left font-semibold p-3">Status</th>
                  <th className="text-left font-semibold p-3">Sanctions</th>
                  <th className="text-left font-semibold p-3">PEP</th>
                  <th className="text-left font-semibold p-3">SLA</th>
                </tr>
              </thead>
              <tbody>
                {queue.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-muted">No cases awaiting disposition.</td></tr>
                ) : queue.map((c) => {
                  const sla = slaRemaining(c.slaDueAt);
                  const active = selected?.id === c.id;
                  return (
                    <tr
                      key={c.id}
                      className={`border-t border-lineSoft cursor-pointer transition ${active ? "bg-ai/10" : "hover:bg-panel2"}`}
                      onClick={() => selectCase(c)}
                    >
                      <td className="p-3">
                        <div className="font-semibold">{c.customerName}</div>
                        <div className="mono text-[10px] text-muted">{c.customerId}</div>
                      </td>
                      <td className="p-3">
                        <span className={`pill text-[10px] ${STATUS_PILL[c.status] ?? "bg-panel2 text-muted"}`}>{c.status}</span>
                      </td>
                      <td className="p-3">{c.sanctions ?? "—"}</td>
                      <td className="p-3">{c.pep ?? "—"}</td>
                      <td className={`p-3 font-semibold ${sla.breached ? "text-hi" : sla.urgent ? "text-med" : "text-muted"}`}>
                        {sla.label}
                        {isSlaBreached(c) && " ⚠"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div>
          {selected ? (
            <Card className="p-4">
              <div className="text-[11px] text-faint uppercase tracking-wide mb-1">Case detail</div>
              <div className="font-display text-base font-semibold">{selected.customerName}</div>
              <div className="mono text-[11px] text-muted mt-0.5 mb-3">{selected.vendorCaseId} · {selected.licenseRegion}</div>

              <div className="grid grid-cols-2 gap-2 text-[12px] mb-4">
                <Field label="Sanctions" value={selected.sanctions} />
                <Field label="PEP" value={selected.pep} />
                <Field label="Adverse" value={selected.adverse} />
                <Field label="Watchlist" value={selected.watchlist} />
                <Field label="Status" value={selected.status} />
                <Field label="Disposition" value={selected.disposition} />
              </div>

              {selected.disposition === "pending" ? (
                <>
                  <label className="field-label">Analyst notes</label>
                  <textarea
                    className="input w-full min-h-[72px] mb-3 text-[12px]"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Rationale for disposition (recommended for false positive / true match)"
                  />
                  <div className="flex flex-col gap-2">
                    <button type="button" className="btn text-[12px]" disabled={busy} onClick={() => void dispose("false_positive")}>
                      Mark false positive
                    </button>
                    <button type="button" className="btn btn-ghost text-[12px]" disabled={busy} onClick={() => void dispose("clear")}>
                      Clear — no match
                    </button>
                    <button
                      type="button"
                      className="btn text-[12px]"
                      style={{ background: "rgba(255,92,119,.16)", border: "1px solid rgba(255,92,119,.4)", color: "#ff8ea7" }}
                      disabled={busy}
                      onClick={() => void dispose("true_match")}
                    >
                      Confirm true match
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-[12px] text-muted">
                  Disposed as <b className="text-ink">{selected.disposition}</b>
                  {selected.disposedBy && <> by {selected.disposedBy}</>}
                  {selected.dispositionNotes && <div className="mt-2 p-2 bg-panel2 rounded">{selected.dispositionNotes}</div>}
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-4 text-[13px] text-muted">Select a case from the queue to review and disposition.</Card>
          )}

          <Card className="p-4 mt-4 text-[11px] text-muted">
            <b className="text-ink">Authority:</b> Vital4 sole writer for sanctions, PEP, adverse, watchlist.
            Shufti AML ignored. Oscilar txn hits mirror to Vital4 (Phase 2).
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, c }: { label: string; value: string; c?: string }) {
  return (
    <div>
      <div className="text-[10px] text-faint uppercase tracking-[0.08em]">{label}</div>
      <div className="font-display text-xl font-bold" style={{ color: c }}>{value}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="p-2 bg-panel2 rounded border border-lineSoft">
      <div className="text-[10px] text-faint uppercase">{label}</div>
      <div className="font-semibold mt-0.5">{value ?? "—"}</div>
    </div>
  );
}
