import { useMemo, useState, useEffect, useCallback, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card, Sec, AiTag } from "../components/ui";
import { exportGlobalAccountTmWorkbook, exportMalBankTmWorkbook } from "../lib/tmScreeningWorkbookBuilder";
import AgentBanner from "../components/agents/AgentBanner";
import AgentAiTag from "../components/agents/AgentAiTag";
import {
  TXN_SCREENING_PROGRAMME, TXN_SCREENING_SCORING, TXN_SCREENING_WORKFLOW,
  TXN_SCREENING_CASE_MGMT, OSCILAR_RULE_CATEGORIES,
  type OscilarTmRule, type PaymentChannel,
} from "../config/oscilarProgramme";
import ruleLibrary from "../data/oscilar_rule_library.json";
import { SCREENING_AUTHORITY, SCREENING_SLA } from "../config/partnerIntegration";
import { apiTmAlerts, type TmAlertRecord } from "../lib/api";
import TmReadinessPanel from "../components/tm/TmReadinessPanel";
import PaymentPurposeGuidancePanel from "../components/tm/PaymentPurposeGuidancePanel";

type TabId = "programme" | "scoring" | "workflow" | "cases" | "monitoring" | "purpose" | "readiness";

const TABS: { id: TabId; label: string; hint: string }[] = [
  { id: "programme", label: "Screening programme", hint: "Scope · authority · coverage" },
  { id: "scoring", label: "Scoring model", hint: "Alert tiers · dimensions" },
  { id: "workflow", label: "Workflow", hint: "Real-time decision path" },
  { id: "cases", label: "Alerts & cases", hint: "SLA · ownership · outputs" },
  { id: "monitoring", label: "TM rule library", hint: "Oscilar rules · transfers & cards" },
  { id: "purpose", label: "Purpose codes", hint: "Accept · conditional · eliminate · PDF" },
  { id: "readiness", label: "Pre-impl readiness", hint: "BRD gates · alert & screening rules" },
];

const TAB_ACCENT: Record<TabId, string> = {
  programme: "#A953DF",
  scoring:   "#39B9ED",
  workflow:  "#7C6CF7",
  cases:     "#F6A623",
  monitoring:"#2FD8A6",
  purpose:   "#F6A623",
  readiness: "#39B9ED",
};

const TAB_METRIC: Record<TabId, string> = {
  programme: "3 sections",
  scoring:   "4 tiers",
  workflow:  "7 steps",
  cases:     "7 stages",
  monitoring:"40 rules",
  purpose:   "5 flows",
  readiness: "14 gates",
};

const SEV_STYLE: Record<string, string> = {
  critical: "bg-proh/25 text-[#ff7ea0]",
  high: "bg-hi/15 text-hi",
  medium: "bg-med/15 text-med",
  low: "bg-low/15 text-low",
};

const STATUS_STYLE: Record<string, string> = {
  active: "bg-low/15 text-low",
  tuning: "bg-med/15 text-med",
  shadow: "bg-faint/15 text-faint",
};

