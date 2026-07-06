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
  type PurposeFlowId,
  type PurposeCatalogEntry,
} from "../../config/transactionPurposeCatalog";
import { exportTransactionPurposeCatalogPdf } from "../../lib/transactionPurposeCatalogPdf";

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

function CorridorsTab() {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <Sec>Corridor EWRA guidance</Sec>
        <p className="text-[11px] text-muted mt-1 mb-0">
          Cross-border purpose codes must align with corridor inherent risk and deployed Oscilar rules.
          Full detail in the downloadable PDF — Section 6.
        </p>
      </Card>
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
