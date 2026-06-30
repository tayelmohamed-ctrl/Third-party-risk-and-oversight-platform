import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, RatingPill } from "../components/ui";
import AgentBanner from "../components/agents/AgentBanner";
import AgentAiTag from "../components/agents/AgentAiTag";

const STEPS = [
  ["01", "Evidence Collection", "Gathering data", "Mohsen pulled 31 counterparties, 90d transactions, CDD file, screening, prior cases — linked to source."],
  ["02", "Contextualization", "Background", "HNW investor, JLT Dubai. Declared salary AED 28k/mo. Corridors UAE/DE/DK. CRA High."],
  ["03", "Behaviour Interpretation", "Patterns", "Round inbound (50k/100k/200k) → out within minutes → near zero. 88% pass-through <24h. 22× monthly salary."],
  ["04", "Explanation Generation", "Reasons", "No invoices/economic rationale; inconsistent with SoF/SoW; compliance rejections both legs; address = serviced office."],
  ["05", "Narrative Construction", "Story", "Drafted disposition narrative; handed to Jana for the STR text."],
  ["06", "Reasoning Trace", "Logic", "Every conclusion linked to evidence + CRAM C-101/C-104. Immutable trail complete."],
];

export default function InvestigationHub() {
  const [cur, setCur] = useState(2);
  const [toast, setToast] = useState("");
  const fire = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };
  const spark = [18, 12, 9, 40, 8, 11, 44, 7, 38, 10, 9, 42, 6, 12];
  return (
    <div>
      <div className="flex gap-4 items-center flex-wrap p-4 border border-line rounded-2xl mb-4" style={{ background: "linear-gradient(120deg,#0c1233,#1a1c52)" }}>
        <div>
          <div className="font-display text-lg font-semibold">Round-amount layering</div>
          <div className="text-muted text-[11.5px] mt-0.5"><span className="mono">CLC2024082300000366</span> · Focal actor <b>Omar Khalid</b> · ACT00005 · CRA <RatingPill rating="High" /> · <span className="mono">cram_ref C-101/C-104</span></div>
        </div>
        <div className="ml-auto text-right"><div className="text-[10px] text-faint uppercase tracking-[0.08em]">SLA remaining</div><div className="font-display text-xl font-bold text-med">26h 12m</div></div>
      </div>

      <AgentBanner agent="mohsen" title="Mohsen prepared this case">
        Review each step in the pipeline, then decide — escalate, request information, or close. Every conclusion links to evidence and CRAM obligations.
      </AgentBanner>
      <Card className="p-3 mt-3 flex flex-wrap gap-3 items-center text-[12px]">
        <AgentAiTag agent="mohsen">TM &amp; screening</AgentAiTag>
        <span className="text-muted">Verify Oscilar rules cover this payment type before disposition.</span>
        <Link to="/transaction-monitoring" className="text-ai hover:underline ml-auto font-semibold">
          Transaction monitoring guide →
        </Link>
        <Link to="/screening" className="text-ai hover:underline font-semibold">Vital4 queue →</Link>
      </Card>
      <div className="flex items-stretch my-4 overflow-x-auto">
        {STEPS.map((s, i) => (
          <div key={i} onClick={() => setCur(i)} className="flex-1 min-w-[120px] cursor-pointer relative">
            <div className={`w-[46px] h-[46px] rounded-full grid place-items-center mx-auto mono text-[13px] transition border-2 ${i === cur ? "bg-ai text-white border-ai shadow-[0_0_18px_rgba(124,108,247,.5)]" : i <= 5 ? "border-low text-low bg-low/5" : "border-line text-muted bg-panel"}`}>{s[0]}</div>
            <div className="text-center text-[11px] mt-1.5 font-semibold font-display">{s[1]}</div>
            <div className="text-center text-[10px] text-faint mt-0.5 px-1.5">{s[2]}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-4 mb-4 max-md:grid-cols-1">
        <div>
          <div className="border border-line rounded-xl p-4 bg-panel min-h-[90px]">
            <div className="flex items-center gap-2.5 mb-2"><span className="mono text-mohsen">{STEPS[cur][0]}</span><b className="font-display text-sm">{STEPS[cur][1]}</b><span className="pill bg-low/15 text-low ml-auto">prepared</span></div>
            <div className="text-[12.5px] leading-relaxed" style={{ color: "#d7ddf0" }}>{STEPS[cur][3]}</div>
          </div>
          <Card className="mt-4">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-line"><h3 className="m-0 text-sm font-display">Mohsen — investigation summary</h3><span className="ml-auto text-faint text-[11px]">highlighted → evidence</span></div>
            <div className="p-4 text-[12.5px] leading-relaxed" style={{ color: "#d7ddf0" }}>
              The actor received <Ev t="3 inbound transfers AED 50k/100k/200k from DE & DK entities" fire={fire}>large, perfectly round inbound transfers</Ev>, each <Ev t="outbound within minutes to UAE individuals; balance → near zero" fire={fire}>moved out within minutes</Ev>. Activity is <Ev t="declared salary AED 28k/mo vs AED 637k reviewed — inconsistent with income, SoF & SoW" fire={fire}>inconsistent with the declared salary, source of funds and source of wealth</Ev>, with <Ev t="compliance-check rejections on both legs" fire={fire}>compliance-check rejections</Ev> and an <Ev t="Address verified on Google Maps — serviced office, multiple registered entities" fire={fire}>address that resolves to a serviced office</Ev>. Pattern consistent with layering. <b>Recommended: escalate to SAR.</b>
            </div>
          </Card>
        </div>
        <div>
          <Card className="p-4">
            <div className="text-[11.5px] text-muted mb-2">Transaction pattern — 90 days</div>
            <div className="flex items-end gap-[3px] h-[46px]">{spark.map((h, i) => <i key={i} className="flex-1 rounded-t-sm" style={{ height: `${h * 2}%`, background: "linear-gradient(180deg,#39B9ED,rgba(57,185,237,.2))" }} />)}</div>
            <Stat k="Total reviewed" v="AED 637,671" mono /><Stat k="vs declared salary" v="22× monthly" c="#FF5C77" /><Stat k="Pass-through <24h" v="88%" c="#FF5C77" />
          </Card>
          <Card className="mt-4">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-line"><h3 className="m-0 text-sm font-display">Timeline</h3></div>
            <div className="p-4">
              {[["Alert raised — TM scenario S-12", "23 Jun 13:13"], ["Mohsen prepared case (6 steps)", "23 Jun 13:14 · evidence linked"], ["Investigator review", "Sara Al-Mansoori · in progress"], ["Awaiting MLRO decision", "SAR recommended → Jana on standby"]].map(([t, d], i, arr) => (
                <div key={i} className={`relative pl-3.5 pb-3.5 ${i < arr.length - 1 ? "border-l-2 border-line" : ""}`}>
                  <span className="absolute -left-[5px] top-0.5 w-2 h-2 rounded-full bg-ai" />
                  <div className="text-[12px] font-semibold">{t}</div><div className="text-muted text-[11px]">{d}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="flex gap-2.5 flex-wrap">
        <button className="btn" style={{ background: "rgba(255,92,119,.16)", border: "1px solid rgba(255,92,119,.4)", color: "#ff8ea7" }} onClick={() => fire("Escalated — Jana will draft the SAR/STR for the UAE FIU (goAML). MLRO approves & files.")}>⚑ Escalate to Jana (SAR/STR)</button>
        <button className="btn btn-ghost" onClick={() => fire("Closed as non-risk — rationale logged immutably with your sign-off.")}>Close as non-risk</button>
        <button className="btn btn-ghost" onClick={() => fire("Requested more info — routed back to Mohsen with your note.")}>Request more info</button>
        <span className="ml-auto self-center text-faint text-[11px]">Mohsen prepares · MLRO decides · immutable audit</span>
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-panel3 border border-ai text-white px-4 py-3 rounded-xl text-[13px] shadow-2xl max-w-lg z-50">{toast}</div>}
    </div>
  );
}
function Ev({ t, fire, children }: { t: string; fire: (m: string) => void; children: React.ReactNode }) {
  return <span className="text-[#b9aeff] underline decoration-dotted cursor-pointer hover:bg-ai/15" onClick={() => fire("Evidence: " + t)}>{children}</span>;
}
function Stat({ k, v, c, mono }: { k: string; v: string; c?: string; mono?: boolean }) {
  return <div className="flex justify-between text-[11px] text-muted mt-1.5"><span>{k}</span><b className={mono ? "mono text-ink" : ""} style={{ color: c }}>{v}</b></div>;
}
