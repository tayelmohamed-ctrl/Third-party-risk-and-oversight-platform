import { useMemo, useState, useEffect, useCallback, type ReactNode, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Card, Sec, AiTag } from "../components/ui";
import { exportGlobalAccountTmWorkbook, exportMalBankTmWorkbook } from "../lib/tmScreeningWorkbookBuilder";
import AgentBanner from "../components/agents/AgentBanner";
import AgentAiTag from "../components/agents/AgentAiTag";
import {
  TXN_SCREENING_PROGRAMME, TXN_SCREENING_SCORING, TXN_SCREENING_WORKFLOW,
  TXN_SCREENING_CASE_MGMT, OSCILAR_RULE_CATEGORIES,
  FIVE_GATE_SPINE, ALERT_TRIAGE_SLA, RESCREEN_CADENCE, TM_HANDLING_PRINCIPLES,
  type OscilarTmRule, type PaymentChannel,
} from "../config/oscilarProgramme";
import ruleLibrary from "../data/oscilar_rule_library.json";
import { SCREENING_AUTHORITY, SCREENING_SLA } from "../config/partnerIntegration";
import { apiTmAlerts, type TmAlertRecord } from "../lib/api";
import TmReadinessPanel from "../components/tm/TmReadinessPanel";
import PaymentPurposeGuidancePanel, { type PanelTab } from "../components/tm/PaymentPurposeGuidancePanel";
import ZenusPurposeCodeReview from "../components/tm/ZenusPurposeCodeReview";
import { exportTransactionPurposeCatalogPdf } from "../lib/transactionPurposeCatalogPdf";
import { usePerimeter } from "../context/PerimeterContext";
import { BRD_SCENARIOS, BRD_SCENARIO_META, type BrdScenario } from "../config/malBankBrdScenarios";

type TabId = "programme" | "scoring" | "workflow" | "cases" | "monitoring" | "purpose" | "readiness" | "onboarding" | "scenario";

const TABS: { id: TabId; label: string; hint: string }[] = [
  { id: "programme", label: "Screening programme", hint: "Scope · authority · coverage" },
  { id: "scoring", label: "Scoring model", hint: "Alert tiers · dimensions" },
  { id: "workflow", label: "Workflow", hint: "Real-time decision path" },
  { id: "cases", label: "Alerts & cases", hint: "SLA · ownership · outputs" },
  { id: "monitoring", label: "TM rule library", hint: "Oscilar rules · transfers & cards" },
  { id: "purpose", label: "Purpose codes", hint: "Accept · conditional · eliminate · PDF" },
  { id: "readiness", label: "Pre-impl readiness", hint: "BRD gates · alert & screening rules" },
];

/**
 * Navigation cards — every card maps to real content. Cards 01–07 open a
 * top-level tab; cards 08–14 deep-link into the Purpose panel's sub-views.
 * Metric values are the true counts from the live catalogue/config.
 */
type IllustKey =
  | "programme" | "scoring" | "workflow" | "cases" | "monitoring" | "purpose" | "readiness"
  | "C2C" | "C2B" | "B2C" | "B2B" | "Mal2Mal" | "corridors" | "typologies" | "onboarding" | "scenario";

interface TmCardDef {
  num: string;
  title: string;
  desc: string;
  value: string;
  unit: string;
  accent: string;
  illust: IllustKey;
  tab: TabId;
  sub?: PanelTab;
}

const CARDS: TmCardDef[] = [
  // Row 1
  { num: "01", title: "Screening Programme", desc: "Scope, authority, coverage and screening operations", value: "3",  unit: "Topics",    accent: "#A953DF", illust: "programme",  tab: "programme" },
  { num: "02", title: "Scoring Model",       desc: "Alert tiers, dimensions and risk scoring logic",       value: "4",  unit: "Tiers",     accent: "#39B9ED", illust: "scoring",    tab: "scoring" },
  { num: "03", title: "Workflow",            desc: "End-to-end workflow from alert to closure",            value: "7",  unit: "Steps",     accent: "#7C6CF7", illust: "workflow",   tab: "workflow" },
  { num: "04", title: "Alerts & Cases",      desc: "SLA, ownership, queues and case management",           value: "7",  unit: "Stages",    accent: "#F6A623", illust: "cases",      tab: "cases" },
  { num: "05", title: "TM Rule Library",     desc: "Oscilar rules — transfers & cards (with logic)",       value: "76", unit: "Rules",     accent: "#2FD8A6", illust: "monitoring", tab: "monitoring" },
  { num: "06", title: "Purpose Codes",       desc: "Accept, condition, eliminate — PDF guide",             value: "80", unit: "Codes",     accent: "#E8B84B", illust: "purpose",    tab: "purpose", sub: "overview" },
  // Row 2
  { num: "07", title: "Pre-Impl Readiness",  desc: "BRD gates · alert & screening rules readiness",        value: "7",  unit: "Gates",     accent: "#39B9ED", illust: "readiness",  tab: "readiness" },
  { num: "08", title: "C2C",                 desc: "Individual → Individual (off-us)",                     value: "14", unit: "Scenarios", accent: "#A953DF", illust: "C2C",        tab: "purpose", sub: "C2C" },
  { num: "09", title: "C2B",                 desc: "Individual → Business",                                value: "16", unit: "Scenarios", accent: "#7C6CF7", illust: "C2B",        tab: "purpose", sub: "C2B" },
  { num: "10", title: "B2C",                 desc: "Business → Individual",                                value: "16", unit: "Scenarios", accent: "#39B9ED", illust: "B2C",        tab: "purpose", sub: "B2C" },
  { num: "11", title: "B2B",                 desc: "Business → Business",                                  value: "20", unit: "Scenarios", accent: "#8E7CF0", illust: "B2B",        tab: "purpose", sub: "B2B" },
  { num: "12", title: "Mal2Mal",             desc: "On-us (Mal → Mal)",                                    value: "14", unit: "Scenarios", accent: "#2FD8A6", illust: "Mal2Mal",    tab: "purpose", sub: "Mal2Mal" },
  { num: "13", title: "Corridor Guidance",   desc: "Countries, corridors and risk expectations",          value: "6",  unit: "Corridors", accent: "#39B9ED", illust: "corridors",  tab: "purpose", sub: "corridors" },
  { num: "14", title: "Country Typologies",  desc: "EWRAs, typologies and country risk insights",          value: "7",  unit: "Countries", accent: "#FF5C77", illust: "typologies", tab: "purpose", sub: "typologies" },
  // Global Account · workflows & scenarios
  { num: "15", title: "GA Onboarding CRR",   desc: "Global Account (Zenus) risk-rating onboarding workflow", value: "7",  unit: "Stages",    accent: "#3DC08B", illust: "onboarding", tab: "onboarding" },
  { num: "16", title: "PEP / RCA · Zenus",   desc: "Scenario — high-risk-region client, funds from Zenus, Foreign-PEP / RCA", value: "4", unit: "Workflows", accent: "#C08CF0", illust: "scenario", tab: "scenario" },
];

