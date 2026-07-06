import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, RatingPill } from "../components/ui";
import AgentBanner from "../components/agents/AgentBanner";
import AgentAiTag from "../components/agents/AgentAiTag";
import {
  apiAdvanceCase,
  apiDisposeCase,
  apiGetCase,
  apiListCases,
  isApiAvailable,
  type InvestigationCaseRecord,
} from "../lib/api";
import TmReadinessPanel from "../components/tm/TmReadinessPanel";

const STEPS = [
  ["01", "Evidence Collection", "Gathering data"],
  ["02", "Contextualization", "Background"],
  ["03", "Behaviour Interpretation", "Patterns"],
  ["04", "Explanation Generation", "Reasons"],
  ["05", "Narrative Construction", "Story"],
  ["06", "Reasoning Trace", "Logic"],
];

const DEMO_CASE: InvestigationCaseRecord = {
  id: "demo",
  caseNumber: "CLC2024082300000366",
  title: "Round-amount layering",
  customerId: "ACT00005",
  customerName: "Omar Khalid",
  status: "investigating",
  priority: "high",
  severity: "high",
  source: "tm_alert",
  tmAlertId: null,
  screeningCaseId: null,
  onboardingCaseId: null,
  assignedTo: "Sara Al-Mansoori",
  typologyId: null,
  ruleId: "OS-TM-003",
  ruleName: "Round-amount layering",
  craRating: "High",
  slaDueAt: new Date(Date.now() + 26 * 3600_000).toISOString(),
  disposition: null,
  dispositionNotes: null,
  disposedBy: null,
  disposedAt: null,
  pipelineStep: 2,
  summary: "Illustrative demo case — Mohsen prepared 6-step pipeline with linked evidence.",
  metadata: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  evidence: [
    { id: "ev1", caseId: "demo", kind: "tm_alert", label: "Source TM alert", detail: "Round-amount layering", payload: null, createdBy: "system", createdAt: new Date().toISOString() },
  ],
};

const DEMO_STEP_TEXT = [
  "Mohsen pulled 31 counterparties, 90d transactions, CDD file, screening, prior cases — linked to source.",
  "HNW investor, JLT Dubai. Declared salary AED 28k/mo. Corridors UAE/DE/DK. CRA High.",
  "Round inbound (50k/100k/200k) → out within minutes → near zero. 88% pass-through <24h. 22× monthly salary.",
  "No invoices/economic rationale; inconsistent with SoF/SoW; compliance rejections both legs; address = serviced office.",
  "Drafted disposition narrative; handed to Jana for the STR text.",
  "Every conclusion linked to evidence + CRAM C-101/C-104. Immutable trail complete.",
];

function slaRemaining(iso: string | null): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Breached";
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  return `${h}h ${m}m`;
}

function severityClass(s: string): string {
  if (s === "critical") return "text-hi";
  if (s === "high") return "text-med";
  return "text-muted";
}