export default function TransactionMonitoring() {
  const [tab, setTab] = useState<TabId>("programme");
  const [channel, setChannel] = useState<PaymentChannel | "all">("all");
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");

  const rules = ruleLibrary.rules as OscilarTmRule[];

  const filteredRules = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rules.filter((r) => {
      if (channel !== "all" && r.channel !== channel && r.channel !== "both") return false;
      if (category !== "all" && r.category !== category) return false;
      if (!q) return true;
      return [r.id, r.name, r.typology, r.description, r.trigger].join(" ").toLowerCase().includes(q);
    });
  }, [rules, channel, category, query]);

  const stats = useMemo(() => ({
    total: rules.length,
    active: rules.filter((r) => r.status === "active").length,
    transfer: rules.filter((r) => r.channel === "transfer" || r.channel === "both").length,
    card: rules.filter((r) => r.channel === "card" || r.channel === "both").length,
  }), [rules]);

  return (
    <div>
      <AgentBanner agent="mohsen" title="Transaction monitoring & screening — investigator guide">
        Everything investigators need to verify Oscilar covers <b>all Mal app payments</b> — transfers and cards —
        with the right rules deployed. Transaction screening list hits always mirror to Vital4; TM alerts feed CRAM re-rating.
      </AgentBanner>

      {/* Numbered illustration card grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-4 mb-2">
        {TABS.map((t, i) => (
          <TmCard
            key={t.id}
            num={String(i + 1).padStart(2, "0")}
            title={t.label}
            illustration={getTmIllust(t.id)}
            accent={TAB_ACCENT[t.id]}
            metric={TAB_METRIC[t.id]}
            active={tab === t.id}
            onClick={() => setTab(t.id)}
          />
        ))}
      </div>

      {/* Content detail panel */}
      <TmDetailPanel
        tabIdx={TABS.findIndex((t) => t.id === tab) + 1}
        title={TABS.find((t) => t.id === tab)?.label ?? ""}
        hint={TABS.find((t) => t.id === tab)?.hint ?? ""}
        accent={TAB_ACCENT[tab]}
        illustration={getTmIllust(tab)}
      >
        {tab === "programme" && <ProgrammeTab />}
        {tab === "scoring" && <ScoringTab />}
        {tab === "workflow" && <WorkflowTab />}
        {tab === "cases" && <CasesTab />}
        {tab === "monitoring" && (
          <MonitoringTab
            rules={filteredRules}
            stats={stats}
            channel={channel}
            setChannel={setChannel}
            category={category}
            setCategory={setCategory}
            query={query}
            setQuery={setQuery}
          />
        )}
        {tab === "purpose" && <PaymentPurposeGuidancePanel />}
        {tab === "readiness" && <TmReadinessPanel />}
      </TmDetailPanel>

      <Card className="p-4 mt-5 text-[11px] text-muted">
        <div className="flex flex-wrap gap-4 items-center">
          <span><b className="text-ink">Source:</b> {ruleLibrary.source} · v{ruleLibrary.version}</span>
          <span><b className="text-ink">TM vendor:</b> {SCREENING_AUTHORITY.transactionMonitoring}</span>
          <span><b className="text-ink">Screening mirror:</b> {SCREENING_AUTHORITY.oscilarTxnScreeningMirror}</span>
          <Link to="/screening" className="text-ai hover:underline ml-auto">Vital4 disposition queue →</Link>
          <Link to="/investigation" className="text-ai hover:underline">Investigation Hub →</Link>
          <Link to="/feeds" className="text-ai hover:underline">Signal feeds →</Link>
        </div>
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-line">
          <button
            type="button"
            onClick={() => exportGlobalAccountTmWorkbook()}
            className="btn btn-ghost text-[11px] px-3 py-1.5 flex items-center gap-1.5"
            title="Download Global Account TM & Screening Library (US / FinCEN / BSA)"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 1v7M3.5 5.5 6 8l2.5-2.5M2 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Global Account TM Library
          </button>
          <button
            type="button"
            onClick={() => exportMalBankTmWorkbook()}
            className="btn btn-ghost text-[11px] px-3 py-1.5 flex items-center gap-1.5"
            title="Download Mal Bank TM & Screening Library (UAE / CBUAE)"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 1v7M3.5 5.5 6 8l2.5-2.5M2 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Mal Bank TM Library
          </button>
        </div>
      </Card>
    </div>
  );
}

function ProgrammeTab() {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <AiTag color="#A953DF">For investigators</AiTag>
        <p className="text-[13px] text-muted mt-2 mb-0">
          Use this tab in onboarding reviews and periodic audits. Confirm every payment rail in the Mal app
          is wired to Oscilar and that list hits are mirrored — never written directly to CRAM.
        </p>
      </Card>
      {TXN_SCREENING_PROGRAMME.map((sec) => (
        <Card key={sec.id} className="p-4">
          <h3 className="m-0 text-sm font-display">{sec.title}</h3>
          <p className="text-[12px] text-muted mt-1">{sec.summary}</p>
          <ul className="mt-2 space-y-1.5 text-[12px] pl-4 list-disc text-muted">
            {sec.bullets.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </Card>
      ))}
    </div>
  );
}

