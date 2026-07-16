import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, FileText, ChevronDown, ChevronRight, MapPin, AlertTriangle } from "lucide-react";
import { Card, Sec } from "../ui";
import {
  TRANSACTION_PURPOSE_CATALOG,
  CATALOG_GUIDANCE,
  catalogStats,
  CORRIDOR_GUIDANCE,
  COUNTRY_MODULES,
  FLOW_IDS,
  FLOW_LABELS,
  purposeTypologyLinks,
  TYPOLOGY_ANNEX,
  CORRIDOR_CASE_INTEL,
  GA_CORRIDOR_GUIDANCE,
  GA_CORRIDOR_ONWARD_TRAPS,
  GA_SELF_C2C_FLOWS,
  GA_PERIODIC_REVIEW_LENS,
  GA_CORRIDOR_META,
  GA_SELF_C2C_SCENARIOS,
  GA_SELF_C2C_SCENARIOS_META,
  GA_C2B_SCENARIOS,
  GA_C2B_SCENARIOS_META,
  GA_B2C_SCENARIOS,
  GA_B2C_SCENARIOS_META,
  GA_B2B_SCENARIOS,
  GA_B2B_SCENARIOS_META,
  GA_M2M_SCENARIOS,
  GA_M2M_SCENARIOS_META,
  type PurposeFlowId,
  type PurposeCatalogEntry,
} from "../../config/transactionPurposeCatalog";
import { exportTransactionPurposeCatalogPdf } from "../../lib/transactionPurposeCatalogPdf";
import { useCorridorTypologies, type CorridorTypology } from "../../store/corridorTypologyStore";
import { GLOBAL_ACCOUNT_CORRIDORS, CORRIDOR_BY_CODE } from "../../config/globalAccountCorridors";
import { usePerimeter } from "../../context/PerimeterContext";

const TIER_STYLE: Record<string, string> = {
  Low: "bg-low/15 text-low",
  Medium: "bg-med/15 text-med",
  High: "bg-proh/20 text-[#ff7ea0]",
};

export type PanelTab = "overview" | PurposeFlowId | "corridors" | "typologies";

