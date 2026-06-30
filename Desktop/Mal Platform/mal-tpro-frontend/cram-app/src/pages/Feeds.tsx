import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, Sec, AiTag, RatingPill } from "../components/ui";
import PipelineStatus from "../components/PipelineStatus";
import { seedIfEmpty, latestByCustomer } from "../store/assessmentStore";
import { ingestEvent, allEvents } from "../store/eventStore";
import { createFeedSimulator, makeEvent } from "../pipeline/mockFeeds";
import { SOURCE_LABEL, type FeedKind, type FeedSource, type FeedEvent } from "../pipeline/feeds";
import type { ProcessedEvent } from "../pipeline/triggerEngine";
import type { Assessment } from "../engine/rerating";

const SOURCES: FeedSource[] = ["adverse-media", "sanctions-list", "sar-goaml", "transaction-monitoring", "kyc-crm"];
const MANUAL: { kind: FeedKind; label: string }[] = [
  { kind: "adverse_media", label: "Adverse media hit" },
  { kind: "transaction_alert", label: "Transaction alert" },
  { kind: "sanctions_list", label: "Sanctions list match" },
  { kind: "pep_change", label: "PEP identified" },
  { kind: "ownership_change", label: "Ownership change" },
  { kind: "sar_filed", label: "SAR filed" },
];
const OUT_STYLE: Record<string, string> = {
  "re-rated": "bg-hi/15 text-hi", "no-change": "bg-low/15 text-low",
  "below-threshold": "bg-med/15 text-med", "no-match": "bg-faint/15 text-faint", "duplicate": "bg-faint/15 text-faint",
};

