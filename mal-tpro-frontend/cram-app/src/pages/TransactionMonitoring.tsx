import { useMemo, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Card, Sec, AiTag } from "../components/ui";
import { exportGlobalAccountTmWorkbook, exportMalBankTmWorkbook } from "../lib/tmScreeningWorkbookBuilder";
import { ModuleCard, ModuleGrid, type LucideIcon } from "../components/modern/ModernUI";
import { ShieldCheck, TrendingUp, GitBranch, Bell, BookOpen, Tag, ClipboardCheck } from "lucide-react";
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

const TAB_ICONS: Record<TabId, { Icon: LucideIcon; iconBg: string; meta: string; badge: string }> = {
  programme:  { Icon: ShieldCheck,    iconBg: "#A953DF", meta: "3 sections", badge: "Active" },
  scoring:    { Icon: TrendingUp,     iconBg: "#39B9ED", meta: "4 tiers",    badge: "v2.1" },
  workflow:   { Icon: GitBranch,      iconBg: "#7C6CF7", meta: "7 steps",    badge: "Live" },
  cases:      { Icon: Bell,           iconBg: "#F6A623", meta: "7 stages",   badge: "SLA" },
  monitoring: { Icon: BookOpen,       iconBg: "#2FD8A6", meta: "40 rules",   badge: "Active" },
  purpose:    { Icon: Tag,            iconBg: "#A953DF", meta: "5 flows",    badge: "Catalog" },
  readiness:  { Icon: ClipboardCheck, iconBg: "#39B9ED", meta: "14 items",   badge: "Gates" },
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

      <ModuleGrid cols={4}>
        {TABS.map((t) => {
          const { Icon, iconBg, meta, badge } = TAB_ICONS[t.id];
          return (
            <ModuleCard
              key={t.id}
              icon={<Icon size={20} />}
              iconBg={iconBg}
              title={t.label}
              desc={t.hint}
              meta={meta}
              badge={badge}
              active={tab === t.id}
              onClick={() => setTab(t.id)}
            />
          );
        })}
      </ModuleGrid>

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
          Use this tab in onboarding reviews and periodic audits. Confirm every payment rail in the MAL app
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