export default function PaymentPurposeGuidancePanel({ defaultTab }: { defaultTab?: PanelTab } = {}) {
  const [tab, setTab] = useState<PanelTab>(defaultTab ?? "overview");
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState("");
  const [expanded, setExpanded] = useState<string | null>("C2C-01");
  const [tierFilter, setTierFilter] = useState<string>("all");

  const stats = catalogStats();

  async function handleDownload() {
    setDownloading(true);
    setMsg("");
    try {
      await exportTransactionPurposeCatalogPdf();
      setMsg("PDF downloaded — full catalog with corridors & typology annex");
    } catch {
      setMsg("PDF export failed — try again in browser");
    } finally {
      setDownloading(false);
    }
  }

  const flowEntries = useMemo(() => {
    if (tab === "overview" || tab === "corridors" || tab === "typologies") return [];
    const flow = TRANSACTION_PURPOSE_CATALOG.flows[tab];
    let list = flow?.entries ?? [];
    if (tierFilter !== "all") list = list.filter((e) => e.risk_tier === tierFilter);
    return list.map((e) => ({ ...e, flowId: tab }));
  }, [tab, tierFilter]);

  return (
    <div className="space-y-4">
      <Card className="p-4 border-ai/30 bg-ai/5">
        <div className="flex flex-wrap gap-4 items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <FileText size={16} className="text-ai" />
              <h3 className="m-0 text-sm font-display">Transaction Purpose Code Catalog</h3>
              <span className="pill bg-panel2 text-muted text-[10px]">{CATALOG_GUIDANCE.documentId}</span>
              <span className="pill bg-low/15 text-low text-[10px]">v{CATALOG_GUIDANCE.version}</span>
            </div>
            <p className="text-[12px] text-muted mt-2 mb-0">
              Official catalog from <b>{CATALOG_GUIDANCE.catalogVersion}</b> — {stats.total} purpose codes across
              C2C, C2B, B2C, B2B, and Mal2Mal flows. Each entry defines <b>acceptable use</b>,{" "}
              <b>misuse indicators</b>, evidence triggers, and TM scenarios for Product &amp; Operations.
              Includes corridor EWRA guidance and country typology annex.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary flex items-center gap-2 shrink-0"
            disabled={downloading}
            onClick={() => void handleDownload()}
          >
            <Download size={14} />
            {downloading ? "Generating PDF…" : "Download full PDF guide"}
          </button>
        </div>
        {msg && <p className="text-[11px] text-low mt-2 mb-0">{msg}</p>}
      </Card>

      <div className="grid grid-cols-5 gap-2 max-md:grid-cols-3">
        {FLOW_IDS.map((id) => (
          <StatCard key={id} label={id} value={String(stats.byFlow[id])} hint={FLOW_LABELS[id]} />
        ))}
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {([
          ["overview", "Overview & rules"],
          ...FLOW_IDS.map((id) => [id, id] as const),
          ["corridors", "Corridor guidance"],
          ["typologies", "Country typologies"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id as PanelTab)}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition ${
              tab === id ? "bg-ai/20 border-ai text-ink" : "border-line text-muted hover:bg-panel2"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab stats={stats} />}
      {tab === "C2C" && (
        <GaScenarioAccordion
          jurisdictions={GA_SELF_C2C_SCENARIOS as unknown as ScenarioJurisdiction[]}
          meta={GA_SELF_C2C_SCENARIOS_META}
          title="Self-transfer & C2C scenarios"
          flowLabel="Flow & product use case"
        />
      )}
      {tab === "C2B" && (
        <GaScenarioAccordion
          jurisdictions={GA_C2B_SCENARIOS as unknown as ScenarioJurisdiction[]}
          meta={GA_C2B_SCENARIOS_META}
          title="Individual → Business (C2B) scenarios"
          flowLabel="C2B purpose & beneficiary business"
        />
      )}
      {tab === "B2C" && (
        <GaScenarioAccordion
          jurisdictions={GA_B2C_SCENARIOS as unknown as ScenarioJurisdiction[]}
          meta={GA_B2C_SCENARIOS_META}
          title="Business → Individual (B2C) scenarios"
          flowLabel="B2C payout type & individual payee"
        />
      )}
      {tab === "B2B" && (
        <GaScenarioAccordion
          jurisdictions={GA_B2B_SCENARIOS as unknown as ScenarioJurisdiction[]}
          meta={GA_B2B_SCENARIOS_META}
          title="Business → Business (B2B) scenarios"
          flowLabel="B2B purpose & counterparty business"
        />
      )}
      {tab === "Mal2Mal" && (
        <GaScenarioAccordion
          jurisdictions={GA_M2M_SCENARIOS as unknown as ScenarioJurisdiction[]}
          meta={GA_M2M_SCENARIOS_META}
          title="Mal-to-Mal (on-us) scenarios"
          flowLabel="On-us purpose & linkage type"
        />
      )}
      {FLOW_IDS.includes(tab as PurposeFlowId) && (
        <FlowTab
          flowId={tab as PurposeFlowId}
          entries={flowEntries}
          tierFilter={tierFilter}
          setTierFilter={setTierFilter}
          expanded={expanded}
          setExpanded={setExpanded}
        />
      )}
      {tab === "corridors" && <CorridorsTab />}
      {tab === "typologies" && <TypologiesTab />}
    </div>
  );
}

interface ScenarioRecord {
  id: string; title: string; ratingBand: string; profile: string; segment: string; geography: string;
  flow: string; corridor: string; screening: string; rating: string; documents: string;
  expectedActivity: string; behaviourWatch: string; sarPosture?: string; outcome: string; oscilar: string[];
}
interface ScenarioJurisdiction { code: string; name: string; corridorRating: string; edd: string; scenarios: ScenarioRecord[]; }

/**
 * Reusable Global-Account scenario walk-through, surfaced inside a flow card (C2C #08 / C2B #09)
 * above the purpose codes. Grouped by residence jurisdiction; each card collapsible with the full
 * attribute model. Global Account only; guidance only.
 */
function GaScenarioAccordion({ jurisdictions, meta, title, flowLabel }: {
  jurisdictions: ScenarioJurisdiction[];
  meta: { count: number; note: string; source: string };
  title: string;
  flowLabel: string;
}) {
  const { perimeter } = usePerimeter();
  const [open, setOpen] = useState<string | null>(null);
  if (perimeter !== "global_account") return null;
  return (
    <div className="space-y-4 mb-4">
      <Card className="p-4 border-ai/30 bg-ai/5">
        <Sec>{title} — {meta.count} cases</Sec>
        <p className="text-[11px] text-muted mt-1 mb-0">
          {meta.note} <span className="text-faint">{meta.source}</span>
        </p>
      </Card>
      {jurisdictions.map((j) => (
        <div key={j.code}>
          <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#6E72A6] mb-1.5 mt-1">
            {j.name} — corridor {j.corridorRating} · EDD {j.edd} · {j.scenarios.length} scenario(s)
          </div>
          <div className="space-y-2">
            {j.scenarios.map((s) => {
              const isOpen = open === s.id;
              return (
                <Card key={s.id} className="p-0 overflow-hidden">
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 flex items-center gap-2 flex-wrap hover:bg-panel2/50"
                    onClick={() => setOpen(isOpen ? null : s.id)}
                  >
                    {isOpen ? <ChevronDown size={14} className="text-faint shrink-0" /> : <ChevronRight size={14} className="text-faint shrink-0" />}
                    <span className="mono text-[10px] text-ai shrink-0">{s.id}</span>
                    <span className="text-[12px] font-semibold min-w-0">{s.title}</span>
                    <span className={`pill text-[10px] ml-auto ${GA_RATING_STYLE[s.ratingBand] ?? "bg-panel2 text-muted"}`}>{s.ratingBand}</span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 border-t border-lineSoft grid grid-cols-2 gap-x-4 gap-y-2 max-md:grid-cols-1 text-[11px]">
                      <ScenAttr label="Profile" value={s.profile} />
                      <ScenAttr label="Segment / employment" value={s.segment} />
                      <ScenAttr label="Geography (residence · nationality · SoW/SoF)" value={s.geography} />
                      <ScenAttr label={flowLabel} value={s.flow} />
                      <ScenAttr label="Corridor risk" value={s.corridor} />
                      <ScenAttr label="Screening (PEP · sanctions · watchlist · adverse)" value={s.screening} />
                      <ScenAttr label="Rating" value={s.rating} />
                      <ScenAttr label="Documents the AI pulls" value={s.documents} />
                      <ScenAttr label="Expected activity (declared baseline)" value={s.expectedActivity} />
                      <ScenAttr label="Transaction-behaviour watch (periodic review)" value={s.behaviourWatch} />
                      {"sarPosture" in s && (s as { sarPosture?: string }).sarPosture ? <ScenAttr label="Investigation / SAR-STR posture" value={(s as { sarPosture: string }).sarPosture} /> : null}
                      <ScenAttr label="Outcome" value={s.outcome} highlight />
                      <div className="col-span-2 max-md:col-span-1">
                        <span className="text-faint uppercase text-[9px]">Oscilar / typology: </span>
                        <span className="mono text-[10px] text-muted">{s.oscilar.join(", ")}</span>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      ))}
      <div className="border-t border-lineSoft my-1" />
      <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#6E72A6]">Purpose codes</div>
    </div>
  );
}

function ScenAttr({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={highlight ? "col-span-2 max-md:col-span-1 p-2 rounded bg-panel2 border border-lineSoft" : ""}>
      <span className="text-faint uppercase text-[9px]">{label}: </span>
      <span className={highlight ? "text-ink" : "text-muted"}>{value}</span>
    </div>
  );
}

function OverviewTab({ stats }: { stats: ReturnType<typeof catalogStats> }) {
  const readme = TRANSACTION_PURPOSE_CATALOG.readme;
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <Sec>For Product &amp; Operations — how to use this catalog</Sec>
        <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1 mt-3">
          <div className="p-3 rounded-lg border border-lineSoft bg-panel2">
            <div className="text-[11px] font-semibold text-ink mb-2">Developer rules</div>
            <ul className="text-[11px] text-muted m-0 pl-4 space-y-1">
              {readme.filter((l) => l.match(/^\d\./)).slice(0, 6).map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
          <div className="p-3 rounded-lg border border-lineSoft bg-panel2">
            <div className="text-[11px] font-semibold text-ink mb-2">Risk tier distribution</div>
            <div className="flex gap-3 text-[12px]">
              <span className="text-low"><b>{stats.byTier.Low}</b> Low</span>
              <span className="text-med"><b>{stats.byTier.Medium}</b> Medium</span>
              <span className="text-proh"><b>{stats.byTier.High}</b> High</span>
            </div>
            <p className="text-[10px] text-faint mt-2 mb-0">
              Risk tier drives evidence prompts, TM thresholds, and review routing — calibrated per CRA band.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <Sec>Compliance &amp; TM usage</Sec>
        <ul className="text-[11px] text-muted mt-2 pl-4 space-y-1.5">
          {readme.filter((l) => l.match(/^[a-c]\./)).map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p className="text-[10px] text-faint mt-3 mb-0">
          CBUAE POP mappings are indicative — validate against latest UAEFTS / IPP list before production freeze.
        </p>
      </Card>

      <Card className="p-4 flex flex-wrap gap-3 items-center">
        <span className="text-[11px] text-muted">Related:</span>
        <Link to="/regulatory-management" state={{ tab: "corridors", corridorView: "riskLibrary" }} className="text-[11px] text-ai hover:underline">
          Regulatory Management → Corridor EWRA → PK typology library
        </Link>
        <Link to="/transaction-monitoring" className="text-[11px] text-ai hover:underline" onClick={(e) => e.preventDefault()}>
          TM rule library (Oscilar tab)
        </Link>
      </Card>
    </div>
  );
}

function FlowTab({
  flowId,
  entries,
  tierFilter,
  setTierFilter,
  expanded,
  setExpanded,
}: {
  flowId: PurposeFlowId;
  entries: (PurposeCatalogEntry & { flowId: PurposeFlowId })[];
  tierFilter: string;
  setTierFilter: (v: string) => void;
  expanded: string | null;
  setExpanded: (v: string | null) => void;
}) {
  const flow = TRANSACTION_PURPOSE_CATALOG.flows[flowId];
  return (
    <div className="space-y-3">
      <Card className="p-4">
        <h3 className="m-0 text-sm font-display">{flow.title}</h3>
        <p className="text-[11px] text-muted mt-1 mb-0">{flow.subtitle}</p>
        <div className="flex gap-2 mt-3 flex-wrap">
          {["all", "Low", "Medium", "High"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTierFilter(t)}
              className={`px-2 py-1 rounded text-[10px] font-semibold border ${
                tierFilter === t ? "bg-ai/20 border-ai" : "border-line text-muted"
              }`}
            >
              {t === "all" ? "All tiers" : t}
            </button>
          ))}
        </div>
      </Card>

      {entries.map((e) => (
        <PurposeCard
          key={e.purpose_code}
          entry={e}
          flowId={flowId}
          open={expanded === e.purpose_code}
          onToggle={() => setExpanded(expanded === e.purpose_code ? null : e.purpose_code)}
        />
      ))}
    </div>
  );
}

function PurposeCard({
  entry,
  flowId,
  open,
  onToggle,
}: {
  entry: PurposeCatalogEntry;
  flowId: PurposeFlowId;
  open: boolean;
  onToggle: () => void;
}) {
  const links = purposeTypologyLinks({ ...entry, flowId });
  return (
    <Card className="p-0 overflow-hidden">
      <button type="button" className="w-full text-left p-4 flex gap-3 items-start hover:bg-panel2/50 transition" onClick={onToggle}>
        {open ? <ChevronDown size={14} className="mt-0.5 shrink-0 text-muted" /> : <ChevronRight size={14} className="mt-0.5 shrink-0 text-muted" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="mono text-[10px] text-faint">{entry.purpose_code}</span>
            {entry.sub_flow && <span className="pill bg-panel3 text-muted text-[9px]">{entry.sub_flow}</span>}
            <span className={`pill text-[10px] ${TIER_STYLE[entry.risk_tier] ?? "bg-panel2 text-muted"}`}>{entry.risk_tier}</span>
            <span className="pill bg-panel2 text-muted text-[9px] mono">{entry.cbuae_pop_mapping_indicative_validate}</span>
          </div>
          <div className="font-semibold text-[13px] mt-1">{entry.customer_facing_label}</div>
          <p className="text-[11px] text-muted m-0 mt-1">{entry.description_shown_to_customer}</p>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-lineSoft ml-7 space-y-3">
          <Field label="Acceptable use (compliance)" value={entry.acceptable_use_compliance_definition} ok />
          <Field label="Not acceptable / misuse indicators" value={entry.not_acceptable_misuse_indicators} warn />
          <Field label="Evidence / EDD trigger" value={entry.evidence_edd_trigger} />
          <Field label="TM & screening relevance" value={entry.tm_screening_relevance} />
          {(links.corridors.length > 0 || links.typologies.length > 0) && (
            <div className="p-2 rounded border border-ai/20 bg-ai/5 text-[10px]">
              {links.corridors.length > 0 && (
                <div className="flex gap-1 flex-wrap items-center mb-1">
                  <MapPin size={10} className="text-ai" />
                  <span className="text-muted">Corridors:</span>
                  {links.corridors.map((c) => <span key={c} className="pill bg-panel2 text-[9px]">{c}</span>)}
                </div>
              )}
              {links.typologies.length > 0 && (
                <div className="flex gap-1 flex-wrap items-center">
                  <AlertTriangle size={10} className="text-med" />
                  <span className="text-muted">Typologies:</span>
                  {links.typologies.map((t) => <span key={t} className="pill bg-panel2 text-[9px] mono">{t}</span>)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function Field({ label, value, ok, warn }: { label: string; value: string; ok?: boolean; warn?: boolean }) {
  return (
    <div>
      <div className={`text-[10px] uppercase font-semibold ${warn ? "text-proh" : ok ? "text-low" : "text-faint"}`}>{label}</div>
      <p className="text-[11px] text-muted m-0 mt-0.5 leading-relaxed">{value}</p>
    </div>
  );
}

const UPLOADED_SEV_PILL: Record<string, string> = {
  Critical: "bg-proh/20 text-[#ff7ea0]",
  High: "bg-med/15 text-med",
  Medium: "bg-ai/15 text-ai",
  Low: "bg-low/15 text-low",
};

function UploadedTypologyCard({ t }: { t: CorridorTypology }) {
  const corr = CORRIDOR_BY_CODE[t.corridorCode];
  return (
    <Card className="p-4">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="mono text-[10px] text-faint">{t.id}</span>
        <span className="font-semibold text-[13px]">{t.title}</span>
        <span className={`pill text-[10px] ${UPLOADED_SEV_PILL[t.severity] ?? "bg-panel2 text-muted"}`}>{t.severity}</span>
        <span className="pill bg-panel2 text-muted text-[10px]">{t.category}</span>
        <span className="pill bg-panel3 text-faint text-[10px]">{t.week}</span>
      </div>
      <p className="text-[11px] text-muted mt-2 mb-2">{t.description}</p>
      {t.indicators.length > 0 && (
        <div className="text-[10px] text-faint"><b className="text-muted">Indicators:</b> {t.indicators.join(" · ")}</div>
      )}
      {t.oscilar.length > 0 && (
        <div className="text-[10px] text-faint mt-1"><b className="text-muted">Oscilar:</b> {t.oscilar.join(", ")}</div>
      )}
      <div className="text-[9px] text-faint mt-1 italic">
        {corr ? `${corr.flag} ${corr.name}` : t.corridorCode} · {t.source} · {t.addedBy} · {t.addedAt.slice(0, 10)}
      </div>
    </Card>
  );
}

/** Live corridor intelligence uploaded from Slack via the Execution Dashboard board. */
function LiveCorridorIntel({ variant }: { variant: "corridors" | "typologies" }) {
  const uploaded = useCorridorTypologies();
  if (uploaded.length === 0) return null;
  const codesWithData = GLOBAL_ACCOUNT_CORRIDORS.filter((c) => uploaded.some((t) => t.corridorCode === c.code));
  return (
    <>
      <Card className="p-4 border-ai/30 bg-ai/5">
        <Sec>Live corridor intelligence — uploaded from Slack</Sec>
        <p className="text-[11px] text-muted mt-1 mb-0">
          {uploaded.length} typolog{uploaded.length === 1 ? "y" : "ies"} logged across {codesWithData.length} corridor(s) via the
          Execution Dashboard corridor board. These grow weekly and feed this guide live.
          <Link to="/execution" className="text-ai hover:underline ml-1">Add / manage on the Execution Dashboard →</Link>
        </p>
      </Card>
      {codesWithData.map((c) => {
        const rows = uploaded.filter((t) => t.corridorCode === c.code);
        return (
          <div key={c.code}>
            <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#6E72A6] mb-1.5 mt-1">
              {c.flag} {c.name} ({c.code}) — {rows.length} typolog{rows.length === 1 ? "y" : "ies"}
            </div>
            <div className="space-y-2">
              {rows.map((t) => <UploadedTypologyCard key={t.id} t={t} />)}
            </div>
          </div>
        );
      })}
      {variant === "corridors" && (
        <div className="border-t border-lineSoft my-1" />
      )}
    </>
  );
}

const GA_RATING_STYLE: Record<string, string> = {
  "Low": "bg-low/15 text-low",
  "Medium": "bg-med/15 text-med",
  "Medium-High": "bg-med/20 text-[#ffcf8a]",
  "High": "bg-proh/20 text-[#ff7ea0]",
  "Critical": "bg-[#E0344F]/20 text-[#ffb3c0]",
  "Prohibited": "bg-proh/25 text-[#ff7ea0]",
};

/** Global Account (US MSB) corridor guidance — the 9 permitted corridors + onward-corridor traps. */
function GaCorridorsTab() {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <Sec>Global Account corridor guidance — the nine permitted corridors</Sec>
        <p className="text-[11px] text-muted mt-1 mb-0">
          Residence must be permitted (the gate); the corridor sets the heat. Ratings below are the outbound-from-US
          corridor scores blended with the MAL-TA-01 EWRA override. Guidance for monitoring &amp; EDD — the customer
          rating is set by the CRAM composite. <span className="text-faint">{GA_CORRIDOR_META.source}</span>
        </p>
      </Card>

      <LiveCorridorIntel variant="corridors" />

      <div className="grid grid-cols-2 gap-2 max-md:grid-cols-1">
        {GA_CORRIDOR_GUIDANCE.map((c) => (
          <Card key={c.code} className="p-4">
            <div className="flex flex-wrap gap-2 items-center">
              <h3 className="m-0 text-sm font-display">{c.flag} {c.label}</h3>
              <span className={`pill text-[10px] ${GA_RATING_STYLE[c.rating] ?? "bg-panel2 text-muted"}`}>{c.rating}</span>
              <span className="pill bg-panel2 text-muted text-[10px]">EDD: {c.edd}</span>
            </div>
            <p className="text-[10px] text-faint mt-1 mb-2">{c.ratingNote}{c.typologyLibraryId ? ` · Library: ${c.typologyLibraryId}` : ""}</p>
            <div className="p-2 bg-panel2 rounded border border-lineSoft text-[10px]">
              <span className="text-faint uppercase">Dominant self/C2C typologies: </span>
              <span className="text-muted">{c.dominantTypologies.join(", ")}</span>
            </div>
            <p className="text-[10px] text-faint mt-2 mb-0">Oscilar: {c.oscilarRules.join(", ")}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4 border-proh/30 bg-proh/5">
        <Sec>Onward-corridor traps</Sec>
        <div className="space-y-2 mt-2">
          {GA_CORRIDOR_ONWARD_TRAPS.map((t) => (
            <div key={t.route} className="flex flex-wrap gap-2 items-baseline text-[11px]">
              <span className="mono font-semibold text-ink">{t.route}</span>
              <span className={`pill text-[10px] ${GA_RATING_STYLE[t.rating] ?? "bg-panel2 text-muted"}`}>{t.rating}{(t as { likelihoodImpact?: number }).likelihoodImpact ? ` · L×I ${(t as { likelihoodImpact?: number }).likelihoodImpact}` : ""}</span>
              <span className="text-muted">{t.note}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-line"><h3 className="m-0 text-sm font-display">Self-transfer &amp; C2C flows — core typologies &amp; hard controls</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-faint text-[10px] uppercase border-b border-line">
                <th className="text-left p-3">Catalog code</th>
                <th className="text-left p-3">Flow</th>
                <th className="text-left p-3">Core self/C2C typologies</th>
                <th className="text-left p-3">Hard control / evidence</th>
              </tr>
            </thead>
            <tbody>
              {GA_SELF_C2C_FLOWS.map((f) => (
                <tr key={f.code} className="border-b border-lineSoft align-top">
                  <td className="p-3 mono text-faint whitespace-nowrap">{f.code}</td>
                  <td className="p-3 text-ink">{f.flow}</td>
                  <td className="p-3 text-muted">{f.coreTypologies}</td>
                  <td className="p-3 text-muted">{f.hardControl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/** Global Account country typologies — per-corridor + the periodic-review behaviour lens. */
function GaTypologiesTab() {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <Sec>Global Account country typologies &amp; periodic-review lens</Sec>
        <p className="text-[11px] text-muted mt-1 mb-0">
          Per-corridor dominant self/C2C typologies plus the behaviour lens for periodic review of existing customers
          (observed pattern vs declared expected-activity profile). {GA_CORRIDOR_META.rescoreCadence}
        </p>
      </Card>

      <LiveCorridorIntel variant="typologies" />

      <div className="space-y-2">
        {GA_CORRIDOR_GUIDANCE.map((c) => (
          <Card key={c.code} className="p-3">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[12px] font-semibold">{c.flag} {c.label}</span>
              <span className={`pill text-[10px] ${GA_RATING_STYLE[c.rating] ?? "bg-panel2 text-muted"}`}>{c.rating}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {c.dominantTypologies.map((t) => (
                <span key={t} className="pill bg-panel2 text-muted text-[10px]">{t}</span>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-line"><h3 className="m-0 text-sm font-display">Periodic review — transaction-behaviour lens (existing customers)</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-faint text-[10px] uppercase border-b border-line">
                <th className="text-left p-3">Observed behaviour (vs declared)</th>
                <th className="text-left p-3">What it signals</th>
                <th className="text-left p-3">Review action</th>
                <th className="text-left p-3">Oscilar</th>
              </tr>
            </thead>
            <tbody>
              {GA_PERIODIC_REVIEW_LENS.map((r) => (
                <tr key={r.behaviour} className="border-b border-lineSoft align-top">
                  <td className="p-3 text-ink">{r.behaviour}</td>
                  <td className="p-3 text-muted">{r.signals}</td>
                  <td className="p-3 text-muted">{r.action}</td>
                  <td className="p-3 mono text-faint whitespace-nowrap">{r.oscilar.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function CorridorsTab() {
  const { perimeter } = usePerimeter();
  if (perimeter === "global_account") return <GaCorridorsTab />;
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <Sec>Corridor EWRA guidance</Sec>
        <p className="text-[11px] text-muted mt-1 mb-0">
          Cross-border purpose codes must align with corridor inherent risk and deployed Oscilar rules.
          Full detail in the downloadable PDF — Section 6.
        </p>
      </Card>

      <LiveCorridorIntel variant="corridors" />
      {CORRIDOR_GUIDANCE.map((c) => (
        <Card key={c.id} className="p-4">
          <div className="flex flex-wrap gap-2 items-center">
            <h3 className="m-0 text-sm font-display">{c.label}</h3>
            <span className="pill bg-proh/20 text-[#ff7ea0] text-[10px]">{c.inherentRisk}</span>
            <span className="pill bg-panel2 text-muted text-[10px]">{c.status}</span>
            {c.corridorScore && (
              <span className="pill bg-med/15 text-med text-[10px]">L×I {c.corridorScore.likelihoodImpact} · {c.corridorScore.rating}</span>
            )}
          </div>
          <p className="text-[11px] text-muted mt-2 mb-2">{c.sanctionsNotes}</p>
          <div className="grid grid-cols-2 gap-2 max-md:grid-cols-1 text-[10px]">
            <TypologyRow label="ML" items={c.mlTypologies} />
            <TypologyRow label="TF" items={c.tfTypologies} />
            <TypologyRow label="Illicit finance" items={c.illicitFinance} />
            <TypologyRow label="Islamic-specific" items={c.islamicSpecific} />
          </div>
          <p className="text-[10px] text-faint mt-2 mb-0">
            Oscilar: {c.oscilarRules.slice(0, 6).join(", ")}{c.oscilarRules.length > 6 ? " …" : ""}
            {c.typologyLibraryId && ` · Library: ${c.typologyLibraryId}`}
          </p>
        </Card>
      ))}

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-line"><h3 className="m-0 text-sm font-display">Country modules</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-faint text-[10px] uppercase border-b border-line">
                <th className="text-left p-3">Country</th>
                <th className="text-left p-3">FATF</th>
                <th className="text-left p-3">EWRA</th>
                <th className="text-left p-3">EDD</th>
              </tr>
            </thead>
            <tbody>
              {COUNTRY_MODULES.map((m) => (
                <tr key={m.countryCode} className="border-b border-lineSoft">
                  <td className="p-3"><span className="mono text-faint">{m.countryCode}</span> {m.countryName}</td>
                  <td className="p-3">{m.fatfStatus.replace("_", " ")}</td>
                  <td className="p-3">{m.ewraOverride ?? m.craBand}</td>
                  <td className="p-3">{m.eddMandatory ? "Mandatory" : "Standard"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function TypologyRow({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="p-2 bg-panel2 rounded border border-lineSoft">
      <span className="text-faint uppercase">{label}: </span>
      <span className="text-muted">{items.join(", ")}</span>
    </div>
  );
}

function TypologiesTab() {
  const { perimeter } = usePerimeter();
  if (perimeter === "global_account") return <GaTypologiesTab />;
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <Sec>Country risk typologies — linked to purpose codes</Sec>
        <p className="text-[11px] text-muted mt-1 mb-0">
          Pakistan has the full typology corpus. Other corridors use inline EWRA typologies until dedicated libraries are published.
          Appendix A &amp; B in the PDF map purpose codes to typologies and corridors.
        </p>
        <Link
          to="/regulatory-management"
          state={{ tab: "corridors", corridorView: "riskLibrary" }}
          className="text-[11px] text-ai hover:underline mt-2 inline-block"
        >
          Open full PK typology library (Regulatory Management) →
        </Link>
      </Card>

      <LiveCorridorIntel variant="typologies" />

      {TYPOLOGY_ANNEX.pakistanCorpus.map((t) => (
        <Card key={t.id} className="p-4">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="mono text-[10px] text-faint">{t.id}</span>
            <span className="font-semibold text-[13px]">{t.name}</span>
            <span className={`pill text-[10px] ${t.severity === "Critical" ? "bg-proh/20 text-[#ff7ea0]" : "bg-med/15 text-med"}`}>{t.severity}</span>
            <span className="pill bg-panel2 text-muted text-[10px]">{t.category}</span>
          </div>
          <p className="text-[11px] text-muted mt-2 mb-2">{t.description}</p>
          <div className="text-[10px] text-faint">
            <b className="text-muted">Indicators:</b> {t.indicators.join(" · ")}
          </div>
          <div className="text-[10px] text-faint mt-1">
            <b className="text-muted">Oscilar:</b> {t.oscilarRules.join(", ")}
          </div>
        </Card>
      ))}

      {/* Corridor case intelligence — Pakistan & India (recent enforcement) */}
      <Card className="p-4">
        <Sec>Corridor case intelligence — Pakistan &amp; India</Sec>
        <p className="text-[11px] text-muted mt-1 mb-0">
          Typologies distilled from 2026 public enforcement reporting on the Pakistan and India corridors. Use alongside the
          structured PK library; India has no dedicated library yet, so these are its inline typologies.
        </p>
      </Card>
      {(["Pakistan", "India"] as const).map((country) => {
        const rows = CORRIDOR_CASE_INTEL.filter((c) => c.country === country);
        if (!rows.length) return null;
        return (
          <div key={country}>
            <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#6E72A6] mb-1.5 mt-1">
              {country} — {rows.length} typolog{rows.length === 1 ? "y" : "ies"}
            </div>
            <div className="space-y-2">
              {rows.map((c) => (
                <Card key={c.id} className="p-4">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="mono text-[10px] text-faint">{c.id}</span>
                    <span className="font-semibold text-[13px]">{c.name}</span>
                    <span className={`pill text-[10px] ${c.severity === "Critical" ? "bg-proh/20 text-[#ff7ea0]" : c.severity === "High" ? "bg-med/15 text-med" : "bg-ai/15 text-ai"}`}>{c.severity}</span>
                    <span className="pill bg-panel2 text-muted text-[10px]">{c.category}</span>
                  </div>
                  <p className="text-[11px] text-muted mt-2 mb-2">{c.description}</p>
                  <div className="text-[10px] text-faint">
                    <b className="text-muted">Indicators:</b> {c.indicators.join(" · ")}
                  </div>
                  <div className="text-[10px] text-faint mt-1">
                    <b className="text-muted">Oscilar:</b> {c.oscilar.join(", ")}
                  </div>
                  <div className="text-[9px] text-faint mt-1 italic">{c.source}</div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-3">
      <div className="font-display text-xl font-bold">{value}</div>
      <div className="text-[11px] font-semibold text-ink">{label}</div>
      {hint && <div className="text-[9px] text-faint mt-0.5 leading-tight">{hint}</div>}
    </Card>
  );
}