function ScoringTab() {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <p className="text-[13px] text-muted m-0">{TXN_SCREENING_SCORING.intro}</p>
      </Card>
      <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
        {TXN_SCREENING_SCORING.dimensions.map((d) => (
          <Card key={d.id} className="p-4">
            <h3 className="m-0 text-sm font-display">{d.title}</h3>
            <p className="text-[11px] text-muted mt-1">{d.summary}</p>
            <ul className="mt-2 space-y-1 text-[11px] pl-4 list-disc text-muted">
              {d.bullets.map((b) => <li key={b}>{b}</li>)}
            </ul>
          </Card>
        ))}
      </div>
      <Card>
        <div className="px-4 py-3 border-b border-line">
          <h3 className="m-0 text-sm font-display">Alert score tiers</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-faint text-[10px] uppercase">
                <th className="text-left p-3">Tier</th>
                <th className="text-left p-3">Score</th>
                <th className="text-left p-3">SLA</th>
                <th className="text-left p-3">Action</th>
                <th className="text-left p-3">CRAM link</th>
              </tr>
            </thead>
            <tbody>
              {TXN_SCREENING_SCORING.tiers.map((t) => (
                <tr key={t.tier} className="border-t border-lineSoft">
                  <td className="p-3 font-semibold">{t.tier}</td>
                  <td className="p-3 mono">{t.scoreRange}</td>
                  <td className="p-3">{t.sla}</td>
                  <td className="p-3 text-muted">{t.action}</td>
                  <td className="p-3 mono text-[10px]">{t.cramLink ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function WorkflowTab() {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <AgentAiTag agent="mohsen">End-to-end path</AgentAiTag>
        <p className="text-[12px] text-muted mt-2 mb-0">
          Every transfer and card payment follows this path. Investigators should trace any alert back through these steps
          to confirm Vital4 mirror (step 3) and CRAM feed (step 6) fired correctly.
        </p>
      </Card>
      <div className="space-y-2">
        {TXN_SCREENING_WORKFLOW.map((s) => (
          <Card key={s.step} className="p-4 flex gap-4 items-start">
            <div className="w-10 h-10 rounded-full bg-ai/20 border border-ai grid place-items-center mono text-sm font-bold shrink-0">
              {String(s.step).padStart(2, "0")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="m-0 text-sm font-display">{s.name}</h3>
                <span className="pill bg-panel2 text-muted text-[10px]">{s.actor}</span>
                {s.outcome && <span className="pill bg-low/15 text-low text-[10px]">{s.outcome}</span>}
              </div>
              <p className="text-[12px] text-muted mt-1 mb-0">{s.detail}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CasesTab() {
  const [alerts, setAlerts] = useState<TmAlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await apiTmAlerts();
      setAlerts(res.alerts);
      setError("");
    } catch {
      setError("Live TM alerts unavailable — ensure API server is running.");
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <p className="text-[13px] text-muted m-0">
          Alert and case SLAs for investigators. Potential Vital4 matches: <b>{SCREENING_SLA.potentialMatchHours}h</b>.
          Pending screening: <b>{SCREENING_SLA.pendingHours}h</b> before Compliance escalation.
        </p>
      </Card>

      <Card>
        <div className="px-4 py-3 border-b border-line flex items-center gap-2 flex-wrap">
          <h3 className="m-0 text-sm font-display">Live Oscilar alerts</h3>
          <AgentAiTag agent="mohsen">Phase 2 · webhook → Vital4 mirror + CRAM feed</AgentAiTag>
          <button type="button" className="btn btn-ghost text-[11px] ml-auto px-2 py-1" onClick={() => void refresh()}>
            Refresh
          </button>
        </div>
        <div className="p-4">
          {loading && <div className="text-muted text-[12px]">Loading alerts…</div>}
          {error && <div className="text-hi text-[12px]">{error}</div>}
          {!loading && !error && alerts.length === 0 && (
            <div className="text-muted text-[12px]">
              No alerts yet. Fire one from the Test Bench (Phase 2 simulate) or POST to <span className="mono">/webhooks/oscilar</span>.
            </div>
          )}
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {alerts.slice(0, 50).map((a) => (
              <div key={a.id} className="py-2 border-b border-lineSoft last:border-0">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className={`pill ${SEV_STYLE[a.severity] ?? ""}`}>{a.severity}</span>
                  <b className="text-[12px]">{a.customerName}</b>
                  <span className="mono text-faint text-[10px]">{a.customerId}</span>
                  <span className="pill bg-panel2 text-muted text-[10px] ml-auto">{a.status}</span>
                </div>
                <div className="text-[11px] text-muted mt-1">
                  {a.ruleName ?? a.ruleId ?? a.alertType}
                  {a.amount != null && ` · ${a.amount} ${a.currency ?? ""}`}
                  {a.listHit && " · Vital4 mirror"}
                  {a.feedOutcome && ` · feed:${a.feedOutcome}`}
                </div>
                <div className="flex gap-3 mt-1 text-[10px]">
                  {a.vital4CaseId && (
                    <Link to="/screening" className="text-ai hover:underline">V4 {a.vital4CaseId} →</Link>
                  )}
                  {a.feedEventId && (
                    <Link to="/feeds" className="text-ai hover:underline">Feed event →</Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <div className="px-4 py-3 border-b border-line flex items-center gap-2">
          <h3 className="m-0 text-sm font-display">Lifecycle stages</h3>
          <AgentAiTag agent="mohsen">Mohsen prepares · MLRO decides</AgentAiTag>
        </div>
        <div className="p-4 space-y-3">
          {TXN_SCREENING_CASE_MGMT.map((s, i) => (
            <div key={s.stage} className="relative pl-4 pb-3 border-l-2 border-line last:border-0">
              <span className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-mohsen" />
              <div className="flex flex-wrap gap-2 items-baseline">
                <span className="font-semibold text-[13px]">{s.stage}</span>
                <span className="text-[10px] text-muted">Owner: {s.owner}</span>
                <span className="pill bg-med/15 text-med text-[10px]">SLA: {s.sla}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {s.outputs.map((o) => (
                  <span key={o} className="pill bg-panel2 text-muted text-[10px]">{o}</span>
                ))}
              </div>
              {i === 3 && (
                <Link to="/investigation" className="text-[11px] text-ai hover:underline mt-1 inline-block">
                  Open Investigation Hub example →
                </Link>
              )}
              {i === 5 && (
                <Link to="/screening" className="text-[11px] text-ai hover:underline mt-1 inline-block ml-2">
                  Vital4 disposition queue →
                </Link>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function MonitoringTab({
  rules, stats, channel, setChannel, category, setCategory, query, setQuery,
}: {
  rules: OscilarTmRule[];
  stats: { total: number; active: number; transfer: number; card: number };
  channel: PaymentChannel | "all";
  setChannel: (v: PaymentChannel | "all") => void;
  category: string;
  setCategory: (v: string) => void;
  query: string;
  setQuery: (v: string) => void;
}) {
  return (
    <div>
      <Sec>Oscilar rule library — transfers &amp; card payments</Sec>
      <div className="grid grid-cols-4 gap-3 mb-4 max-md:grid-cols-2">
        <StatCard label="Total rules" value={String(stats.total)} />
        <StatCard label="Active" value={String(stats.active)} c="text-low" />
        <StatCard label="Transfer coverage" value={String(stats.transfer)} />
        <StatCard label="Card coverage" value={String(stats.card)} />
      </div>

      <Card className="p-4 mb-4">
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 max-md:grid-cols-1">
          <input
            className="input"
            placeholder="Search rules by ID, name, typology, trigger…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select className="input" value={channel} onChange={(e) => setChannel(e.target.value as PaymentChannel | "all")}>
            <option value="all">All channels</option>
            <option value="transfer">Transfers only</option>
            <option value="card">Cards only</option>
            <option value="both">Both</option>
          </select>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {OSCILAR_RULE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <p className="text-[11px] text-muted mt-2 mb-0">
          Showing {rules.length} of {stats.total} rules · aligned to Oscilar Compliance Redline + Mal Policy §12.6
        </p>
      </Card>

      <div className="space-y-3">
        {rules.length === 0 ? (
          <Card className="p-4 text-muted text-[13px]">No rules match your filters.</Card>
        ) : rules.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex flex-wrap gap-2 items-start justify-between mb-2">
              <div>
                <span className="mono text-[10px] text-faint">{r.id}</span>
                <span className="mx-2 text-faint">·</span>
                <span className="mono text-[10px] text-muted">{r.workflowStep}</span>
                <h3 className="m-0 mt-1 text-sm font-display">{r.name}</h3>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <span className={`pill text-[10px] ${SEV_STYLE[r.severity]}`}>{r.severity}</span>
                <span className={`pill text-[10px] ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                <span className="pill bg-panel2 text-muted text-[10px]">{r.channel}</span>
              </div>
            </div>
            <p className="text-[12px] text-muted m-0">{r.description}</p>
            <div className="grid grid-cols-2 gap-3 mt-3 max-md:grid-cols-1 text-[11px]">
              <div className="p-2 bg-panel2 rounded border border-lineSoft">
                <div className="text-faint uppercase text-[10px]">Trigger</div>
                <div className="mt-0.5">{r.trigger}</div>
              </div>
              <div className="p-2 bg-panel2 rounded border border-lineSoft">
                <div className="text-faint uppercase text-[10px]">Thresholds</div>
                <div className="mt-0.5">{r.thresholds}</div>
              </div>
              <div className="p-2 bg-panel2 rounded border border-lineSoft">
                <div className="text-faint uppercase text-[10px]">Action</div>
                <div className="mt-0.5">{r.action}</div>
              </div>
              <div className="p-2 bg-panel2 rounded border border-lineSoft">
                <div className="text-faint uppercase text-[10px]">CRAM / policy</div>
                <div className="mt-0.5">
                  {[r.cramRef, r.overrideId, r.policyRef].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-faint">{r.category} · {r.typology}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, c }: { label: string; value: string; c?: string }) {
  return (
    <Card className="p-3">
      <div className={`font-display text-xl font-bold ${c ?? ""}`}>{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </Card>
  );
}

// ─── Numbered illustration card ───────────────────────────────────────────────

function TmCard({
  num, title, illustration, accent, metric, active, onClick,
}: {
  num: string;
  title: string;
  illustration: ReactNode;
  accent: string;
  metric: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative flex flex-col text-left rounded-2xl border overflow-hidden cursor-pointer",
        "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A953DF]",
        active
          ? "border-[#A953DF]/55 shadow-[0_0_36px_rgba(169,83,223,.15)] scale-[1.015]"
          : "border-[#26285C] hover:border-[#A953DF]/30 hover:scale-[1.01]",
      ].join(" ")}
      style={{ background: active ? "#100f28" : "#0A1130", minHeight: "190px" }}
    >
      {/* Top accent line when active */}
      {active && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{ background: `linear-gradient(90deg,transparent,${accent} 50%,transparent)` }}
        />
      )}
      {/* Number */}
      <span
        className="absolute top-3 left-3 font-display text-[11px] font-black tabular-nums leading-none"
        style={{ color: active ? accent : "#A7ACDB", opacity: active ? 1 : 0.45 }}
      >
        {num}
      </span>
      {/* Illustration */}
      <div className="flex-1 flex items-center justify-center pt-8 pb-1">
        <div
          className="transition-transform duration-200"
          style={{ transform: active ? "scale(1.07)" : undefined }}
        >
          {illustration}
        </div>
      </div>
      {/* Title + metric */}
      <div className="px-3 pb-3 pt-0.5">
        <div
          className="text-[10.5px] font-bold font-display leading-tight"
          style={{ color: active ? "white" : "#C4C8F0" }}
        >
          {title}
        </div>
        <div className="text-[9px] mt-0.5 font-semibold" style={{ color: accent, opacity: 0.75 }}>
          {metric}
        </div>
      </div>
    </button>
  );
}

// ─── Content detail panel ─────────────────────────────────────────────────────

function TmDetailPanel({
  tabIdx, title, hint, accent, illustration, children,
}: {
  tabIdx: number;
  title: string;
  hint: string;
  accent: string;
  illustration: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#26285C] overflow-hidden mt-2">
      {/* Header bar */}
      <div
        className="flex items-center gap-3 px-5 py-4 border-b border-[#1e2156]"
        style={{ background: "linear-gradient(135deg,#0c1233 0%,#181c48 100%)" }}
      >
        {/* Ghost number */}
        <span
          aria-hidden
          className="font-display text-[48px] font-black leading-none select-none shrink-0 -mr-1"
          style={{ color: accent, opacity: 0.12 }}
        >
          {String(tabIdx).padStart(2, "0")}
        </span>
        {/* Small illustration */}
        <div
          className="shrink-0 opacity-75"
          style={{ transform: "scale(0.7)", transformOrigin: "center center", marginLeft: "-8px", marginRight: "-8px" }}
        >
          {illustration}
        </div>
        {/* Title / hint */}
        <div className="min-w-0">
          <div className="font-display text-[15px] font-bold text-white leading-tight">{title}</div>
          <div className="text-[11px] text-[#A7ACDB] mt-0.5">{hint}</div>
        </div>
        {/* Accent dot */}
        <div
          className="ml-auto w-2 h-2 rounded-full shrink-0 shadow-[0_0_8px_currentColor]"
          style={{ background: accent, color: accent }}
        />
      </div>
      {/* Content */}
      <div className="p-4 pt-5">
        {children}
      </div>
    </div>
  );
}

// ─── Illustration dispatcher ──────────────────────────────────────────────────

function getTmIllust(id: TabId): JSX.Element {
  switch (id) {
    case "programme":  return <IllustScreening />;
    case "scoring":    return <IllustScoring />;
    case "workflow":   return <IllustWorkflow />;
    case "cases":      return <IllustCases />;
    case "monitoring": return <IllustRules />;
    case "purpose":    return <IllustPurpose />;
    case "readiness":  return <IllustReadiness />;
  }
}

// ─── SVG Illustrations ────────────────────────────────────────────────────────

function IllustScreening() {
  return (
    <svg viewBox="0 0 80 80" width={68} height={68} fill="none">
      {/* Outer glass circle */}
      <circle cx="34" cy="34" r="23" fill="#A953DF" fillOpacity="0.10" stroke="#A953DF" strokeWidth="2.5"/>
      {/* Inner glow ring */}
      <circle cx="34" cy="34" r="15" fill="#A953DF" fillOpacity="0.07"/>
      {/* Person head */}
      <circle cx="34" cy="28" r="7" fill="#A953DF" fillOpacity="0.85"/>
      {/* Person body */}
      <path d="M22 46 Q34 53 46 46" fill="#A953DF" fillOpacity="0.60"/>
      {/* Handle */}
      <line x1="52" y1="52" x2="65" y2="65" stroke="#7C6CF7" strokeWidth="5" strokeLinecap="round"/>
      {/* Handle cap */}
      <circle cx="65" cy="65" r="3" fill="#7C6CF7" fillOpacity="0.6"/>
    </svg>
  );
}

function IllustScoring() {
  return (
    <svg viewBox="0 0 80 80" width={68} height={68} fill="none">
      {/* Grid lines */}
      <line x1="12" y1="22" x2="66" y2="22" stroke="#39B9ED" strokeOpacity="0.12" strokeWidth="1"/>
      <line x1="12" y1="37" x2="66" y2="37" stroke="#39B9ED" strokeOpacity="0.12" strokeWidth="1"/>
      <line x1="12" y1="52" x2="66" y2="52" stroke="#39B9ED" strokeOpacity="0.12" strokeWidth="1"/>
      {/* Axes */}
      <line x1="12" y1="14" x2="12" y2="64" stroke="#39B9ED" strokeOpacity="0.35" strokeWidth="1.5"/>
      <line x1="12" y1="64" x2="68" y2="64" stroke="#39B9ED" strokeOpacity="0.35" strokeWidth="1.5"/>
      {/* Area fill */}
      <path d="M18,56 30,44 42,48 54,30 66,18 L66,64 L18,64 Z" fill="#39B9ED" fillOpacity="0.07"/>
      {/* Trend line */}
      <polyline points="18,56 30,44 42,48 54,30 66,18" fill="none" stroke="#39B9ED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Data points */}
      <circle cx="30" cy="44" r="2.5" fill="#39B9ED"/>
      <circle cx="54" cy="30" r="2.5" fill="#39B9ED"/>
      <circle cx="66" cy="18" r="3" fill="#39B9ED" fillOpacity="0.8"/>
      {/* Score badge */}
      <rect x="51" y="7" width="22" height="14" rx="7" fill="#39B9ED" fillOpacity="0.85"/>
      <text x="62" y="18" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">85</text>
    </svg>
  );
}

function IllustWorkflow() {
  return (
    <svg viewBox="0 0 80 80" width={68} height={68} fill="none">
      {/* Start capsule */}
      <rect x="26" y="7" width="28" height="14" rx="7" fill="#7C6CF7" fillOpacity="0.80"/>
      {/* Arrow to diamond */}
      <line x1="40" y1="21" x2="40" y2="28" stroke="#7C6CF7" strokeOpacity="0.6" strokeWidth="1.5"/>
      <path d="M37.5 26 L40 30 L42.5 26" fill="none" stroke="#7C6CF7" strokeWidth="1.5" strokeOpacity="0.6"/>
      {/* Decision diamond */}
      <path d="M40 32 L54 40 L40 48 L26 40 Z" fill="#7C6CF7" fillOpacity="0.22" stroke="#7C6CF7" strokeWidth="1.8"/>
      {/* Right arrow from diamond */}
      <line x1="54" y1="40" x2="62" y2="40" stroke="#7C6CF7" strokeOpacity="0.55" strokeWidth="1.5"/>
      <path d="M60 37.5 L64 40 L60 42.5" fill="none" stroke="#7C6CF7" strokeWidth="1.5" strokeOpacity="0.55"/>
      <rect x="64" y="33" width="11" height="14" rx="4" fill="#7C6CF7" fillOpacity="0.45"/>
      {/* Down arrow from diamond */}
      <line x1="40" y1="48" x2="40" y2="56" stroke="#7C6CF7" strokeOpacity="0.6" strokeWidth="1.5"/>
      <path d="M37.5 54 L40 58 L42.5 54" fill="none" stroke="#7C6CF7" strokeWidth="1.5" strokeOpacity="0.6"/>
      {/* End capsule */}
      <rect x="26" y="58" width="28" height="14" rx="7" fill="#7C6CF7" fillOpacity="0.55"/>
    </svg>
  );
}

function IllustCases() {
  return (
    <svg viewBox="0 0 80 80" width={68} height={68} fill="none">
      {/* Pulse rings */}
      <circle cx="40" cy="40" r="22" fill="#F6A623" fillOpacity="0.06"/>
      <circle cx="40" cy="40" r="14" fill="#F6A623" fillOpacity="0.07"/>
      {/* Bell body */}
      <path d="M40 16 C29 16 23 25 23 36 L23 54 L57 54 L57 36 C57 25 51 16 40 16 Z" fill="#F6A623" fillOpacity="0.22" stroke="#F6A623" strokeWidth="2.5"/>
      {/* Bell top knob */}
      <circle cx="40" cy="16" r="3.5" fill="#F6A623" fillOpacity="0.7"/>
      {/* Bell clapper */}
      <rect x="34" y="54" width="12" height="6" rx="3" fill="#F6A623" fillOpacity="0.6"/>
      {/* Notification badge */}
      <circle cx="56" cy="24" r="11" fill="#FF5C77"/>
      <text x="56" y="29" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">24</text>
    </svg>
  );
}

function IllustRules() {
  return (
    <svg viewBox="0 0 80 80" width={68} height={68} fill="none">
      {/* Left page */}
      <path d="M10 20 L40 25 L40 68 L10 63 Z" fill="#2FD8A6" fillOpacity="0.18" stroke="#2FD8A6" strokeWidth="2"/>
      {/* Right page */}
      <path d="M40 25 L70 20 L70 63 L40 68 Z" fill="#2FD8A6" fillOpacity="0.10" stroke="#2FD8A6" strokeWidth="2"/>
      {/* Spine */}
      <line x1="40" y1="25" x2="40" y2="68" stroke="#2FD8A6" strokeWidth="2.5"/>
      {/* Left page text lines */}
      <line x1="16" y1="34" x2="36" y2="37" stroke="#2FD8A6" strokeOpacity="0.60" strokeWidth="1.5"/>
      <line x1="16" y1="42" x2="36" y2="45" stroke="#2FD8A6" strokeOpacity="0.60" strokeWidth="1.5"/>
      <line x1="16" y1="50" x2="36" y2="53" stroke="#2FD8A6" strokeOpacity="0.60" strokeWidth="1.5"/>
      <line x1="16" y1="58" x2="30" y2="61" stroke="#2FD8A6" strokeOpacity="0.35" strokeWidth="1.5"/>
      {/* Right page text lines */}
      <line x1="44" y1="32" x2="64" y2="29" stroke="#2FD8A6" strokeOpacity="0.55" strokeWidth="1.5"/>
      <line x1="44" y1="40" x2="64" y2="37" stroke="#2FD8A6" strokeOpacity="0.55" strokeWidth="1.5"/>
      <line x1="44" y1="48" x2="64" y2="45" stroke="#2FD8A6" strokeOpacity="0.55" strokeWidth="1.5"/>
      <line x1="44" y1="56" x2="58" y2="53" stroke="#2FD8A6" strokeOpacity="0.35" strokeWidth="1.5"/>
    </svg>
  );
}

function IllustPurpose() {
  return (
    <svg viewBox="0 0 80 80" width={68} height={68} fill="none">
      {/* Tag shape */}
      <path d="M16 13 L52 13 L70 31 L70 60 L52 70 L16 70 L10 60 L10 23 Z" fill="#F6A623" fillOpacity="0.16" stroke="#F6A623" strokeWidth="2.5"/>
      {/* Tag hole */}
      <circle cx="22" cy="24" r="4" fill="none" stroke="#F6A623" strokeWidth="2"/>
      {/* Text lines */}
      <line x1="28" y1="37" x2="60" y2="37" stroke="#F6A623" strokeOpacity="0.70" strokeWidth="2"/>
      <line x1="28" y1="47" x2="60" y2="47" stroke="#F6A623" strokeOpacity="0.50" strokeWidth="2"/>
      <line x1="28" y1="57" x2="48" y2="57" stroke="#F6A623" strokeOpacity="0.35" strokeWidth="2"/>
      {/* Checkmark */}
      <path d="M52 55 L57 61 L68 47" fill="none" stroke="#2FD8A6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IllustReadiness() {
  return (
    <svg viewBox="0 0 80 80" width={68} height={68} fill="none">
      {/* Clipboard board */}
      <rect x="13" y="16" width="54" height="58" rx="6" fill="#39B9ED" fillOpacity="0.10" stroke="#39B9ED" strokeWidth="2"/>
      {/* Clipboard clip */}
      <rect x="27" y="10" width="26" height="14" rx="5" fill="#0A1130" stroke="#39B9ED" strokeWidth="2"/>
      <rect x="31" y="13" width="18" height="7" rx="3.5" fill="#39B9ED" fillOpacity="0.35"/>
      {/* Row 1 - done */}
      <path d="M21 36 L26 42 L34 31" fill="none" stroke="#2FD8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="39" y1="37" x2="59" y2="37" stroke="#39B9ED" strokeOpacity="0.55" strokeWidth="1.5"/>
      {/* Row 2 - done */}
      <path d="M21 51 L26 57 L34 46" fill="none" stroke="#2FD8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="39" y1="52" x2="59" y2="52" stroke="#39B9ED" strokeOpacity="0.55" strokeWidth="1.5"/>
      {/* Row 3 - pending */}
      <circle cx="25" cy="64" r="4" fill="none" stroke="#39B9ED" strokeOpacity="0.45" strokeWidth="1.5"/>
      <line x1="39" y1="64" x2="55" y2="64" stroke="#39B9ED" strokeOpacity="0.35" strokeWidth="1.5"/>
    </svg>
  );
}