export default function InvestigationHub() {
  const nav = useNavigate();
  const [cases, setCases] = useState<InvestigationCaseRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<InvestigationCaseRecord | null>(null);
  const [cur, setCur] = useState(0);
  const [toast, setToast] = useState("");
  const [online, setOnline] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const isDemo = selected?.id === "demo";

  const fire = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };

  const refreshQueue = useCallback(async () => {
    setLoading(true);
    try {
      const { cases: list } = await apiListCases();
      setOnline(true);
      setCases(list);
      setSelectedId((prev) => {
        if (prev && prev !== "demo" && list.some((c) => c.id === prev)) return prev;
        return list.length ? list[0].id : "demo";
      });
      if (!list.length) setSelected(DEMO_CASE);
    } catch {
      setOnline(await isApiAvailable());
      setCases([]);
      setSelectedId("demo");
      setSelected(DEMO_CASE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refreshQueue(); }, [refreshQueue]);

  useEffect(() => {
    if (!selectedId || selectedId === "demo") {
      if (selectedId === "demo") setSelected(DEMO_CASE);
      return;
    }
    let cancelled = false;
    apiGetCase(selectedId)
      .then((c) => { if (!cancelled) { setSelected(c); setCur(c.pipelineStep); } })
      .catch(() => { if (!cancelled) setSelected(null); });
    return () => { cancelled = true; };
  }, [selectedId]);

  const active = selected ?? DEMO_CASE;

  const stepDetail = useMemo(() => {
    if (isDemo) return DEMO_STEP_TEXT[cur] ?? active.summary ?? "";
    if (cur === 0 && active.evidence?.length) {
      return active.evidence.map((e) => `${e.label}: ${e.detail ?? e.kind}`).join(" · ");
    }
    return active.summary ?? `Pipeline step ${cur + 1} — review evidence and advance when ready.`;
  }, [active, cur, isDemo]);

  async function handleAdvance(step: number) {
    setCur(step);
    if (isDemo || !selectedId) return;
    setBusy(true);
    try {
      const updated = await apiAdvanceCase(selectedId, step);
      setSelected(updated);
      fire(`Pipeline step ${step + 1} saved.`);
    } catch (e) {
      fire((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDisposition(disposition: "sar_recommended" | "closed_fp" | "no_action") {
    if (isDemo) {
      const msgs = {
        sar_recommended: "Escalated — Jana will draft the SAR/STR for the UAE FIU (goAML). MLRO approves & files.",
        closed_fp: "Closed as non-risk — rationale logged immutably with your sign-off.",
        no_action: "Requested more info — routed back to Mohsen with your note.",
      };
      fire(msgs[disposition]);
      return;
    }
    if (!selectedId) return;
    setBusy(true);
    try {
      const result = await apiDisposeCase(selectedId, disposition);
      setSelected(result.case);
      await refreshQueue();
      if (result.filingDraft) {
        fire(`Jana created ${result.filingDraft.filingType.replace("_", " ")} draft — opening Reporting Centre…`);
        setTimeout(() => nav(`/reporting?draft=${result.filingDraft!.id}`), 1200);
      } else {
        fire(`Case ${result.case.caseNumber} — ${disposition.replace("_", " ")}`);
      }
    } catch (e) {
      fire((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {isDemo && (
        <Card className="p-3 mb-4 border-med/30 bg-med/5">
          <div className="text-[12px] text-muted">
            <b className="text-med">Illustrative demo case</b> — no live investigation cases yet.
            High/critical TM alerts auto-open cases when the server receives Oscilar webhooks.
          </div>
        </Card>
      )}

      <div className="grid grid-cols-[280px_1fr] gap-4 max-lg:grid-cols-1">
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex items-center gap-2">
            <h3 className="m-0 text-sm font-display">Case queue</h3>
            <span className="text-faint text-[11px] ml-auto">{cases.length || (isDemo ? 1 : 0)}</span>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {loading && <div className="p-4 text-muted text-[12px]">Loading…</div>}
            {!loading && cases.length === 0 && isDemo && (
              <button
                type="button"
                onClick={() => setSelectedId("demo")}
                className="w-full text-left px-4 py-3 border-b border-lineSoft bg-ai/10 hover:bg-ai/15 transition"
              >
                <div className="text-[12px] font-semibold">{DEMO_CASE.title}</div>
                <div className="mono text-[10px] text-faint mt-0.5">{DEMO_CASE.caseNumber}</div>
                <div className="text-[10px] text-med mt-1">Demo · illustrative</div>
              </button>
            )}
            {cases.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left px-4 py-3 border-b border-lineSoft transition ${selectedId === c.id ? "bg-ai/15" : "hover:bg-panel2"}`}
              >
                <div className="text-[12px] font-semibold truncate">{c.title}</div>
                <div className="mono text-[10px] text-faint mt-0.5">{c.caseNumber}</div>
                <div className="flex gap-2 mt-1 text-[10px]">
                  <span className={severityClass(c.severity)}>{c.severity}</span>
                  <span className="text-faint">· {c.status}</span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <div>
          <div className="flex gap-4 items-center flex-wrap p-5 border border-[#26285C] rounded-2xl mb-4" style={{ background: "linear-gradient(135deg,#0c1233 0%,#181c48 100%)" }}>
            <div className="min-w-0">
              <div className="font-display text-[17px] font-bold text-white leading-tight">{active.title}</div>
              <div className="text-[#A7ACDB] text-[11.5px] mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                <span className="mono">{active.caseNumber}</span>
                <span>·</span>
                <span>{active.customerName}</span>
                <span>·</span>
                <span className="mono">{active.customerId}</span>
                {active.craRating && <><span>·</span><span>CRA</span><RatingPill rating={active.craRating as "High" | "Medium" | "Low"} /></>}
                {active.ruleId && <><span>·</span><span className="mono">{active.ruleId}</span></>}
              </div>
            </div>
            <div className="ml-auto text-right shrink-0">
              <div className="text-[10px] text-[#6E72A6] uppercase tracking-[0.08em] font-medium">SLA remaining</div>
              <div className={`font-display text-[22px] font-bold leading-none mt-0.5 ${active.slaDueAt && new Date(active.slaDueAt) < new Date() ? "text-[#FF5C77]" : "text-[#F6A623]"}`}>
                {slaRemaining(active.slaDueAt)}
              </div>
            </div>
          </div>

          <AgentBanner agent="mohsen" title="Mohsen prepared this case">
            Review each step in the pipeline, then decide — escalate, request information, or close. Every conclusion links to evidence and CRAM obligations.
          </AgentBanner>

          <Card className="p-3 mt-3 flex flex-wrap gap-3 items-center text-[12px]">
            <AgentAiTag agent="mohsen">TM &amp; screening</AgentAiTag>
            <span className="text-muted">Source: {active.source.replace("_", " ")} · {online ? "Live API" : "Offline"}</span>
            <Link to="/transaction-monitoring" className="text-ai hover:underline ml-auto font-semibold">Transaction monitoring →</Link>
            <Link to="/audit" className="text-ai hover:underline font-semibold">Audit log →</Link>
          </Card>

          <div className="flex items-start my-4 overflow-x-auto gap-0 relative">
            {/* Connecting line */}
            <div className="absolute top-5 left-5 right-5 h-px bg-[#26285C] -z-0" />
            {STEPS.map((s, i) => (
              <div
                key={i}
                role="button"
                tabIndex={0}
                onClick={() => void handleAdvance(i)}
                onKeyDown={(e) => e.key === "Enter" && void handleAdvance(i)}
                className="flex-1 min-w-[90px] cursor-pointer relative z-10 flex flex-col items-center gap-1.5 group"
              >
                <div className={[
                  "w-10 h-10 rounded-full grid place-items-center mx-auto mono text-[13px] border-2 transition-all duration-200",
                  i === cur
                    ? "bg-[#A953DF] border-[#A953DF] text-white shadow-[0_0_20px_rgba(169,83,223,.45)]"
                    : i <= active.pipelineStep
                      ? "bg-[#2FD8A6]/10 border-[#2FD8A6] text-[#2FD8A6]"
                      : "bg-[#0A1130] border-[#26285C] text-[#6E72A6] group-hover:border-[#A953DF]/40",
                ].join(" ")}>
                  {s[0]}
                </div>
                <div className={`text-center text-[10.5px] font-semibold font-display leading-tight ${i === cur ? "text-white" : i <= active.pipelineStep ? "text-[#2FD8A6]" : "text-[#A7ACDB]"}`}>
                  {s[1]}
                </div>
                <div className="text-center text-[9.5px] text-[#6E72A6] px-1">{s[2]}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[1.4fr_1fr] gap-4 mb-4 max-md:grid-cols-1">
            <div>
              <div className="border border-line rounded-xl p-4 bg-panel min-h-[90px]">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="mono text-mohsen">{STEPS[cur][0]}</span>
                  <b className="font-display text-sm">{STEPS[cur][1]}</b>
                  <span className="pill bg-low/15 text-low ml-auto">{active.status}</span>
                </div>
                <div className="text-[12.5px] leading-relaxed" style={{ color: "#d7ddf0" }}>{stepDetail}</div>
              </div>

              {active.evidence && active.evidence.length > 0 && (
                <Card className="mt-4">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
                    <h3 className="m-0 text-sm font-display">Evidence ({active.evidence.length})</h3>
                  </div>
                  <div className="p-4 space-y-2">
                    {active.evidence.map((ev) => (
                      <div key={ev.id} className="text-[12px] py-2 border-b border-lineSoft last:border-0">
                        <span className="pill bg-ai/10 text-ai text-[10px] mr-2">{ev.kind}</span>
                        <b>{ev.label}</b>
                        {ev.detail && <span className="text-muted ml-2">{ev.detail}</span>}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            <Card className="p-4">
              <div className="text-[11.5px] text-muted mb-2">Case metadata</div>
              <Stat k="Severity" v={active.severity} c={active.severity === "critical" ? "#FF5C77" : undefined} />
              <Stat k="Priority" v={active.priority} />
              <Stat k="Assigned" v={active.assignedTo ?? "Unassigned"} />
              <Stat k="Created" v={new Date(active.createdAt).toLocaleDateString()} />
              {active.disposition && <Stat k="Disposition" v={active.disposition} c="#b9aeff" />}
            </Card>
          </div>

          <div className="flex gap-2.5 flex-wrap">
            <button
              type="button"
              className="btn"
              style={{ background: "rgba(255,92,119,.16)", border: "1px solid rgba(255,92,119,.4)", color: "#ff8ea7" }}
              disabled={busy}
              onClick={() => void handleDisposition("sar_recommended")}
            >
              ⚑ Escalate to Jana (SAR/STR)
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void handleDisposition("closed_fp")}>
              Close as non-risk
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void handleDisposition("no_action")}>
              Request more info
            </button>
            <span className="ml-auto self-center text-faint text-[11px]">Mohsen prepares · MLRO decides · immutable audit</span>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-panel3 border border-ai text-white px-4 py-3 rounded-xl text-[13px] shadow-2xl max-w-lg z-50">
          {toast}
        </div>
      )}

      <Card className="mt-8 p-4">
        <TmReadinessPanel compact defaultTab="investigation" />
      </Card>
    </div>
  );
}

function Stat({ k, v, c }: { k: string; v: string; c?: string }) {
  return (
    <div className="flex justify-between text-[11px] text-muted mt-1.5">
      <span>{k}</span>
      <b style={{ color: c }}>{v}</b>
    </div>
  );
}