export default function Feeds() {
  const [live, setLive] = useState(false);
  const [tick, setTick] = useState(0);
  const [events, setEvents] = useState<ProcessedEvent[]>([]);
  const [customers, setCustomers] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const customersRef = useRef<Assessment[]>([]);

  const refresh = useCallback(async () => {
    try {
      await seedIfEmpty();
      const [ev, cs] = await Promise.all([allEvents(), latestByCustomer()]);
      setEvents(ev);
      setCustomers(cs);
      customersRef.current = cs;
      setError("");
    } catch {
      setError("API server offline — run npm run dev to start the server + client together.");
    } finally {
      setLoading(false);
      setTick((t) => t + 1);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const dispatch = useCallback(async (e: FeedEvent | null) => {
    if (!e) return;
    await ingestEvent(e);
    await refresh();
  }, [refresh]);

  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  // Live pipeline via FeedAdapter-shaped simulator → server ingest
  useEffect(() => {
    if (!live) return;
    const sim = createFeedSimulator(() => customersRef.current, 3500);
    const unsub = sim.subscribe((e) => { void dispatchRef.current(e); });
    return unsub;
  }, [live]);

  const stats = useMemo(() => ({
    total: events.length,
    rerated: events.filter((e) => e.outcome === "re-rated").length,
    filtered: events.filter((e) => e.outcome === "below-threshold").length,
  }), [events, tick]);

  const lastBySource = (s: FeedSource) => events.find((e) => e.source === s);

  async function emitManual(kind: FeedKind) {
    if (!customers.length) return;
    const c = customers[Math.floor(Math.random() * customers.length)];
    await dispatch(makeEvent(kind, c.customerId, c.customerName));
  }

  if (loading) return <div className="text-muted text-sm py-8">Connecting to trigger pipeline…</div>;

  return (
    <div>
      <div className="rounded-2xl p-3.5 mb-4 flex gap-3 items-center flex-wrap" style={{ background: "linear-gradient(160deg,rgba(169,83,223,.1),transparent)", border: "1px solid rgba(169,83,223,.28)" }}>
        <AiTag color="#A953DF">Trigger pipeline — feeds drive re-rating automatically</AiTag>
        <div className="text-[12px] text-muted">Inbound signals are matched to a customer, checked against thresholds, deduped, and — if warranted — <b>auto re-rate</b> with full audit in the immutable store. Connect a real vendor by implementing one <span className="mono">FeedAdapter</span>.</div>
      </div>

      {error && <div className="mb-4 text-hi text-[12px] border border-hi/30 rounded-xl px-4 py-3 bg-hi/10">{error}</div>}

      <PipelineStatus />

      <div className="grid grid-cols-4 gap-4 max-md:grid-cols-2">
        <Card className="p-4">
          <div className="text-[11.5px] text-muted mb-2">Live pipeline</div>
          <button className={`btn w-full ${live ? "" : "btn-ghost"}`} onClick={() => setLive((v) => !v)}>
            {live ? "● Live — stop" : "Start live feed"}
          </button>
          <div className="text-[10.5px] text-faint mt-2">{live ? "Simulator → POST /api/v1/crr/events every ~3.5s" : "Idle — or fire events manually below"}</div>
        </Card>
        <Card className="p-4"><div className="font-display font-bold text-[27px]">{stats.total}</div><div className="text-muted text-[11.5px]">Events ingested</div></Card>
        <Card className="p-4"><div className="font-display font-bold text-[27px] text-hi">{stats.rerated}</div><div className="text-muted text-[11.5px]">Auto re-rated</div></Card>
        <Card className="p-4"><div className="font-display font-bold text-[27px] text-med">{stats.filtered}</div><div className="text-muted text-[11.5px]">Filtered (below threshold)</div></Card>
      </div>

      <div className="grid grid-cols-[1fr_1.3fr] gap-4 mt-4 max-md:grid-cols-1">
        <div>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3"><h3 className="m-0 text-sm font-display">Connected feeds</h3><span className="ml-auto text-faint text-[11px]">simulated → server</span></div>
            {SOURCES.map((s) => {
              const last = lastBySource(s);
              return (
                <div key={s} className="flex items-center gap-2.5 py-2 border-b border-lineSoft last:border-0">
                  <span className="w-[7px] h-[7px] rounded-full animate-pulse2" style={{ background: live ? "#2FD8A6" : "#6E72A6" }} />
                  <div className="text-[12px]"><b>{SOURCE_LABEL[s]}</b><div className="text-faint text-[10.5px]">{last ? `last event ${fmt(last.at)}` : "no events yet"}</div></div>
                  <span className="ml-auto pill bg-low/15 text-low">{s === "transaction-monitoring" ? "Oscilar webhook" : live ? "streaming" : "ready"}</span>
                </div>
              );
            })}
            <div className="text-[10.5px] text-faint mt-3">Each row maps to a <span className="mono">FeedAdapter</span> — implement <span className="mono">subscribe()</span> against the vendor API to go live.</div>
          </Card>

          <Card className="p-4 mt-4">
            <div className="text-sm font-display mb-2">Fire a signal manually</div>
            <div className="text-[11px] text-muted mb-3">Targets a random customer and POSTs to the server pipeline.</div>
            <div className="grid grid-cols-2 gap-2">
              {MANUAL.map((m) => <button key={m.kind} className="btn btn-ghost text-left" onClick={() => void emitManual(m.kind)}>{m.label}</button>)}
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3"><h3 className="m-0 text-sm font-display">Live signal stream</h3><span className="ml-auto text-faint text-[11px]">{events.length} events · newest first</span></div>
          {events.length === 0 && <div className="text-muted text-[12px] py-6 text-center">No signals yet. Start the live feed or fire one manually.</div>}
          <div className="max-h-[460px] overflow-y-auto pr-1">
            {events.slice(0, 80).map((e) => (
              <div key={e.id} className="py-2.5 border-b border-lineSoft last:border-0">
                <div className="flex items-center gap-2">
                  <span className="pill bg-ai/15 text-[#c9b6f5]">{SOURCE_LABEL[e.source].split(" ")[0]}</span>
                  <b className="text-[12.5px]">{e.customerName}</b>
                  <span className="mono text-faint text-[10.5px]">{e.customerId}</span>
                  <span className={`pill ml-auto ${OUT_STYLE[e.outcome] || ""}`}>{e.outcome}</span>
                </div>
                <div className="text-[12px] text-muted mt-1">{e.headline}</div>
                <div className="flex items-center gap-2 mt-1">
                  {e.prevRating && e.newRating && (
                    <span className="text-[11px] flex items-center gap-1.5"><RatingPill rating={e.prevRating} /> → <RatingPill rating={e.newRating} /></span>
                  )}
                  <span className="text-[10.5px] text-faint ml-auto">{e.detail} · {fmt(e.at)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Sec>Customers under continuous monitoring</Sec>
      <Card className="p-4 text-[12px] text-muted">
        {customers.length} customers wired to the pipeline. Re-rating events append to the <b className="text-ink">immutable audit store</b> and appear on each customer's timeline in <b className="text-ink">Re-rating &amp; Reviews</b>. Auto-escalations raise an MLRO alert.
      </Card>
    </div>
  );
}
function fmt(iso: string) { return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