const ROW1 = CARDS.slice(0, 6);
const ROW2 = CARDS.slice(6, 14);
const ROW3 = CARDS.slice(14);

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
  const { perimeter } = usePerimeter();
  const [tab, setTab] = useState<TabId>("programme");
  const [channel, setChannel] = useState<PaymentChannel | "all">("all");
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  // Presentation-only navigation state for the illustrated card grid + detail panel.
  const [activeCard, setActiveCard] = useState<string>("01");
  const [purposeSub, setPurposeSub] = useState<PanelTab>("overview");
  const [panelOpen, setPanelOpen] = useState(true);

  function openCard(c: TmCardDef) {
    setActiveCard(c.num);
    setTab(c.tab);
    if (c.tab === "purpose") setPurposeSub(c.sub ?? "overview");
    setPanelOpen(true);
  }

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

  // Card #06 (Purpose Codes) is perimeter-aware: Global Account shows the
  // reviewed Zenus register; Mal Bank keeps the CBUAE/UAE purpose catalog.
  const cardView = useCallback(
    (c: TmCardDef): TmCardDef => {
      if (perimeter !== "global_account") return c;
      if (c.num === "06") return { ...c, title: "Purpose Codes · Zenus", desc: "Reviewed Global Account register — corrected codes + PDF", value: "30", unit: "Codes" };
      // Global Account corridor guidance / country typologies cover the nine permitted corridors.
      if (c.num === "08") return { ...c, desc: "GA-01…GA-25 self-transfer & C2C scenarios + purpose codes", value: "25", unit: "Scenarios" };
      if (c.num === "09") return { ...c, desc: "C2B-GA-01…24 Individual→Business scenarios + purpose codes", value: "24", unit: "Scenarios" };
      if (c.num === "10") return { ...c, desc: "B2C-GA-01…20 Business→Individual (entity) scenarios + purpose codes", value: "20", unit: "Scenarios" };
      if (c.num === "11") return { ...c, desc: "B2B-GA-01…20 Business→Business (entity-to-entity) scenarios + purpose codes", value: "20", unit: "Scenarios" };
      if (c.num === "12") return { ...c, desc: "M2M-GA-01…14 on-us scenarios — linkage lens & internal-layering + purpose codes", value: "14", unit: "Scenarios" };
      if (c.num === "13") return { ...c, desc: "US MSB — nine permitted corridors, self/C2C typologies", value: "9", unit: "Corridors" };
      if (c.num === "14") return { ...c, desc: "Per-corridor self/C2C typologies + periodic-review lens", value: "9", unit: "Corridors" };
      return c;
    },
    [perimeter],
  );

  const activeDef = cardView(CARDS.find((c) => c.num === activeCard) ?? CARDS[0]);

  return (
    <div>
      <AgentBanner agent="mohsen" title="Transaction monitoring & screening — investigator guide">
        Everything investigators need to verify Oscilar covers <b>all Mal app payments</b> — transfers and cards —
        with the right rules deployed. Transaction screening list hits always mirror to Vital4; TM alerts feed CRAM re-rating.
      </AgentBanner>

      {/* Header action */}
      <div className="flex items-center justify-end -mt-1 mb-3.5">
        <button
          type="button"
          onClick={() => void exportTransactionPurposeCatalogPdf()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold text-white transition-all hover:opacity-90 shadow-[0_4px_16px_rgba(169,83,223,.25)]"
          style={{ background: "linear-gradient(90deg,#A953DF,#7C6CF7)" }}
          title="Download the full transaction purpose & screening guide (PDF)"
        >
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M6 1v7M3.5 5.5 6 8l2.5-2.5M2 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Download full PDF guide
        </button>
      </div>

      {/* Row 1 — 6 primary sections */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-2.5">
        {ROW1.map((c) => (
          <TmCard key={c.num} def={cardView(c)} active={activeCard === c.num} onClick={() => openCard(c)} />
        ))}
      </div>
      {/* Row 2 — readiness + purpose-flow deep links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mb-4">
        {ROW2.map((c) => (
          <TmCard key={c.num} def={cardView(c)} active={activeCard === c.num} onClick={() => openCard(c)} />
        ))}
      </div>

      {/* Global Account · workflows & scenarios */}
      <div className="flex items-center gap-2 mb-2.5 mt-1">
        <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#6E72A6]">Global Account · workflows & scenarios</span>
        <div className="h-px flex-1 bg-[#1e2156]" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mb-4">
        {ROW3.map((c) => (
          <TmCard key={c.num} def={cardView(c)} active={activeCard === c.num} onClick={() => openCard(c)} />
        ))}
      </div>

      {/* Expandable detail panel */}
      {panelOpen && (
        <TmDetailPanel def={activeDef} onClose={() => setPanelOpen(false)}>
          {activeDef.tab === "programme" && <ProgrammeTab />}
          {activeDef.tab === "scoring" && <ScoringTab />}
          {activeDef.tab === "workflow" && <WorkflowTab />}
          {activeDef.tab === "cases" && <CasesTab />}
          {activeDef.tab === "monitoring" && (
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
          {activeDef.tab === "readiness" && <TmReadinessPanel />}
          {activeDef.tab === "onboarding" && <OnboardingWorkflowTab />}
          {activeDef.tab === "scenario" && <ScenarioPlaybookTab />}
          {activeDef.tab === "purpose" && (
            activeDef.num === "06" && perimeter === "global_account"
              ? <ZenusPurposeCodeReview />
              : <PaymentPurposeGuidancePanel defaultTab={purposeSub} key={purposeSub} />
          )}
        </TmDetailPanel>
      )}

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

      <Card className="p-4">
        <Sec>Five-gate decision spine — onboarding (CRAM §0)</Sec>
        <p className="text-[11px] text-muted mt-1 mb-3">
          The AI never scores first — it runs these gates in order and stops at the first that produces an outcome.
          This keeps EDD quick: only documents that surviving gates trigger are requested.
        </p>
        <div className="space-y-2">
          {FIVE_GATE_SPINE.map((g) => (
            <div key={g.id} className="flex gap-3 items-start">
              <span className="pill bg-ai/15 text-ai text-[10px] mono shrink-0 mt-0.5">{g.id}</span>
              <div className="min-w-0">
                <div className="text-[12px] font-semibold">{g.name}</div>
                <div className="text-[11px] text-muted">{g.checks}</div>
                <div className="text-[11px] text-[#ff9db0] mt-0.5">Fail → {g.failCondition}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
        <Card className="p-4">
          <Sec>Anti-tipping-off (always)</Sec>
          <ul className="mt-2 mb-0 pl-4 space-y-1 text-[11px] text-muted list-disc">
            {TM_HANDLING_PRINCIPLES.antiTippingOff.map((x) => <li key={x}>{x}</li>)}
          </ul>
        </Card>
        <Card className="p-4">
          <Sec>Victim-aware exit (fair access)</Sec>
          <ul className="mt-2 mb-0 pl-4 space-y-1 text-[11px] text-muted list-disc">
            {TM_HANDLING_PRINCIPLES.victimAwareExit.map((x) => <li key={x}>{x}</li>)}
          </ul>
        </Card>
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
        <div className="flex flex-wrap gap-2 mt-3">
          {ALERT_TRIAGE_SLA.map((t) => (
            <span key={t.priority} className="pill bg-panel2 text-muted text-[10px]">
              <b className="text-ink">{t.priority}</b> {t.target} · {t.scope}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-faint mt-2 mb-0">{RESCREEN_CADENCE}</p>
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
  const { perimeter } = usePerimeter();
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

      {perimeter === "mal_bank" && <BrdScenarioInventory query={query} />}
    </div>
  );
}

const BRD_PRIORITY_STYLE: Record<string, string> = {
  Must: "bg-proh/20 text-[#ff7ea0]",
  "Must if applicable": "bg-proh/15 text-[#ff9db5]",
  Should: "bg-med/15 text-med",
  Conditional: "bg-ai/15 text-ai",
};

function brdTypologyStyle(typology: string): string {
  if (/Sanctions|PF/.test(typology)) return "bg-proh/20 text-[#ff7ea0]";
  if (/TF/.test(typology)) return "bg-med/15 text-med";
  if (/Fraud/.test(typology)) return "bg-ai/15 text-ai";
  return "bg-panel2 text-muted";
}

function BrdScenarioInventory({ query }: { query: string }) {
  const q = query.trim().toLowerCase();
  const scenarios = q
    ? BRD_SCENARIOS.filter((s) =>
        [s.id, s.name, s.typology, s.riskCovered, s.logic, s.segment, s.productChannel]
          .join(" ").toLowerCase().includes(q))
    : BRD_SCENARIOS;
  return (
    <div className="mt-6">
      <div className="h-px w-full bg-[#1e2156] mb-4" />
      <Sec>Mal Bank TM System BRD — Scenario Inventory (§12)</Sec>
      <Card className="p-4 border-ai/30 bg-ai/5 mb-3">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="pill bg-panel2 text-muted text-[10px]">{BRD_SCENARIO_META.documentId}</span>
          <span className="pill bg-low/15 text-low text-[10px]">v{BRD_SCENARIO_META.version}</span>
          <span className="pill bg-panel2 text-muted text-[10px]">CBUAE · Mal Bank</span>
          <span className="text-[11px] text-muted ml-auto">{BRD_SCENARIOS.length} scenarios · SCN-001…SCN-027</span>
        </div>
        <p className="text-[11px] text-muted mt-2 mb-0">{BRD_SCENARIO_META.note}</p>
        {q && <p className="text-[10px] text-faint mt-1 mb-0">Showing {scenarios.length} of {BRD_SCENARIOS.length} — filtered by the search box above.</p>}
      </Card>

      <div className="space-y-2.5">
        {scenarios.length === 0 ? (
          <Card className="p-4 text-muted text-[13px]">No BRD scenarios match your search.</Card>
        ) : scenarios.map((s) => (
          <BrdScenarioCard key={s.id} s={s} />
        ))}
      </div>
    </div>
  );
}

function BrdScenarioCard({ s }: { s: BrdScenario }) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap gap-2 items-start justify-between mb-1.5">
        <div className="min-w-0">
          <span className="mono text-[10px] text-faint">{s.id}</span>
          <h3 className="m-0 mt-0.5 text-sm font-display">{s.name}</h3>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <span className={`pill text-[10px] ${brdTypologyStyle(s.typology)}`}>{s.typology}</span>
          <span className={`pill text-[10px] ${BRD_PRIORITY_STYLE[s.priority] ?? "bg-panel2 text-muted"}`}>{s.priority}</span>
          <span className="pill bg-panel2 text-muted text-[10px]">{s.frequency}</span>
        </div>
      </div>
      <p className="text-[12px] text-muted m-0">{s.riskCovered}</p>
      <div className="grid grid-cols-2 gap-3 mt-3 max-md:grid-cols-1 text-[11px]">
        <div className="p-2 bg-panel2 rounded border border-lineSoft">
          <div className="text-faint uppercase text-[10px]">Logic</div>
          <div className="mt-0.5">{s.logic}</div>
        </div>
        <div className="p-2 bg-panel2 rounded border border-lineSoft">
          <div className="text-faint uppercase text-[10px]">Threshold</div>
          <div className="mt-0.5">{s.threshold}</div>
        </div>
        <div className="p-2 bg-panel2 rounded border border-lineSoft">
          <div className="text-faint uppercase text-[10px]">Segment · product / channel</div>
          <div className="mt-0.5">{s.segment} · {s.productChannel}</div>
        </div>
        <div className="p-2 bg-panel2 rounded border border-lineSoft">
          <div className="text-faint uppercase text-[10px]">Expected alert output</div>
          <div className="mt-0.5">{s.expectedOutput}</div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-faint">
        <span><b className="text-muted">Data:</b> {s.dataFields.join(", ")}</span>
        <span><b className="text-muted">Tuning:</b> {s.tuningNotes}</span>
        <span className="mono">{s.uatRef}</span>
      </div>
    </Card>
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

function TmCard({ def, active, onClick }: { def: TmCardDef; active: boolean; onClick: () => void }) {
  const { num, title, desc, value, unit, accent } = def;
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative flex flex-col text-left rounded-2xl border overflow-hidden cursor-pointer p-3",
        "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A953DF]",
        active
          ? "shadow-[0_0_36px_rgba(169,83,223,.18)] scale-[1.02] z-10"
          : "border-[#22254f] hover:border-[#A953DF]/35 hover:-translate-y-0.5",
      ].join(" ")}
      style={{
        background: active
          ? "linear-gradient(160deg,#171436 0%,#0d0f2e 70%)"
          : "linear-gradient(160deg,#0d1030 0%,#0A0E28 100%)",
        borderColor: active ? `${accent}88` : undefined,
        minHeight: "168px",
      }}
    >
      {/* Active top accent */}
      {active && (
        <span aria-hidden className="absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg,transparent,${accent},transparent)` }} />
      )}
      {/* Number + illustration */}
      <div className="flex items-start justify-between">
        <span
          className="font-display text-[12px] font-black tabular-nums leading-none mt-0.5"
          style={{ color: active ? accent : "#5f6499" }}
        >
          {num}
        </span>
        <div className="transition-transform duration-200 group-hover:scale-105" style={{ transform: active ? "scale(1.05)" : undefined }}>
          {getTmIllust(def.illust, 50)}
        </div>
      </div>
      {/* Title + description */}
      <div className="mt-1.5 flex-1">
        <div className="text-[11.5px] font-bold font-display leading-tight" style={{ color: active ? "#ffffff" : "#D6D9F5" }}>
          {title}
        </div>
        <div className="text-[9.5px] mt-1 leading-snug line-clamp-2" style={{ color: "#8489bd" }}>
          {desc}
        </div>
      </div>
      {/* Metric */}
      <div className="mt-2 pt-2 border-t border-[#20234a] flex items-baseline gap-1.5">
        <span className="font-display text-[16px] font-bold leading-none tabular-nums" style={{ color: active ? "#fff" : "#C4C8F0" }}>{value}</span>
        <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: accent }}>{unit}</span>
      </div>
    </button>
  );
}

// ─── Content detail panel ─────────────────────────────────────────────────────

function TmDetailPanel({ def, onClose, children }: { def: TmCardDef; onClose: () => void; children: ReactNode }) {
  const { num, title, desc, value, unit, accent } = def;
  return (
    <div
      className="rounded-2xl border overflow-hidden mt-1 transition-all duration-200"
      style={{ borderColor: `${accent}55`, boxShadow: `0 0 40px ${accent}1f` }}
    >
      {/* Header band */}
      <div
        className="relative flex items-center gap-4 px-5 py-4 border-b border-[#1e2156]"
        style={{ background: "linear-gradient(135deg,#0c1233 0%,#181c48 100%)" }}
      >
        {/* Ghost number */}
        <span
          aria-hidden
          className="font-display text-[46px] font-black leading-none select-none shrink-0 tabular-nums"
          style={{ color: accent, opacity: 0.9 }}
        >
          {num}
        </span>
        {/* Illustration tile */}
        <div
          className="shrink-0 w-14 h-14 rounded-xl grid place-items-center"
          style={{ background: `${accent}14`, boxShadow: `inset 0 0 0 1px ${accent}33` }}
        >
          {getTmIllust(def.illust, 40)}
        </div>
        {/* Title / description */}
        <div className="min-w-0">
          <div className="font-display text-[16px] font-bold text-white leading-tight">{title}</div>
          <div className="text-[11px] text-[#A7ACDB] mt-0.5">{desc}</div>
        </div>
        {/* Metric chip */}
        <div className="ml-auto text-right shrink-0 hidden sm:block">
          <div className="font-display text-[20px] font-bold leading-none tabular-nums" style={{ color: accent }}>{value}</div>
          <div className="text-[9px] uppercase tracking-wide text-[#6E72A6] mt-0.5">{unit}</div>
        </div>
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 w-8 h-8 rounded-lg grid place-items-center text-[#8A8FC0] hover:text-white hover:bg-white/10 transition"
          aria-label="Collapse panel"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
      {/* Content */}
      <div className="p-4 pt-5" style={{ background: "#080d22" }}>
        {children}
      </div>
      {/* Footer note */}
      <div className="px-5 py-2.5 border-t border-[#1e2156] flex items-center gap-2 text-[10px] text-[#6E72A6]" style={{ background: "#0a0f26" }}>
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent }} />
        All frameworks are continuously updated in line with regulatory changes and internal risk assessments.
      </div>
    </div>
  );
}

// ─── Illustration dispatcher ──────────────────────────────────────────────────

function getTmIllust(key: IllustKey, size = 68): JSX.Element {
  const svg = (() => {
    switch (key) {
      case "programme":  return <IllustScreening />;
      case "scoring":    return <IllustScoring />;
      case "workflow":   return <IllustWorkflow />;
      case "cases":      return <IllustCases />;
      case "monitoring": return <IllustRules />;
      case "purpose":    return <IllustPurpose />;
      case "readiness":  return <IllustReadiness />;
      case "C2C":        return <IllustC2C />;
      case "C2B":        return <IllustC2B />;
      case "B2C":        return <IllustB2C />;
      case "B2B":        return <IllustB2B />;
      case "Mal2Mal":    return <IllustMal2Mal />;
      case "corridors":  return <IllustCorridors />;
      case "typologies": return <IllustTypologies />;
      case "onboarding": return <IllustOnboarding />;
      case "scenario": return <IllustScenario />;
    }
  })();
  if (size === 68) return svg;
  return (
    <div style={{ width: size, height: size, display: "grid", placeItems: "center" }}>
      <div style={{ transform: `scale(${size / 68})` }}>{svg}</div>
    </div>
  );
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

/** Two people (customer to customer). */
function IllustC2C() {
  return (
    <svg viewBox="0 0 80 80" width={68} height={68} fill="none">
      {/* Left person */}
      <circle cx="22" cy="26" r="8" fill="#A953DF" fillOpacity="0.85"/>
      <path d="M8 52 C8 42 16 38 22 38 C28 38 36 42 36 52 Z" fill="#A953DF" fillOpacity="0.55"/>
      {/* Right person */}
      <circle cx="58" cy="26" r="8" fill="#A953DF" fillOpacity="0.55"/>
      <path d="M44 52 C44 42 52 38 58 38 C64 38 72 42 72 52 Z" fill="#A953DF" fillOpacity="0.35"/>
      {/* Exchange arrows */}
      <path d="M31 60 H49" stroke="#7C6CF7" strokeWidth="2" strokeLinecap="round"/>
      <path d="M46 57 L50 60 L46 63" fill="none" stroke="#7C6CF7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M49 68 H31" stroke="#7C6CF7" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.6"/>
      <path d="M34 65 L30 68 L34 71" fill="none" stroke="#7C6CF7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6"/>
    </svg>
  );
}

/** Person to shopping cart (customer to business). */
function IllustC2B() {
  return (
    <svg viewBox="0 0 80 80" width={68} height={68} fill="none">
      {/* Person */}
      <circle cx="20" cy="26" r="7.5" fill="#7C6CF7" fillOpacity="0.85"/>
      <path d="M8 50 C8 41 15 37 20 37 C25 37 32 41 32 50 Z" fill="#7C6CF7" fillOpacity="0.5"/>
      {/* Arrow */}
      <path d="M34 40 H46" stroke="#7C6CF7" strokeWidth="2" strokeLinecap="round"/>
      <path d="M43 37 L47 40 L43 43" fill="none" stroke="#7C6CF7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Cart */}
      <path d="M50 30 H54 L58 50 H70" stroke="#7C6CF7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M56 38 H72 L70 48 H58 Z" fill="#7C6CF7" fillOpacity="0.22" stroke="#7C6CF7" strokeWidth="1.8"/>
      <circle cx="60" cy="56" r="3" fill="#7C6CF7" fillOpacity="0.7"/>
      <circle cx="69" cy="56" r="3" fill="#7C6CF7" fillOpacity="0.7"/>
    </svg>
  );
}

/** Briefcase to person (business to customer). */
function IllustB2C() {
  return (
    <svg viewBox="0 0 80 80" width={68} height={68} fill="none">
      {/* Briefcase */}
      <rect x="8" y="30" width="30" height="22" rx="3" fill="#39B9ED" fillOpacity="0.20" stroke="#39B9ED" strokeWidth="2"/>
      <path d="M17 30 V26 A3 3 0 0 1 20 23 H26 A3 3 0 0 1 29 26 V30" fill="none" stroke="#39B9ED" strokeWidth="2"/>
      <line x1="8" y1="40" x2="38" y2="40" stroke="#39B9ED" strokeOpacity="0.5" strokeWidth="1.5"/>
      {/* Arrow */}
      <path d="M40 41 H52" stroke="#39B9ED" strokeWidth="2" strokeLinecap="round"/>
      <path d="M49 38 L53 41 L49 44" fill="none" stroke="#39B9ED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Person */}
      <circle cx="62" cy="30" r="7.5" fill="#39B9ED" fillOpacity="0.8"/>
      <path d="M50 54 C50 45 57 41 62 41 C67 41 74 45 74 54 Z" fill="#39B9ED" fillOpacity="0.45"/>
    </svg>
  );
}

/** Two buildings (business to business). */
function IllustB2B() {
  return (
    <svg viewBox="0 0 80 80" width={68} height={68} fill="none">
      {/* Left building */}
      <rect x="10" y="20" width="24" height="44" rx="2" fill="#8E7CF0" fillOpacity="0.22" stroke="#8E7CF0" strokeWidth="2"/>
      <rect x="15" y="26" width="5" height="5" fill="#8E7CF0" fillOpacity="0.7"/>
      <rect x="24" y="26" width="5" height="5" fill="#8E7CF0" fillOpacity="0.7"/>
      <rect x="15" y="36" width="5" height="5" fill="#8E7CF0" fillOpacity="0.55"/>
      <rect x="24" y="36" width="5" height="5" fill="#8E7CF0" fillOpacity="0.55"/>
      <rect x="15" y="46" width="5" height="5" fill="#8E7CF0" fillOpacity="0.4"/>
      <rect x="24" y="46" width="5" height="5" fill="#8E7CF0" fillOpacity="0.4"/>
      {/* Right building */}
      <rect x="46" y="30" width="24" height="34" rx="2" fill="#8E7CF0" fillOpacity="0.14" stroke="#8E7CF0" strokeWidth="2"/>
      <rect x="51" y="36" width="5" height="5" fill="#8E7CF0" fillOpacity="0.6"/>
      <rect x="60" y="36" width="5" height="5" fill="#8E7CF0" fillOpacity="0.6"/>
      <rect x="51" y="46" width="5" height="5" fill="#8E7CF0" fillOpacity="0.45"/>
      <rect x="60" y="46" width="5" height="5" fill="#8E7CF0" fillOpacity="0.45"/>
      {/* Link arrows */}
      <path d="M36 58 H44" stroke="#8E7CF0" strokeWidth="2" strokeLinecap="round"/>
      <path d="M41 55 L45 58 L41 61" fill="none" stroke="#8E7CF0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/** Bank columns (Mal to Mal, on-us). */
function IllustMal2Mal() {
  return (
    <svg viewBox="0 0 80 80" width={68} height={68} fill="none">
      {/* Roof */}
      <path d="M40 14 L66 28 H14 Z" fill="#2FD8A6" fillOpacity="0.25" stroke="#2FD8A6" strokeWidth="2" strokeLinejoin="round"/>
      {/* Columns */}
      <rect x="20" y="30" width="5" height="26" fill="#2FD8A6" fillOpacity="0.6"/>
      <rect x="31" y="30" width="5" height="26" fill="#2FD8A6" fillOpacity="0.6"/>
      <rect x="44" y="30" width="5" height="26" fill="#2FD8A6" fillOpacity="0.6"/>
      <rect x="55" y="30" width="5" height="26" fill="#2FD8A6" fillOpacity="0.6"/>
      {/* Base */}
      <rect x="14" y="58" width="52" height="6" rx="2" fill="#2FD8A6" fillOpacity="0.35"/>
      {/* On-us circular arrow */}
      <path d="M36 42 a4 4 0 1 1 4 4" fill="none" stroke="#39B9ED" strokeWidth="2" strokeLinecap="round"/>
      <path d="M40 42 l0 4 l3 -1" fill="none" stroke="#39B9ED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/** Globe with shield (corridor guidance). */
function IllustCorridors() {
  return (
    <svg viewBox="0 0 80 80" width={68} height={68} fill="none">
      {/* Globe */}
      <circle cx="34" cy="36" r="22" fill="#39B9ED" fillOpacity="0.10" stroke="#39B9ED" strokeWidth="2"/>
      <ellipse cx="34" cy="36" rx="9" ry="22" fill="none" stroke="#39B9ED" strokeOpacity="0.5" strokeWidth="1.4"/>
      <line x1="12" y1="36" x2="56" y2="36" stroke="#39B9ED" strokeOpacity="0.5" strokeWidth="1.4"/>
      <line x1="16" y1="25" x2="52" y2="25" stroke="#39B9ED" strokeOpacity="0.35" strokeWidth="1.2"/>
      <line x1="16" y1="47" x2="52" y2="47" stroke="#39B9ED" strokeOpacity="0.35" strokeWidth="1.2"/>
      {/* Corridor arc */}
      <path d="M22 44 Q40 20 50 30" fill="none" stroke="#A953DF" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round"/>
      {/* Shield */}
      <path d="M58 42 L70 46 V56 C70 63 64 67 58 70 C52 67 46 63 46 56 V46 Z" fill="#39B9ED" fillOpacity="0.2" stroke="#39B9ED" strokeWidth="2"/>
      <path d="M53 56 L57 60 L64 51" fill="none" stroke="#2FD8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/** Globe with alert (country typologies). */
function IllustTypologies() {
  return (
    <svg viewBox="0 0 80 80" width={68} height={68} fill="none">
      {/* Globe */}
      <circle cx="36" cy="38" r="24" fill="#FF5C77" fillOpacity="0.08" stroke="#FF5C77" strokeWidth="2"/>
      <ellipse cx="36" cy="38" rx="10" ry="24" fill="none" stroke="#FF5C77" strokeOpacity="0.4" strokeWidth="1.4"/>
      <line x1="12" y1="38" x2="60" y2="38" stroke="#FF5C77" strokeOpacity="0.4" strokeWidth="1.4"/>
      <line x1="16" y1="26" x2="56" y2="26" stroke="#FF5C77" strokeOpacity="0.3" strokeWidth="1.2"/>
      <line x1="16" y1="50" x2="56" y2="50" stroke="#FF5C77" strokeOpacity="0.3" strokeWidth="1.2"/>
      {/* Alert badge */}
      <circle cx="60" cy="22" r="12" fill="#FF5C77"/>
      <rect x="58.5" y="15" width="3" height="8" rx="1.5" fill="white"/>
      <circle cx="60" cy="27" r="1.8" fill="white"/>
    </svg>
  );
}

/** Decision-tree with three terminal branches (onboarding CRR workflow). */
function IllustOnboarding() {
  return (
    <svg viewBox="0 0 80 80" width={68} height={68} fill="none">
      {/* Root node */}
      <rect x="30" y="8" width="20" height="12" rx="3" fill="#3DC08B" fillOpacity="0.18" stroke="#3DC08B" strokeWidth="2"/>
      {/* Trunk + branches */}
      <path d="M40 20 V30 M40 30 H16 M40 30 H64 M16 30 V44 M40 30 V44 M64 30 V44" stroke="#3DC08B" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round"/>
      {/* Decline leaf */}
      <rect x="6" y="44" width="20" height="14" rx="3" fill="#FF5C77" fillOpacity="0.16" stroke="#FF5C77" strokeWidth="2"/>
      <line x1="13" y1="51" x2="19" y2="51" stroke="#FF5C77" strokeWidth="2" strokeLinecap="round"/>
      {/* Review leaf */}
      <rect x="30" y="44" width="20" height="14" rx="3" fill="#F6A623" fillOpacity="0.16" stroke="#F6A623" strokeWidth="2"/>
      <circle cx="40" cy="51" r="3" fill="none" stroke="#F6A623" strokeWidth="2"/>
      {/* Approve leaf */}
      <rect x="54" y="44" width="20" height="14" rx="3" fill="#2FD8A6" fillOpacity="0.16" stroke="#2FD8A6" strokeWidth="2"/>
      <path d="M60 51 L63 54 L68 48" fill="none" stroke="#2FD8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// global_accounts_zenus_onboarding_v02 — the AS-IS deployed workflow (26 steps → 7 phases).
// `flag` records the CRAM divergence for that phase (null = aligned). v04 corrects each ⚠.
/** Person + shield with a PEP star (scenario playbook). */
function IllustScenario() {
  return (
    <svg viewBox="0 0 80 80" width={68} height={68} fill="none">
      {/* Person */}
      <circle cx="28" cy="24" r="10" fill="#C08CF0" fillOpacity="0.18" stroke="#C08CF0" strokeWidth="2"/>
      <path d="M12 58 C12 45 20 40 28 40 C36 40 44 45 44 58 Z" fill="#C08CF0" fillOpacity="0.12" stroke="#C08CF0" strokeWidth="2"/>
      {/* Corridor arrow (funds from Zenus) */}
      <path d="M46 30 H68" stroke="#39B9ED" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round"/>
      <path d="M63 25 L68 30 L63 35" fill="none" stroke="#39B9ED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {/* PEP shield with star */}
      <path d="M58 44 L70 48 V58 C70 65 64 69 58 72 C52 69 46 65 46 58 V48 Z" fill="#F6A623" fillOpacity="0.2" stroke="#F6A623" strokeWidth="2"/>
      <path d="M58 52 l1.6 3.4 3.7 .4 -2.8 2.5 .8 3.6 -3.3 -1.9 -3.3 1.9 .8 -3.6 -2.8 -2.5 3.7 -.4 Z" fill="#F6A623"/>
    </svg>
  );
}

const ONBOARDING_PHASES: {
  no: string; label: string; color: string; steps: string[]; flag: string | null;
}[] = [
  {
    no: "01", label: "Entry & Screening", color: "#39B9ED", flag: null,
    steps: [
      "Step 1 — Derive geography inputs (residence, birth, nationality, source of wealth)",
      "Step 2 — Vital4 API screening (full name, DOB, request ID)",
      "Step 3 — Derive screening outputs (screened status, sanctions hit, match count, top-match score/type)",
    ],
  },
  {
    no: "02", label: "Geography Risk", color: "#2FD8A6",
    flag: "US §7.1 is funds-flow only — score max(SoW, SoF[, opco]). Residence / birth / nationality must NOT be scored (override checks only).",
    steps: [
      "Step 4 — Geography lookups (parallel): residence · birth · nationality · source of wealth",
      "Step 5 — Set geography lookup outputs (ratings, rankings, FIRMS overrides)",
      "Step 6 — Calculate geography score (greatest of FIRMS overrides), rating & prohibited flag",
    ],
  },
  {
    no: "03", label: "Customer Type Risk", color: "#F6A623",
    flag: "PEP must be a zero-weight gate and sanctions-match a prohibited override — not weighted here. UBO sub-factor (0.171) missing; residence-status & signatory-mandate are not CRAM CT factors.",
    steps: [
      "Step 7 — Derive CT inputs (segment, avg txn value, residence status, employment, profession, NOB, signatory mandate, PEP, sanction match)",
      "Step 8 — Customer-type lookups (parallel): 9 lookups incl. PEP status + sanction screening match",
      "Step 9 — Set CT lookup outputs, set NOB-prohibit flag",
      "Step 10 — Calculate weighted customer-type score and rating",
    ],
  },
  {
    no: "04", label: "Product & Service Risk", color: "#FF8A3D",
    flag: "Worst-of merge is correct, but weight is wrong: P&S pillar is 0.20 (product 0.12 + service 0.08), not 0.35.",
    steps: [
      "Step 11 — Derive inputs (product = international_payment_transfers · service = Digital Banking / Mobile App)",
      "Step 12 — Product & service lookups (parallel)",
      "Step 13 — Set product & service outputs",
      "Step 14 — Calculate product score (greatest of product/service) and rating",
    ],
  },
  {
    no: "05", label: "Delivery Channel Risk", color: "#A953DF",
    flag: "Channel is worst-of max(initiation, delivery), not a 50/50 average — and the weight is 0.20, not 0.10.",
    steps: [
      "Step 15 — Derive inputs (relationship initiation = E Channel · delivery method = E Channel)",
      "Step 16 — Delivery-channel lookups (parallel): relationship initiation · delivery method",
      "Step 17 — Set delivery-channel outputs",
      "Step 18 — Calculate channel score (50/50 weighted average) and rating",
    ],
  },
  {
    no: "06", label: "Overall + Transaction / STR", color: "#7C6CF7",
    flag: "Weights wrong (CT 35 / Geo 20 / Prod 35 / Ch 10) and the 10% transaction factor is absent from the composite — investigation/STR are used only as overrides.",
    steps: [
      "Step 19 — Overall risk score: Customer Type 35% · Geography 20% · Product 35% · Channel 10%",
      "Step 20 — Derive investigation & STR inputs (counts = 0)",
      "Step 21 — Investigation & STR lookups (parallel)",
      "Step 22 — Set investigation & STR outputs (score / override)",
    ],
  },
  {
    no: "07", label: "Overrides · Prohibit · Route", color: "#8489bd",
    flag: "Override set incomplete — missing adverse-media (OVR-009), high-risk country (OVR-011), high-risk NOB (OVR-012), watchlist (OVR-002). Routing bug: Low risk falls to the default → Review instead of Approve.",
    steps: [
      "Step 23 — Evaluate high-risk overrides (PEP, screening partial, investigation, STR)",
      "Step 24 — Evaluate prohibit logic (screening=4 · Prohibited · NOB prohibit · geography prohibited)",
      "Step 25 — Determine final rating, numeric band & decision",
      "Step 26 — Route: prohibit→Decline · High→Review · Medium→Approve · else(default)→Review",
    ],
  },
];

const ONBOARDING_OUTCOMES: { code: string; label: string; pill: string; desc: string }[] = [
  { code: "GA_CRR_Decline", label: "Decline", pill: "bg-hi/15 text-hi",   desc: "Prohibited — sanctions true match or prohibited geography." },
  { code: "GA_CRR_Review",  label: "Review",  pill: "bg-med/15 text-med", desc: "High risk — MLRO / EDD review before approval." },
  { code: "GA_CRR_Approve", label: "Approve", pill: "bg-low/15 text-low", desc: "Medium or low risk — approve with standard monitoring." },
];

function OnboardingWorkflowTab() {
  const [sub, setSub] = useState<"crr" | "inbound" | "txn">("crr");
  const tabCls = (on: boolean) =>
    `px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition mono ${on ? "bg-ai/20 border-ai text-ai" : "border-line text-muted hover:bg-panel2"}`;
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={() => setSub("crr")} className={tabCls(sub === "crr")}>
          global_accounts_zenus_onboarding_v02
        </button>
        <button type="button" onClick={() => setSub("inbound")} className={tabCls(sub === "inbound")}>
          global_accounts_inbound_screening
        </button>
        <button type="button" onClick={() => setSub("txn")} className={tabCls(sub === "txn")}>
          global_accounts_transaction_screening
        </button>
      </div>
      {sub === "crr" && <OnboardingCrrTab />}
      {sub === "inbound" && <InboundScreeningTab />}
      {sub === "txn" && <TransactionScreeningTab />}
    </div>
  );
}

function OnboardingCrrTab() {
  const divergent = ONBOARDING_PHASES.filter((p) => p.flag).length;
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <AgentAiTag agent="sayed">Onboarding CRR · Zenus</AgentAiTag>
          <span className="pill bg-med/15 text-med text-[10px]">as-is · pending remediation</span>
          <span className="pill bg-panel2 text-muted text-[10px]">{divergent} CRAM gaps → see v04</span>
        </div>
        <p className="text-[12px] text-muted mt-2 mb-0">
          <b className="text-ink mono">global_accounts_zenus_onboarding_v02</b> is the workflow currently deployed in Oscilar
          at account opening — the 26 steps below, grouped into seven phases. It follows the correct entry / screening /
          scoring skeleton, but scores the composite on the UAE model. Phases flagged <span className="text-med">⚠</span>
          diverge from CRAM global-account (US) methodology; the corrected logic is in the{" "}
          <b className="text-ink mono">global_accounts_inbound_screening</b> (v04) tab.
        </p>
      </Card>
      <div className="space-y-2">
        {ONBOARDING_PHASES.map((p) => (
          <Card key={p.no} className="p-4 flex gap-4 items-start">
            <div
              className="w-10 h-10 rounded-full grid place-items-center mono text-sm font-bold shrink-0"
              style={{ background: `${p.color}22`, border: `1px solid ${p.color}`, color: p.color }}
            >
              {p.no}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="m-0 text-sm font-display">{p.label}</h3>
              <ul className="text-[12px] text-muted mt-1.5 mb-0 pl-4 space-y-1">
                {p.steps.map((s) => <li key={s}>{s}</li>)}
              </ul>
              {p.flag && (
                <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-med/30 bg-med/10 px-2.5 py-1.5">
                  <span className="text-med text-[11px] leading-none mt-0.5">⚠</span>
                  <span className="text-[11px] text-med">{p.flag}</span>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
      <Card className="p-4">
        <div className="text-[11px] text-faint uppercase tracking-wide mb-2">Terminal outcomes</div>
        <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-1">
          {ONBOARDING_OUTCOMES.map((o) => (
            <div key={o.code} className="p-3 rounded-lg bg-panel2 border border-lineSoft">
              <div className="flex items-center gap-2">
                <span className={`pill text-[10px] ${o.pill}`}>{o.label}</span>
                <span className="mono text-[10px] text-muted truncate">{o.code}</span>
              </div>
              <p className="text-[11px] text-muted mt-1.5 mb-0">{o.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

const V04_WEIGHTS: { profile: string; ct: string; geo: string; prod: string; svc: string; ch: string; txn: string; hot?: boolean }[] = [
  { profile: "np_new · individual, new",  ct: "0.25", geo: "0.25", prod: "0.12", svc: "0.08", ch: "0.20", txn: "0.10", hot: true },
  { profile: "np_existing",               ct: "0.20", geo: "0.20", prod: "0.09", svc: "0.06", ch: "0.15", txn: "0.30" },
  { profile: "lp_new · SME/corp, new",    ct: "0.25", geo: "0.20", prod: "0.12", svc: "0.08", ch: "0.15", txn: "0.20", hot: true },
  { profile: "lp_existing",               ct: "0.20", geo: "0.15", prod: "0.09", svc: "0.06", ch: "0.10", txn: "0.40" },
];

const V04_PEP: { cls: string; pill: string; result: string }[] = [
  { cls: "None",                                   pill: "bg-panel2 text-muted", result: "No floor" },
  { cls: "Foreign",                                pill: "bg-hi/15 text-hi",     result: "High floor · OVR-008 · EDD mandatory · SAR review · eddRequired" },
  { cls: "Domestic / IO · band ≠ Low or x-border", pill: "bg-med/15 text-med",   result: "Medium floor · OVR-016 · EDD · eddRequired" },
  { cls: "Domestic / IO · otherwise",              pill: "bg-panel2 text-muted", result: "Identify gate — no floor, EDD tag (enhanced monitoring)" },
];

const V04_OVERRIDES: { cls: string; style: CSSProperties; items: string[] }[] = [
  { cls: "Prohibited", style: { background: "rgba(255,92,119,.15)", color: "#FF5C77" }, items: [
    "OVR-001 · sanctions / TFS true match",
    "OVR-002 · internal watchlist true match",
    "OVR-002 · Category-A country nexus (geoFirmMax ≥ 4)",
    "OVR-002 · prohibited nature of business",
    "OVR-006 · prohibited entity legal type (entities)",
  ] },
  { cls: "High", style: { background: "rgba(255,138,61,.15)", color: "#FF8A3D" }, items: [
    "OVR-008 · Foreign PEP",
    "OVR-009 · material adverse-media true match",
    "OVR-011 · high-risk country (firmToScore(geoFirmMax) = 3)",
    "OVR-012 · high-risk nature of business (nobScore ≥ 3)",
    "OVR-004 · UBO refused / incomplete (entities)",
    "OVR-NPO · NPO entity — EDD + HoC approval",
    "OVR-010 · STR/SAR filed (existing customers only)",
    "OVR-020 · expected-vs-actual behaviour override",
  ] },
  { cls: "Medium", style: { background: "rgba(246,166,35,.15)", color: "#F6A623" }, items: [
    "OVR-016 · domestic/IO PEP, high-risk relationship",
    "HOLD · potential sanctions match (4h hold)",
  ] },
];

function V04Code({ children }: { children: ReactNode }) {
  return (
    <pre className="bg-panel2 border border-lineSoft rounded-lg p-3 text-[11px] mono text-muted overflow-x-auto whitespace-pre-wrap m-0">
      {children}
    </pre>
  );
}

function InboundScreeningTab() {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <AgentAiTag agent="sayed">CRAM-correct · v04</AgentAiTag>
          <span className="pill bg-low/15 text-low text-[10px]">supersedes v02 / v03</span>
        </div>
        <p className="text-[12px] text-muted mt-2 mb-0">
          <b className="text-ink mono">global_accounts_inbound_screening</b> is the CRAM-correct inbound onboarding
          workflow for the Global Account (US / Zenus) perimeter — a six-factor weighted composite, a PEP zero-weight
          gate, and non-dilutive override floors. Every constant below is taken directly from the live scoring engine
          (CRAM US §3.1 · §5.1 · §7.1 · §12.6).
        </p>
      </Card>

      <Card className="p-4">
        <div className="text-[11px] text-faint uppercase tracking-wide mb-2">Factor weights — US, by profile (sum = 1.0000)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] mono">
            <thead>
              <tr className="text-faint text-[10px] uppercase">
                <th className="text-left font-semibold p-2">Profile</th>
                <th className="text-right font-semibold p-2">CustType</th>
                <th className="text-right font-semibold p-2">Geo</th>
                <th className="text-right font-semibold p-2">Product</th>
                <th className="text-right font-semibold p-2">Service</th>
                <th className="text-right font-semibold p-2">Channel</th>
                <th className="text-right font-semibold p-2">Txn</th>
              </tr>
            </thead>
            <tbody>
              {V04_WEIGHTS.map((w) => (
                <tr key={w.profile} className={`border-t border-lineSoft ${w.hot ? "bg-ai/5" : ""}`}>
                  <td className="p-2 text-ink">{w.profile}</td>
                  <td className="p-2 text-right tabular-nums">{w.ct}</td>
                  <td className="p-2 text-right tabular-nums">{w.geo}</td>
                  <td className="p-2 text-right tabular-nums">{w.prod}</td>
                  <td className="p-2 text-right tabular-nums">{w.svc}</td>
                  <td className="p-2 text-right tabular-nums">{w.ch}</td>
                  <td className="p-2 text-right tabular-nums">{w.txn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-faint mt-2 mb-0">PEP weight = 0.00 in every profile — resolved as a gate, never a factor. Zenus retail onboarding = np_new.</p>
      </Card>

      <Card className="p-4">
        <div className="text-[11px] text-faint uppercase tracking-wide mb-2">Composite & geography</div>
        <V04Code>{`composite =  customerType × 0.25
           + geography    × 0.25   // US funds-flow: firmToScore(max(SoW, SoF[, opco]))
           + max(product, service) × 0.20   // worst-of
           + max(initiation, delivery) × 0.20   // worst-of, NOT 50/50 avg
           + transaction  × 0.10   // max(actualBand, investigations, STRs, behaviour)
// PEP = 0.00 — gate only, resolved after composite
mathBand = Low ≤1.5 · Medium ≤2.15 · High >2.15`}</V04Code>
        <p className="text-[11px] text-muted mt-2 mb-0">
          <b className="text-ink">Geography is US §7.1 funds-flow only</b> — source-of-wealth / source-of-funds (+ operating
          jurisdiction for entities). Residence, nationality and country of birth are <b>not</b> scored; they feed the
          sanctions / high-country overrides only. Customer-type sub-weights (individual): employment 0.146 · profession 0.220 ·
          nature-of-business 0.220 · segment 0.146 · expected-activity 0.098 · UBO 0.171.
        </p>
      </Card>

      <Card className="p-4">
        <div className="text-[11px] text-faint uppercase tracking-wide mb-2">PEP gate — zero-weight, after composite (FinCEN CDD Rule · 31 CFR 1010.520)</div>
        <div className="space-y-1.5">
          {V04_PEP.map((p) => (
            <div key={p.cls} className="flex items-start gap-2 p-2 rounded-lg bg-panel2 border border-lineSoft">
              <span className={`pill text-[10px] shrink-0 ${p.pill}`}>{p.cls}</span>
              <span className="text-[11px] text-muted">{p.result}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-[11px] text-faint uppercase tracking-wide mb-2">Override floors — non-dilutive, most-restrictive-wins</div>
        <div className="grid grid-cols-3 gap-2 max-md:grid-cols-1">
          {V04_OVERRIDES.map((o) => (
            <div key={o.cls} className="p-3 rounded-lg bg-panel2 border border-lineSoft">
              <span className="pill text-[10px] font-bold" style={o.style}>{o.cls}</span>
              <ul className="text-[10.5px] text-muted mt-2 mb-0 pl-3.5 space-y-1 mono">
                {o.items.map((it) => <li key={it}>{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <V04Code>{`floor = PROHIBITED > HIGH > MEDIUM > none
finalRating = floor==PROHIBITED ? "Prohibited"
                                : max(floorBand, mathBand)   // floor never replaces a higher band`}</V04Code>
      </Card>

      <Card className="p-4">
        <div className="text-[11px] text-faint uppercase tracking-wide mb-2">Routing — final decision (Low no longer misrouted)</div>
        <V04Code>{`if finalRating == "Prohibited"     → GA_CRR_Decline   (terminal)
elif finalRating == "High Risk"    → GA_CRR_Review    (terminal · MLRO / EDD)
elif finalRating in ("Medium","Low"):
        if eddRequired             → GA_CRR_Review    (terminal · mandatory EDD)
        else                       → GA_CRR_Approve   (terminal)`}</V04Code>
        <p className="text-[11px] text-muted mt-2 mb-0">
          v02 sent Low risk into the default → Review while Medium auto-approved; v04 approves Low and Medium, routes High
          to Review, declines Prohibited. The <span className="mono">eddRequired → Review</span> branch conditions approval
          on EDD for any PEP / floor case — the instant-onboarding-with-mandatory-EDD-tag pattern.
        </p>
      </Card>
    </div>
  );
}

// global_accounts_transaction_screening — CRAM/Oscilar-correct TARGET (replaces the approve-all stub).
const TXN_SCREEN_PHASES: { no: string; label: string; color: string; steps: string[] }[] = [
  {
    no: "01", label: "Ingest & normalise payment", color: "#39B9ED",
    steps: [
      "Payload: customerId · amount · currency · corridor (origin → destination) · direction (money-in / money-out) · channel (C2C/C2B/B2C/B2B/Mal2Mal) · counterparty (name, account, BIC) · beneficiary / MCC · purpose code · device / IP · timestamp",
      "Pull the customer's current CRR band and any mandatory-EDD tags",
    ],
  },
  {
    no: "02", label: "Real-time list screening — Vital4", color: "#2FD8A6",
    steps: [
      "Screen counterparty (and originator, if inbound) against sanctions · PEP · watchlist · adverse media",
      "Set list_hit and match tier (potential / true match) — Vital4 is the sole screening authority",
    ],
  },
  {
    no: "03", label: "Rule library + ML — 10 categories", color: "#F6A623",
    steps: [
      "Evaluate: structuring & smurfing · layering & pass-through · velocity & volume · cross-border / corridor · sanctions & TF evasion · card & merchant fraud · mule & funnel · dormancy & profile deviation · crypto / VA off-ramp · PEP & enhanced monitoring",
      "Compute alert_score (rules + anomaly models)",
      "EDD-tag rule: mandatory-EDD customer with money-in / money-out → force Step-up / Review",
    ],
  },
  {
    no: "04", label: "Decision — Allow / Step-up / Hold / Block", color: "#A953DF",
    steps: [
      "Block: sanctions / TFS true match, or prohibited corridor / counterparty",
      "Hold: potential sanctions match (pending Vital4, 4h SLA) or Critical typology alert",
      "Step-up: medium-risk anomaly → auth challenge / source-of-funds evidence before settlement",
      "Allow: clean list result and alert_score below threshold",
    ],
  },
  {
    no: "05", label: "List-hit mirror — Vital4", color: "#7C6CF7",
    steps: [
      "Any list signal → create Vital4 case via mirror API",
      "Link oscilarAlertId ↔ vital4CaseId in case_links — Oscilar txn screening never writes CRAM fields",
    ],
  },
  {
    no: "06", label: "Settlement gate", color: "#FF8A3D",
    steps: [
      "Settle only if decision = Allow AND no pending Vital4 true-match hold",
      "Otherwise hold or reject; step-up must clear before settlement",
    ],
  },
  {
    no: "07", label: "Post-transaction monitoring", color: "#2FD8A6",
    steps: [
      "Rolling windows re-evaluate velocity, pass-through and corridor drift",
      "Batch TM alerts feed the same case queue",
    ],
  },
  {
    no: "08", label: "CRAM feed & investigation", color: "#8489bd",
    steps: [
      "High / Critical alert → POST /api/v1/crr/events (transaction-monitoring) → reRate() → OVR-020 / OVR-010 as applicable",
      "Mohsen prepares the case (6-step pipeline); disposition syncs bi-directionally with Oscilar → Close | Escalate | SAR",
    ],
  },
];

const TXN_DECISIONS: { label: string; style: CSSProperties; when: string }[] = [
  { label: "Block",   style: { background: "rgba(255,92,119,.15)", color: "#FF5C77" }, when: "Sanctions / TFS true match · prohibited corridor or counterparty" },
  { label: "Hold",    style: { background: "rgba(246,166,35,.15)", color: "#F6A623" }, when: "Potential sanctions match (pending Vital4, 4h) · Critical typology alert" },
  { label: "Step-up", style: { background: "rgba(169,83,223,.16)", color: "#C08CF0" }, when: "Medium anomaly · mandatory-EDD money-in/out → challenge / SoF before settle" },
  { label: "Allow",   style: { background: "rgba(47,216,166,.15)", color: "#2FD8A6" }, when: "Clean list result · alert_score below threshold" },
];

const TXN_OUTCOMES: { code: string; label: string; pill: string; desc: string }[] = [
  { code: "TS_Block",   label: "Block",   pill: "bg-hi/15 text-hi",   desc: "Payment blocked — true match / prohibited. No settlement." },
  { code: "TS_Hold",    label: "Hold",    pill: "bg-med/15 text-med", desc: "Held pending Vital4 disposition or MLRO review." },
  { code: "TS_Allow",   label: "Allow",   pill: "bg-low/15 text-low", desc: "Cleared to settlement gate; monitored post-settlement." },
];

function TransactionScreeningTab() {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <AgentAiTag agent="mohsen">Transaction screening · target</AgentAiTag>
          <span className="pill bg-low/15 text-low text-[10px]">CRAM/Oscilar-correct</span>
          <span className="pill bg-hi/15 text-hi text-[10px]">replaces approve-all stub</span>
        </div>
        <p className="text-[12px] text-muted mt-2 mb-0">
          The currently deployed <b className="text-ink mono">global_accounts_transaction_screening</b> approves on
          <span className="mono"> transaction_amount &gt; 0</span> and performs no list screening — an approve-all
          pass-through. This is the CRAM/Oscilar-correct target: real-time Vital4 list screening, the ten-category rule
          library, an Allow / Step-up / Hold / Block decision, a settlement gate behind any Vital4 true-match hold,
          post-transaction monitoring, and the CRAM re-rating feed.
        </p>
      </Card>

      <div className="space-y-2">
        {TXN_SCREEN_PHASES.map((p) => (
          <Card key={p.no} className="p-4 flex gap-4 items-start">
            <div
              className="w-10 h-10 rounded-full grid place-items-center mono text-sm font-bold shrink-0"
              style={{ background: `${p.color}22`, border: `1px solid ${p.color}`, color: p.color }}
            >
              {p.no}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="m-0 text-sm font-display">{p.label}</h3>
              <ul className="text-[12px] text-muted mt-1.5 mb-0 pl-4 space-y-1">
                {p.steps.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="text-[11px] text-faint uppercase tracking-wide mb-2">Decision taxonomy</div>
        <div className="space-y-1.5">
          {TXN_DECISIONS.map((d) => (
            <div key={d.label} className="flex items-start gap-2 p-2 rounded-lg bg-panel2 border border-lineSoft">
              <span className="pill text-[10px] font-bold shrink-0" style={d.style}>{d.label}</span>
              <span className="text-[11px] text-muted">{d.when}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-[11px] text-faint uppercase tracking-wide mb-2">Terminal outcomes</div>
        <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-1">
          {TXN_OUTCOMES.map((o) => (
            <div key={o.code} className="p-3 rounded-lg bg-panel2 border border-lineSoft">
              <div className="flex items-center gap-2">
                <span className={`pill text-[10px] ${o.pill}`}>{o.label}</span>
                <span className="mono text-[10px] text-muted truncate">{o.code}</span>
              </div>
              <p className="text-[11px] text-muted mt-1.5 mb-0">{o.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-faint mt-2 mb-0">
          Authority: Vital4 sole writer for sanctions / PEP / adverse / watchlist. Oscilar decisions mirror list hits to
          Vital4 and never write CRAM fields. SLAs — sanctions true match: immediate · potential match: 4h · TM Critical: immediate.
        </p>
      </Card>
    </div>
  );
}

// ─── Scenario playbook: Foreign-PEP / RCA client on the Zenus corridor ───────────────
const SCENARIO_COUNTRIES =
  "Egypt · Pakistan · Turkey · Singapore · Bangladesh · India · Philippines · UAE · Jordan · UK · Morocco · other Middle-East high-risk";

const SCENARIO_MATRIX: { profile: string; geo: string; floor: string; rating: string; onboarding: string; txn: string; pill: string }[] = [
  { profile: "Clean · non-PEP",        geo: "Low–Medium", floor: "none",           rating: "Low / Medium", onboarding: "Approve + monitor",       txn: "Allow (screened)",          pill: "bg-low/15 text-low" },
  { profile: "Foreign PEP",            geo: "Low–Medium", floor: "OVR-008 High",   rating: "High",         onboarding: "Review · EDD · eddRequired", txn: "Step-up / Review each txn", pill: "bg-hi/15 text-hi" },
  { profile: "RCA of Foreign PEP *",   geo: "Low–Medium", floor: "OVR-008 High",   rating: "High",         onboarding: "Review · EDD · eddRequired", txn: "Step-up / Review each txn", pill: "bg-hi/15 text-hi" },
  { profile: "IO PEP",                 geo: "Low–Medium", floor: "OVR-016 Medium", rating: "Medium",       onboarding: "Approve + EDD",          txn: "Enhanced monitoring",       pill: "bg-med/15 text-med" },
];

const SCENARIO_WORKFLOWS: {
  key: string; label: string; intro: string; phases: { no: string; label: string; color: string; steps: string[] }[];
}[] = [
  {
    key: "onboarding",
    label: "global_accounts_zenus_onboarding",
    intro: "Customer risk-rating at account opening. Geography is funds-flow (nationality/residence not scored); the Foreign-PEP / RCA gate is what elevates the rating.",
    phases: [
      { no: "01", label: "Capture", color: "#39B9ED", steps: [
        "Residence / nationality recorded for the file — NOT scored (US §7.1)",
        "Source-of-wealth country + source-of-funds country (funds from Zenus → SoF = US)",
        "PEP relationship: self / relative / close associate + the principal PEP's tier",
      ] },
      { no: "02", label: "Screening — Vital4", color: "#2FD8A6", steps: [
        "Sanctions · PEP · adverse media · watchlist on the customer",
        "For an RCA, also screen and record the principal PEP",
      ] },
      { no: "03", label: "Geography — funds-flow", color: "#F6A623", steps: [
        "geographyScore = firmToScore(max(SoW, SoF))",
        "Zenus (US) = Low; home country still counts — Egypt 1.75 / Turkey 1.65 → Medium, the rest → Low",
        "None of these reach High and none are FATF/OFAC-listed → no OVR-011 / OVR-002",
      ] },
      { no: "04", label: "PEP / RCA gate", color: "#A953DF", steps: [
        "Self Foreign PEP OR relative/associate of a Foreign PEP → treat as Foreign → OVR-008 HIGH + eddRequired + SAR review",
        "IO PEP → OVR-016 MEDIUM floor",
        "None → no floor, rating from the composite band",
        "Anti-tipping-off: never use the word 'PEP' to the customer — frame every request as routine verification (Self-Transfer & C2C Pack §1.3)",
      ] },
      { no: "05", label: "Composite + overrides", color: "#7C6CF7", steps: [
        "Six-factor composite (CT 0.25 · Geo 0.25 · P&S 0.20 · Ch 0.20 · Txn 0.10); PEP = 0 weight",
        "finalRating = max(floorBand, mathBand) — non-dilutive",
      ] },
      { no: "06", label: "Route", color: "#8489bd", steps: [
        "Prohibited → GA_CRR_Decline · High → GA_CRR_Review (EDD) · Medium/Low → GA_CRR_Approve",
        "eddRequired → route to Review even at Medium/Low (mandatory-EDD tag set for downstream money-in/out)",
      ] },
    ],
  },
  {
    key: "inbound",
    label: "global_accounts_inbound_screening",
    intro: "Money-in on the US (Zenus) → client-country corridor. Screens the payer and enforces the mandatory-EDD tag set at onboarding.",
    phases: [
      { no: "01", label: "Ingest", color: "#39B9ED", steps: [
        "Corridor: US (Zenus) → client country · originator (payer) · amount · purpose code",
        "Pull the customer's CRR band and mandatory-EDD tag",
      ] },
      { no: "02", label: "List screening — Vital4", color: "#2FD8A6", steps: [
        "Screen originator and customer against sanctions / PEP / watchlist / adverse",
        "Set list_hit + match tier",
      ] },
      { no: "03", label: "Rules + ML", color: "#F6A623", steps: [
        "Structuring · pass-through · velocity · corridor concentration",
        "PEP & enhanced-monitoring category always on for a Foreign-PEP / RCA customer",
      ] },
      { no: "04", label: "EDD-tag decision", color: "#A953DF", steps: [
        "Mandatory-EDD (Foreign-PEP / RCA) → force Step-up / Review on the credit",
        "Else Allow / Hold / Block by list result + alert_score",
      ] },
      { no: "05", label: "Mirror + settlement gate", color: "#7C6CF7", steps: [
        "List hit → Vital4 mirror (oscilarAlertId ↔ vital4CaseId); Oscilar never writes CRAM",
        "Post only if Allow AND no pending Vital4 true-match hold",
      ] },
      { no: "06", label: "CRAM feed", color: "#8489bd", steps: [
        "High / Critical → reRate() → OVR-020 / OVR-010; case to Mohsen",
      ] },
    ],
  },
  {
    key: "outbound",
    label: "global_accounts_outbound_screening",
    intro: "Money-out from the client account. Screens the beneficiary and applies the mandatory-EDD tag + destination-corridor risk (this is where FATF/OFAC bite, on the beneficiary jurisdiction).",
    phases: [
      { no: "01", label: "Ingest", color: "#39B9ED", steps: [
        "Corridor: client country → destination · beneficiary (name, account, BIC) · amount · purpose code",
        "Pull the customer's CRR band and mandatory-EDD tag",
      ] },
      { no: "02", label: "List screening — Vital4", color: "#2FD8A6", steps: [
        "Screen beneficiary and customer against sanctions / PEP / watchlist / adverse",
      ] },
      { no: "03", label: "Rules + ML", color: "#F6A623", steps: [
        "Destination-corridor risk: beneficiary jurisdiction on FATF grey/black or OFAC/UN → floor / Block",
        "Funnel · pass-through · rapid out-flow after a Zenus credit",
      ] },
      { no: "04", label: "EDD-tag decision", color: "#A953DF", steps: [
        "Mandatory-EDD (Foreign-PEP / RCA) → force Step-up / Review; require source-of-funds evidence before release",
        "Beneficiary in FATF-black / OFAC → Block; potential match → Hold (4h)",
      ] },
      { no: "05", label: "Mirror + settlement gate", color: "#7C6CF7", steps: [
        "List hit → Vital4 mirror; release only if Allow AND no pending true-match hold",
      ] },
      { no: "06", label: "CRAM feed", color: "#8489bd", steps: [
        "High / Critical → reRate() → OVR-020 / OVR-010; case to Mohsen",
      ] },
    ],
  },
  {
    key: "transaction",
    label: "global_accounts_transaction_screening",
    intro: "Applies to both directions. Same target as the general transaction-screening workflow, with the archetype rules always on.",
    phases: [
      { no: "01", label: "Both directions", color: "#39B9ED", steps: [
        "Every money-in and money-out runs the full Allow / Step-up / Hold / Block flow",
      ] },
      { no: "02", label: "EDD-tag rule", color: "#A953DF", steps: [
        "Foreign-PEP / RCA mandatory-EDD tag → force Step-up / Review on any transaction",
        "PEP & enhanced-monitoring rule category evaluated on every event",
      ] },
      { no: "03", label: "Settlement + feed", color: "#8489bd", steps: [
        "Settlement gate behind any Vital4 true-match hold; High/Critical → reRate()",
        "See the global_accounts_transaction_screening tab in card 15 for the full 8-phase flow",
      ] },
    ],
  },
];

function ScenarioPlaybookTab() {
  const [wf, setWf] = useState<string>("onboarding");
  const active = SCENARIO_WORKFLOWS.find((w) => w.key === wf) ?? SCENARIO_WORKFLOWS[0];
  const tabCls = (on: boolean) =>
    `px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition mono ${on ? "bg-ai/20 border-ai text-ai" : "border-line text-muted hover:bg-panel2"}`;
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <AgentAiTag agent="sayed">Scenario · Foreign-PEP / RCA</AgentAiTag>
          <span className="pill bg-panel2 text-muted text-[10px]">Zenus corridor</span>
          <span className="pill bg-low/15 text-low text-[10px]">CRAM-correct</span>
        </div>
        <p className="text-[12px] text-muted mt-2 mb-0">
          Client resident in <b className="text-ink">{SCENARIO_COUNTRIES}</b>, with funds arriving from Zenus.
          Under US §7.1 their nationality / residence is <b className="text-ink">not scored</b> — geography is funds-flow,
          so the corridor sits Low–Medium and none of these jurisdictions trip a FATF/OFAC floor. The risk driver is the
          <b className="text-ink"> Foreign-PEP / RCA gate</b>: a PEP, or a close relative / associate of a PEP, floors the
          customer to High (OVR-008), mandates EDD, and forces review on every money-in and money-out.
        </p>
      </Card>

      <Card className="p-4">
        <div className="text-[11px] text-faint uppercase tracking-wide mb-2">Outcome — same client, by PEP profile</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-faint text-[10px] uppercase">
                <th className="text-left font-semibold p-2">Profile</th>
                <th className="text-left font-semibold p-2">Geography</th>
                <th className="text-left font-semibold p-2">Floor</th>
                <th className="text-left font-semibold p-2">Rating</th>
                <th className="text-left font-semibold p-2">Onboarding</th>
                <th className="text-left font-semibold p-2">Money-in/out</th>
              </tr>
            </thead>
            <tbody>
              {SCENARIO_MATRIX.map((r) => (
                <tr key={r.profile} className="border-t border-lineSoft">
                  <td className="p-2"><span className={`pill text-[10px] ${r.pill}`}>{r.profile}</span></td>
                  <td className="p-2 text-muted">{r.geo}</td>
                  <td className="p-2 mono text-muted">{r.floor}</td>
                  <td className="p-2 text-ink">{r.rating}</td>
                  <td className="p-2 text-muted">{r.onboarding}</td>
                  <td className="p-2 text-muted">{r.txn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-faint mt-2 mb-0">* RCA is captured at the principal PEP's tier — a relative / close associate of a Foreign PEP is treated as Foreign. PepStatus has no separate RCA value, so this capture rule must be enforced at onboarding.</p>
      </Card>

      <div className="flex gap-2 flex-wrap">
        {SCENARIO_WORKFLOWS.map((w) => (
          <button key={w.key} type="button" onClick={() => setWf(w.key)} className={tabCls(wf === w.key)}>
            {w.label}
          </button>
        ))}
      </div>

      <Card className="p-4">
        <p className="text-[12px] text-muted m-0">{active.intro}</p>
      </Card>
      <div className="space-y-2">
        {active.phases.map((p) => (
          <Card key={p.no} className="p-4 flex gap-4 items-start">
            <div
              className="w-10 h-10 rounded-full grid place-items-center mono text-sm font-bold shrink-0"
              style={{ background: `${p.color}22`, border: `1px solid ${p.color}`, color: p.color }}
            >
              {p.no}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="m-0 text-sm font-display">{p.label}</h3>
              <ul className="text-[12px] text-muted mt-1.5 mb-0 pl-4 space-y-1">
                {p.steps.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
