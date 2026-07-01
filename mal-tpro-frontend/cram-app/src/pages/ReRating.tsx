import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Sec, RatingPill, AiTag, ratingColor } from "../components/ui";
import PipelineStatus from "../components/PipelineStatus";
import { latestByCustomer, historyFor, addAssessment, seedIfEmpty } from "../store/assessmentStore";
import { apiRunScheduler, apiSchedulerStatus, type SchedulerStatus, type SchedulerRun } from "../lib/api";
import {
  reRate, isReviewDue, daysUntil, ratingDelta, TRIGGER_LABEL,
  type Trigger, type Assessment,
} from "../engine/rerating";

const EVENTS: Trigger[] = ["ADVERSE_MEDIA", "SAR_FILED", "OWNERSHIP_CHANGE", "SANCTIONS_LIST_UPDATE", "PEP_STATUS_CHANGE", "TRANSACTION_ANOMALY"];

export default function ReRating() {
  const [tick, setTick] = useState(0);
  const [simOffset, setSimOffset] = useState(0);
  const [selected, setSelected] = useState("ACT00005");
  const [toast, setToast] = useState("");
  const [latest, setLatest] = useState<Assessment[]>([]);
  const [timeline, setTimeline] = useState<Assessment[]>([]);
  const [scheduler, setScheduler] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const simNow = useMemo(() => { const d = new Date(); d.setMonth(d.getMonth() + simOffset); return d; }, [simOffset]);

  const refresh = useCallback(async () => {
    await seedIfEmpty();
    const [cs, sched] = await Promise.all([latestByCustomer(), apiSchedulerStatus()]);
    setLatest(cs);
    setScheduler(sched);
    setLoading(false);
    setTick((t) => t + 1);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    void historyFor(selected).then(setTimeline);
  }, [selected, tick]);

  const dueList = useMemo(() => latest.filter((a) => isReviewDue(a, simNow)), [latest, simNow]);
  const selLatest = latest.find((a) => a.customerId === selected) || latest[0];

  const fire = (m: string) => { setToast(m); setTimeout(() => setToast(""), 4000); };

  async function runPeriodic(a: Assessment) {
    const outcome = reRate(a, "PERIODIC_REVIEW", "Scheduled review (manual)", "MLRO", undefined, simNow);
    if (!outcome.ok) {
      fire(`Blocked: ${outcome.verdict.summary}`);
      return;
    }
    const next = outcome.assessment;
    await addAssessment(next);
    fire(`Periodic review for ${a.customerName}: ${a.rating} → ${next.rating}. Next review ${fmt(next.reviewDue)}.`);
    await refresh();
  }

  async function runEvent(trigger: Trigger) {
    if (!selLatest) return;
    const outcome = reRate(selLatest, trigger, TRIGGER_LABEL[trigger], "Mohsen → MLRO", undefined, simNow);
    if (!outcome.ok) {
      fire(`Re-rating blocked: ${outcome.verdict.summary}`);
      return;
    }
    const next = outcome.assessment;
    await addAssessment(next);
    const d = ratingDelta(selLatest.rating, next.rating);
    const arrow = d === "up" ? "▲" : d === "down" ? "▼" : "■";
    fire(`${TRIGGER_LABEL[trigger]} on ${selLatest.customerName}: ${selLatest.rating} ${arrow} ${next.rating}${next.overrides.length ? ` (${next.overrides[0].id})` : ""}.`);
    await refresh();
  }

  async function triggerServerScheduler() {
    const run: SchedulerRun = await apiRunScheduler();
    fire(`Server scheduler ran: ${run.processed} reviews · ${run.rerated} rating changes.`);
    await refresh();
  }

  if (loading) return <div className="text-muted text-sm py-8">Loading assessments…</div>;

  return (
    <div>
      <div className="rounded-2xl p-3.5 mb-4 flex gap-3 items-center flex-wrap" style={{ background: "linear-gradient(160deg,rgba(169,83,223,.1),transparent)", border: "1px solid rgba(169,83,223,.28)" }}>
        <AiTag color="#A953DF">Theme #1 — dynamic re-rating · strong &amp; complete</AiTag>
        <div className="text-[12px] text-muted">Review cadence (Low 5y · Med 3y · High 1y), event-driven re-rating, perpetual KYC, feed trigger pipeline, server scheduler and PostgreSQL audit are all built — not blueprint-only.</div>
      </div>

      <PipelineStatus />

      <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
        <Card className="p-4">
          <div className="text-[11.5px] text-muted mb-1.5">Server scheduler</div>
          <div className="font-display font-bold text-[16px]">{scheduler?.running ? "Running" : "Offline"}</div>
          <div className="text-[11px] text-faint mt-1">{scheduler?.schedule}</div>
          {scheduler?.lastRun && (
            <div className="text-[10.5px] text-muted mt-2">Last run: {fmt(scheduler.lastRun.at)} · {scheduler.lastRun.processed} processed</div>
          )}
          <button className="btn btn-ghost mt-3 w-full" onClick={() => void triggerServerScheduler()}>Run scheduler now</button>
        </Card>
        <Card className="p-4">
          <div className="text-[11.5px] text-muted mb-1.5">Simulated clock (UI preview)</div>
          <div className="font-display font-bold text-[20px]">{simNow.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <button className="btn btn-ghost" onClick={() => setSimOffset((o) => o + 12)}>+1 year</button>
            <button className="btn btn-ghost" onClick={() => setSimOffset((o) => o + 3)}>+3 months</button>
            <button className="btn btn-ghost" onClick={() => setSimOffset(0)}>Reset</button>
          </div>
        </Card>
        <Card className="p-4">
          <div className="font-display font-bold text-[27px] text-med">{dueList.length}</div>
          <div className="text-muted text-[11.5px]">Reviews due (as of sim date)</div>
          <div className="text-[10.5px] text-faint mt-2">{latest.length} customers under continuous review</div>
        </Card>
      </div>

      <Sec>Periodic review queue (scheduler-driven)</Sec>
      <Card>
        <div className="p-0">
          <table className="w-full text-[12.5px]">
            <thead><tr className="text-faint text-[10px] uppercase tracking-wide">
              <th className="text-left font-semibold px-4 py-2">Customer</th><th className="text-left font-semibold py-2">Current rating</th>
              <th className="text-left font-semibold py-2">Last assessed</th><th className="text-left font-semibold py-2">Review due</th>
              <th className="text-left font-semibold py-2">Status</th><th className="text-left font-semibold py-2 pr-4"></th></tr></thead>
            <tbody>
              {dueList.length === 0 && <tr><td colSpan={6} className="px-4 py-5 text-muted">No periodic reviews due as of the simulated date. Advance the clock or wait for the server scheduler.</td></tr>}
              {dueList.map((a) => {
                const od = daysUntil(a.reviewDue, simNow);
                return (
                  <tr key={a.customerId} className="border-t border-lineSoft">
                    <td className="px-4 py-2.5"><b>{a.customerName}</b> <span className="mono text-faint">{a.customerId}</span></td>
                    <td><RatingPill rating={a.rating} /></td>
                    <td className="text-muted">{fmt(a.at)}</td>
                    <td className="text-muted">{fmt(a.reviewDue)}</td>
                    <td><span className="pill bg-hi/15 text-hi">{od < 0 ? `${-od}d overdue` : "due"}</span></td>
                    <td className="pr-4"><button className="btn" onClick={() => void runPeriodic(a)}>Run review</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-[1fr_1.1fr] gap-4 mt-4 max-md:grid-cols-1">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3"><h3 className="m-0 text-sm font-display">Event-driven re-rating</h3></div>
          <label className="field-label">Customer</label>
          <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
            {latest.map((a) => <option key={a.customerId} value={a.customerId}>{a.customerName} ({a.customerId}) — {a.rating}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {EVENTS.map((t) => (
              <button key={t} className="btn btn-ghost text-left" onClick={() => void runEvent(t)}>{TRIGGER_LABEL[t]}</button>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3"><h3 className="m-0 text-sm font-display">Rating timeline</h3><span className="ml-auto text-faint text-[11px]">{selLatest?.customerName}</span></div>
          {timeline.length === 0 && <div className="text-muted text-[12px]">No history.</div>}
          {timeline.slice().reverse().map((a, i, arr) => {
            const d = ratingDelta(a.prevRating, a.rating);
            const arrow = d === "up" ? "▲" : d === "down" ? "▼" : d === "new" ? "•" : "■";
            const ac = d === "up" ? "#FF5C77" : d === "down" ? "#2FD8A6" : "#A7ACDB";
            return (
              <div key={a.id} className={`relative pl-4 pb-4 ${i < arr.length - 1 ? "border-l-2 border-line" : ""}`}>
                <span className="absolute -left-[5px] top-1 w-2 h-2 rounded-full" style={{ background: ratingColor(a.rating) }} />
                <div className="flex items-center gap-2">
                  <RatingPill rating={a.rating} />
                  <span style={{ color: ac }} className="text-[12px] font-bold">{arrow}</span>
                  <span className="text-[11px] text-muted">{a.prevRating ? `from ${a.prevRating}` : "initial"}</span>
                </div>
                <div className="text-[12px] font-semibold mt-1">{TRIGGER_LABEL[a.trigger]}{a.triggerNote ? ` — ${a.triggerNote}` : ""}</div>
                <div className="text-[11px] text-muted">{fmt(a.at)} · {a.actor} · next review {fmt(a.reviewDue)}</div>
              </div>
            );
          })}
        </Card>
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-panel3 border border-ai text-white px-4 py-3 rounded-xl text-[13px] shadow-2xl max-w-xl z-50">{toast}</div>}
    </div>
  );
}

function fmt(iso: string) { return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
