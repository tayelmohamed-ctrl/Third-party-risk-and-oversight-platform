import { useMemo, useState, useEffect, Fragment, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card } from "../components/ui";
import {
  ScrollText, Shield, GitMerge, Lock, LayoutGrid, Globe,
  Rss, CalendarClock, Radar, Library, Landmark, ClipboardCheck,
  Search, Map as MapIcon, Wrench, FlaskConical, ShieldCheck,
  ChevronRight, X, ExternalLink, Download, Share2, FolderOpen,
  Building2, RefreshCw, FileText, Users, Activity, Coins,
  ShieldAlert, Scale, Info, type LucideIcon,
} from "lucide-react";
import AgentBanner from "../components/agents/AgentBanner";
import AgentAiTag from "../components/agents/AgentAiTag";
import EwraRegulatoryPack from "../components/cram/EwraRegulatoryPack";
import CorridorEwraWorkflow from "../components/cram/CorridorEwraWorkflow";
import DriveLink from "../components/cram/DriveLink";
import { usePerimeter } from "../context/PerimeterContext";
import { licenseProfileForPerimeter, PERIMETERS } from "../config/perimeters";
import { sourcesForPerimeter } from "../config/regulatorySources";
import {
  CRAM_CATALOGUE, DRIVE_FOLDER_ORDER, DRIVE_FOLDERS,
  STATUS_STYLE, type DriveFolderKey,
} from "../config/cramDriveCatalogue";
import { LICENSE_PROFILES } from "../config/licenseProfiles";
import { apiRegulatoryMonitor, apiRunRegulatoryMonitor, type RegulatoryMonitorStatus } from "../lib/api";

type TabId = "regulations" | "controls" | "workflows" | "evidence" | "heatmap" | "corridors";

const TABS: { id: TabId; label: string; folder: DriveFolderKey }[] = [
  { id: "regulations", label: "Regulations & obligations", folder: "regulations" },
  { id: "controls", label: "Control register", folder: "controlsWorkflows" },
  { id: "workflows", label: "Workflow modules", folder: "controlsWorkflows" },
  { id: "evidence", label: "Evidence locker", folder: "evidenceRisk" },
  { id: "heatmap", label: "Risk heat map", folder: "evidenceRisk" },
  { id: "corridors", label: "Corridor EWRA", folder: "evidenceRisk" },
];

const TAB_ICONS: Record<TabId, { Icon: LucideIcon; accent: string }> = {
  regulations: { Icon: ScrollText, accent: "#39B9ED" },
  controls:    { Icon: Shield,     accent: "#A953DF" },
  workflows:   { Icon: GitMerge,   accent: "#7C6CF7" },
  evidence:    { Icon: Lock,       accent: "#2FD8A6" },
  heatmap:     { Icon: LayoutGrid, accent: "#F6A623" },
  corridors:   { Icon: Globe,      accent: "#FF5C77" },
};

const KANBAN = ["Identified", "Mapped", "Implemented", "Tested", "Evidenced"] as const;

const IMPL_META: { Icon: LucideIcon; accent: string }[] = [
  { Icon: Search,        accent: "#A953DF" },
  { Icon: MapIcon,       accent: "#39B9ED" },
  { Icon: Wrench,        accent: "#F6A623" },
  { Icon: FlaskConical,  accent: "#2FD8A6" },
  { Icon: ShieldCheck,   accent: "#7C6CF7" },
];

/**
 * Regulatory domains — a presentational categorisation of the real catalogue.
 * Each regulation is classified by keyword; counts are always derived from the
 * live catalogue, tailored to the active perimeter (US vs UAE relevance).
 */
const DOMAIN_ORDER = [
  "Banking & AML/CFT",
  "Sanctions",
  "Regulatory Reporting",
  "Licensing & MSB",
  "CDD & Ownership",
  "Transaction Monitoring",
  "Virtual Assets",
  "Partner & Correspondent",
  "Group Policy",
] as const;
type DomainKey = (typeof DOMAIN_ORDER)[number];

const DOMAIN_META: Record<DomainKey, { Icon: LucideIcon; accent: string; short: string }> = {
  "Banking & AML/CFT":       { Icon: Landmark,    accent: "#A953DF", short: "AML/CFT" },
  "Sanctions":               { Icon: ShieldAlert, accent: "#FF5C77", short: "Sanctions" },
  "Regulatory Reporting":    { Icon: FileText,    accent: "#39B9ED", short: "Reporting" },
  "Licensing & MSB":         { Icon: Scale,       accent: "#F6A623", short: "Licensing" },
  "CDD & Ownership":         { Icon: Users,       accent: "#2FD8A6", short: "CDD" },
  "Transaction Monitoring":  { Icon: Activity,    accent: "#7C6CF7", short: "TM" },
  "Virtual Assets":          { Icon: Coins,       accent: "#E8B84B", short: "VA" },
  "Partner & Correspondent": { Icon: Building2,   accent: "#39B9ED", short: "Partner" },
  "Group Policy":            { Icon: Shield,      accent: "#8E7CF0", short: "Policy" },
};

function classifyDomain(name: string, ref: string): DomainKey {
  const s = `${name} ${ref}`.toLowerCase();
  if (/travel rule|virtual|vasp/.test(s)) return "Virtual Assets";
  if (/ofac|sanction|\btfs\b|targeted financial|recommendation 6/.test(s)) return "Sanctions";
  if (/\bmsb\b|registration|licens/.test(s)) return "Licensing & MSB";
  if (/transaction monitoring|thematic|scenario/.test(s)) return "Transaction Monitoring";
  if (/sar|str|ctr|report|goaml|recommendation 20|form 111|form 104/.test(s)) return "Regulatory Reporting";
  if (/beneficial|\bcdd\b|\bcip\b|due diligence|recommendation 10/.test(s)) return "CDD & Ownership";
  if (/baas|partner|zenus|sponsor|correspondent|wolfsberg/.test(s)) return "Partner & Correspondent";
  if (/policy/.test(s)) return "Group Policy";
  return "Banking & AML/CFT";
}

export default function RegulatoryManagement() {
  const location = useLocation();
  const { perimeter } = usePerimeter();
  const activeLicense = licenseProfileForPerimeter(perimeter);
  const perimeterSources = useMemo(() => sourcesForPerimeter(perimeter), [perimeter]);
  const perimeterDef = PERIMETERS[perimeter];
  const locState = location.state as { tab?: TabId; corridorView?: "pipeline" | "corridors" | "countries" | "riskLibrary" } | null;
  const initialTab = locState?.tab;
  const [tab, setTab] = useState<TabId>(initialTab ?? "regulations");
  const [jurisdiction, setJurisdiction] = useState<string>("all");
  const [licenseFilter, setLicenseFilter] = useState<string>(activeLicense);
  const [monitor, setMonitor] = useState<RegulatoryMonitorStatus | null>(null);
  const [monitorBusy, setMonitorBusy] = useState(false);
  const [focusOpen, setFocusOpen] = useState<number | null>(0); // presentational docked detail panel

  useEffect(() => {
    setLicenseFilter(activeLicense);
    setJurisdiction(perimeter === "mal_bank" ? "UAE" : "US");
  }, [activeLicense, perimeter]);

  useEffect(() => {
    void apiRegulatoryMonitor().then(setMonitor).catch(() => setMonitor(null));
  }, []);

  async function runSayedCheck() {
    setMonitorBusy(true);
    try {
      await apiRunRegulatoryMonitor();
      setMonitor(await apiRegulatoryMonitor());
    } finally {
      setMonitorBusy(false);
    }
  }

  const regulations = useMemo(() => {
    let list = CRAM_CATALOGUE.regulations;
    if (jurisdiction !== "all") list = list.filter((r) => r.jurisdiction === jurisdiction);
    if (licenseFilter !== "all") {
      list = list.filter((r) => {
        const profiles = (r as { licenseProfiles?: string[] }).licenseProfiles;
        return profiles?.includes(licenseFilter) ?? false;
      });
    }
    return list;
  }, [jurisdiction, licenseFilter]);

  const jurisdictions = useMemo(
    () => [...new Set(CRAM_CATALOGUE.regulations.map((r) => r.jurisdiction))],
    [],
  );

  const gapRegs = CRAM_CATALOGUE.regulations.filter((r) => r.status === "gap");
  const cov = CRAM_CATALOGUE.coverage;

  // Implementation counts — identical logic to the Kanban summary.
  const implCounts = useMemo(() => [
    gapRegs.length + 2,
    CRAM_CATALOGUE.regulations.length - gapRegs.length,
    CRAM_CATALOGUE.controls.filter((c) => c.status === "effective").length,
    CRAM_CATALOGUE.workflows.filter((w) => w.status === "live").length,
    CRAM_CATALOGUE.evidence.length,
  ], [gapRegs.length]);

  // Regulations relevant to the active perimeter (US = Global Account, UAE = Mal Bank).
  const perimeterRegs = useMemo(() => {
    const home = perimeter === "mal_bank" ? "UAE" : "US";
    return CRAM_CATALOGUE.regulations.filter(
      (r) => r.jurisdiction === home || r.jurisdiction === "International" || r.jurisdiction === "Group",
    );
  }, [perimeter]);

  // Regulatory domains — counts derived from the perimeter's real regulations.
  const domainGroups = useMemo(() => {
    const counts = new Map<DomainKey, number>();
    for (const r of perimeterRegs) {
      const d = classifyDomain(r.name, r.ref);
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    return DOMAIN_ORDER.filter((d) => (counts.get(d) ?? 0) > 0).map((d) => ({
      domain: d,
      count: counts.get(d) ?? 0,
    }));
  }, [perimeterRegs]);

  const evidenceCurrent = useMemo(
    () => CRAM_CATALOGUE.evidence.filter((e) => ["verified", "current", "approved", "ready", "clear"].includes(e.status)).length,
    [],
  );

  // Focus areas map to the three Drive folders + coverage figures.
  const FOCUS = useMemo(() => ([
    {
      idx: 0, num: "01", title: "Regulatory Obligations", folder: "regulations" as DriveFolderKey,
      accent: "#A953DF", Icon: Landmark, current: cov.covered, total: cov.obligations, unit: "Obligations",
    },
    {
      idx: 1, num: "02", title: "Controls & Workflows", folder: "controlsWorkflows" as DriveFolderKey,
      accent: "#39B9ED", Icon: GitMerge, current: cov.controlsEffective, total: cov.controlsTotal, unit: "Controls",
    },
    {
      idx: 2, num: "03", title: "Evidence & Risk Assessments", folder: "evidenceRisk" as DriveFolderKey,
      accent: "#2FD8A6", Icon: ClipboardCheck, current: evidenceCurrent, total: CRAM_CATALOGUE.evidence.length, unit: "Assessments",
    },
  ]), [cov, evidenceCurrent]);

  const tabCount: Record<TabId, string> = {
    regulations: `${CRAM_CATALOGUE.regulations.length} regulations`,
    controls: `${CRAM_CATALOGUE.controls.length} controls`,
    workflows: `${CRAM_CATALOGUE.workflows.length} workflows`,
    evidence: `${CRAM_CATALOGUE.evidence.length} evidence`,
    heatmap: `${CRAM_CATALOGUE.heatMap.matrix.rows.length}×${CRAM_CATALOGUE.heatMap.matrix.cols.length} matrix`,
    corridors: "Corridor EWRA",
  };

  const lastCheckLabel = monitor?.lastRunAt ? new Date(monitor.lastRunAt).toLocaleString() : "Pending";

  // Perimeter-tailored source-watch header (presentation only).
  const isUae = perimeter === "mal_bank";
  const perimeterLicenses = LICENSE_PROFILES.filter((p) => p.id === activeLicense || p.id === "GROUP");
  const primaryWatchLabel = isUae
    ? "CBUAE rulebook & circulars, UAE FIU (goAML) RSS, and FATF guidance."
    : "FinCEN (BSA/MSB) & OFAC feeds, FFIEC examination manual, and the Zenus BaaS addendum version (Drive).";

  const panelOpen = focusOpen !== null;

  return (
    <div className="flex flex-col xl:flex-row gap-4 items-start">
      {/* ── Main column ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 w-full">
      <AgentBanner agent="sayed" title="Regulatory Management — browse · track · impact · remediation">
        Sayed monitors <b>{perimeterSources.length} authoritative sources weekly</b> for{" "}
        <b>{perimeterDef.label}</b> ({perimeterDef.subtitle}).
        {perimeter === "mal_bank"
          ? " CBUAE rulebook, UAE FIU, FATF, and UAE TFS programmes."
          : " FinCEN, OFAC, FFIEC, BSA/MSB guidance, and Zenus BaaS addendum."}
        {" "}Changes feed Signal Feeds and the obligation register.
      </AgentBanner>

      {/* KPI hero row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mt-4 mb-5 max-sm:grid-cols-1">
        <KpiCard
          illustration={<RegIllustFeeds />} accent="#A953DF"
          title="Signal Feeds" sub="Regulatory & supervisory updates"
          value={String(perimeterSources.length)} unit="Active feeds"
          footer={`Last sync · ${lastCheckLabel}`}
        />
        <KpiCard
          illustration={<RegIllustCheck />} accent="#39B9ED"
          title="Last Check" sub="Automated scan completion"
          value={lastCheckLabel} valueSize="sm"
          footer="Frequency · Monday 09:00 UAE"
        />
        <KpiCard
          illustration={<RegIllustChanges />} accent="#F6A623"
          title="Changes Detected" sub="New / updated regulatory items"
          value={String(monitor?.pendingChanges ?? 0)} unit="Updates"
          valueColor={(monitor?.pendingChanges ?? 0) > 0 ? "#FF5C77" : "#2FD8A6"}
          footer="Feeds Signal Feeds + register"
        />
        <KpiCard
          illustration={<RegIllustCatalogue />} accent="#7C6CF7"
          title="Catalogued" sub="Unique regulatory obligations"
          value={String(CRAM_CATALOGUE.regulations.length)} unit="Regulations"
          footer={`Mapped controls · ${cov.obligations} obligations`}
          action={
            <button
              type="button"
              onClick={() => void runSayedCheck()}
              disabled={monitorBusy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10.5px] font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(90deg,#A953DF,#7C6CF7)" }}
            >
              <RefreshCw size={12} className={monitorBusy ? "animate-spin" : ""} />
              {monitorBusy ? "Scanning…" : "Run fresh scan"}
            </button>
          }
        />
      </div>

      {/* Sayed source watch — narrative, license coverage, channels, results */}
      <div className="p-4 rounded-2xl border border-[#26285C] bg-[#0A1130] mb-5">
        <div className="flex flex-wrap gap-3 items-center mb-2">
          <AgentAiTag agent="sayed">Sayed — weekly regulatory source watch</AgentAiTag>
          <Link to="/feeds" className="text-[11px] text-ai hover:underline ml-auto">View in Signal Feeds →</Link>
        </div>
        <p className="text-[12px] text-muted mt-1 mb-3 max-w-3xl leading-relaxed">
          Automated check every Monday 09:00 UAE (05:00 UTC). Demo mode: every 6 hours.
          <b className="text-ink"> {perimeterDef.label} primary:</b> {primaryWatchLabel}
          <b className="text-ink"> Backup:</b> HTTP content hash on rulebooks and guidance pages.
          When changes are detected, Walid is notified via Slack and email.
        </p>
        <div className="flex flex-wrap gap-2">
          {perimeterLicenses.map((p) => (
            <span key={p.id} className="pill text-[10px] bg-panel2 text-muted">{p.label} · {p.regulator}</span>
          ))}
        </div>
        {monitor?.channels && (
          <div className="text-[10.5px] text-muted mt-3">
            <b className="text-ink">Production channels:</b> Primary — {monitor.channels.primary.join(", ")} ·
            Backup — {monitor.channels.backup.join(", ")} · Notify — {monitor.notifyTo} via {monitor.channels.notify.join(", ")}
          </div>
        )}
        {monitor?.lastRun?.results && (
          <div className="mt-3 pt-3 border-t border-lineSoft space-y-1">
            {monitor.lastRun.results
              .filter((r) => perimeterSources.some((s) => s.id === r.sourceId))
              .filter((r) => r.status === "changed" || r.status === "error")
              .map((r) => (
              <div key={r.sourceId} className={`text-[11px] ${r.status === "changed" ? "text-hi" : "text-med"}`}>
                {r.status === "changed" ? "● Changed" : "● Error"} — {r.name}
                {r.error ? ` (${r.error})` : ""}
              </div>
            ))}
          </div>
        )}
        {!monitor?.lastRun?.results?.some((r) => perimeterSources.some((s) => s.id === r.sourceId) && (r.status === "changed" || r.status === "error")) && monitor?.lastRun?.results && (
          <div className="mt-3 pt-3 border-t border-lineSoft text-[11px] text-muted">
            No changes or errors on {perimeterDef.label} sources in the last check.
          </div>
        )}
      </div>

      {/* Regulatory domains — tailored to the active perimeter */}
      <SectionLabel hint={perimeter === "mal_bank" ? "CBUAE · UAE" : "US · FinCEN / OFAC"}>Regulatory domains</SectionLabel>
      <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-7 gap-2.5 mb-5 max-sm:grid-cols-2">
        {domainGroups.map(({ domain, count }) => {
          const m = DOMAIN_META[domain];
          return <DomainChip key={domain} Icon={m.Icon} accent={m.accent} label={domain} count={count} />;
        })}
      </div>

      {/* Focus areas */}
      <SectionLabel>Focus areas</SectionLabel>
      <div className="grid grid-cols-3 gap-3 mb-5 max-lg:grid-cols-1">
        {FOCUS.map((f) => (
          <FocusCard
            key={f.num}
            num={f.num}
            Icon={f.Icon}
            accent={f.accent}
            title={f.title}
            desc={DRIVE_FOLDERS[f.folder].description}
            current={f.current}
            total={f.total}
            unit={f.unit}
            active={focusOpen === f.idx}
            onClick={() => setFocusOpen(f.idx)}
          />
        ))}
      </div>

      {/* Implementation status */}
      <SectionLabel>Implementation status</SectionLabel>
      <div className="grid grid-cols-5 gap-2.5 mb-3 max-md:grid-cols-2">
        {KANBAN.map((stage, i) => (
          <ImplTile key={stage} Icon={IMPL_META[i].Icon} accent={IMPL_META[i].accent} label={stage} count={implCounts[i]} />
        ))}
      </div>
      {gapRegs.length > 0 && (
        <div className="flex items-center gap-2 text-[12px] mb-5 px-3.5 py-2.5 rounded-xl border border-[#FF5C77]/30 bg-[#FF5C77]/8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C77] shrink-0" />
          <span className="text-[#ff8ea7]">
            {gapRegs.length} gap(s) require remediation: {gapRegs.map((g) => g.name).join(" · ")}
          </span>
          <Link to="/cram" className="text-ai hover:underline ml-auto shrink-0">Open CRAM Workspace →</Link>
        </div>
      )}

      {/* Tab navigation cards */}
      <div className="grid grid-cols-6 gap-2 mb-3 max-lg:grid-cols-3 max-sm:grid-cols-2">
        {TABS.map((t) => {
          const { Icon, accent } = TAB_ICONS[t.id];
          return (
            <TabPill
              key={t.id}
              Icon={Icon}
              accent={accent}
              label={t.label}
              count={tabCount[t.id]}
              active={tab === t.id}
              onClick={() => setTab(t.id)}
            />
          );
        })}
      </div>

      {tab === "regulations" && (
        <Card>
          <div className="px-4 py-3 border-b border-line flex flex-wrap gap-3 items-center">
            <h3 className="m-0 text-sm font-display">Regulation & obligation library</h3>
            <select className="input ml-auto text-[12px] max-w-[160px]" value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)}>
              <option value="all">All jurisdictions</option>
              {jurisdictions.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
            <select className="input text-[12px] max-w-[180px]" value={licenseFilter} onChange={(e) => setLicenseFilter(e.target.value)}>
              <option value="all">All license paths</option>
              {LICENSE_PROFILES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <DriveLink folderKey="regulations" docPath="Obligation-register-master" label="Full register (Drive)" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-faint text-[10px] uppercase">
                  <th className="text-left px-4 py-2">Regulation</th>
                  <th className="text-left py-2">Reference</th>
                  <th className="text-left py-2">Jurisdiction</th>
                  <th className="text-left py-2">Mapped controls</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2 pr-4">Google Drive</th>
                </tr>
              </thead>
              <tbody>
                {regulations.map((r) => (
                  <tr key={r.id} className="border-t border-lineSoft">
                    <td className="px-4 py-2.5 font-semibold">{r.name}</td>
                    <td className="py-2.5 text-muted">{r.ref}</td>
                    <td className="py-2.5">{r.jurisdiction}</td>
                    <td className="py-2.5 mono text-[10px]">{r.controls.join(", ")}</td>
                    <td className="py-2.5"><span className={`pill ${STATUS_STYLE[r.status]}`}>{r.status}</span></td>
                    <td className="py-2.5 pr-4"><DriveLink folderKey={r.driveFolder} docPath={r.driveDoc} compact /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "controls" && (
        <Card>
          <div className="px-4 py-3 border-b border-line flex items-center gap-2">
            <h3 className="m-0 text-sm font-display">Control register</h3>
            <DriveLink folderKey="controlsWorkflows" docPath="Controls/Control-register-master" label="Master spreadsheet (Drive)" className="ml-auto" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-faint text-[10px] uppercase">
                  <th className="text-left px-4 py-2">ID</th>
                  <th className="text-left py-2">Control</th>
                  <th className="text-left py-2">Owner</th>
                  <th className="text-left py-2">Effectiveness</th>
                  <th className="text-left py-2">Regulations</th>
                  <th className="text-left py-2">Workflows</th>
                  <th className="text-left py-2">Module</th>
                  <th className="text-left py-2 pr-4">Drive</th>
                </tr>
              </thead>
              <tbody>
                {CRAM_CATALOGUE.controls.map((c) => (
                  <tr key={c.id} className="border-t border-lineSoft">
                    <td className="px-4 py-2.5 mono">{c.id}</td>
                    <td className="py-2.5">{c.name}</td>
                    <td className="py-2.5 text-muted">{c.owner}</td>
                    <td className="py-2.5"><span className={`pill ${STATUS_STYLE[c.status]}`}>{c.effectiveness}</span></td>
                    <td className="py-2.5 mono text-[10px] text-muted">{c.regulations.join(", ")}</td>
                    <td className="py-2.5 mono text-[10px] text-muted">{c.workflows.join(", ")}</td>
                    <td className="py-2.5"><Link to={c.moduleRoute} className="text-ai hover:underline">{c.moduleRoute}</Link></td>
                    <td className="py-2.5 pr-4"><DriveLink folderKey={c.driveFolder} docPath={c.driveDoc} compact /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "workflows" && (
        <Card>
          <div className="px-4 py-3 border-b border-line">
            <h3 className="m-0 text-sm font-display">Workflow modules & SOPs</h3>
            <p className="text-[11px] text-muted m-0 mt-1">Each workflow maps to a live app module and a Drive SOP in folder 02.</p>
          </div>
          <div className="p-4 space-y-3">
            {CRAM_CATALOGUE.workflows.map((w) => (
              <div key={w.id} className="p-3 rounded-xl border border-line bg-panel2">
                <div className="flex flex-wrap gap-2 items-baseline">
                  <span className="mono text-[11px] text-ai">{w.id}</span>
                  <b className="text-[13px]">{w.module}</b>
                  <span className={`pill text-[10px] ${STATUS_STYLE[w.status]}`}>{w.status}</span>
                </div>
                <div className="text-[11px] text-muted mt-1">{w.name}</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10.5px]">
                  <span>Controls: <span className="mono">{w.controls.join(", ")}</span></span>
                  <span>Evidence: {w.evidenceTypes.join(" · ")}</span>
                </div>
                <div className="flex gap-3 mt-2">
                  <Link to={w.route} className="text-[11px] text-ai hover:underline">Open module →</Link>
                  <DriveLink folderKey={w.driveFolder} docPath={w.driveDoc} label="SOP (Drive)" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "evidence" && (
        <Card>
          <div className="px-4 py-3 border-b border-line flex items-center gap-2">
            <h3 className="m-0 text-sm font-display">Evidence locker</h3>
            <DriveLink folderKey="evidenceRisk" label="Open evidence folder (Drive)" className="ml-auto" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-faint text-[10px] uppercase">
                  <th className="text-left px-4 py-2">Evidence</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Customer</th>
                  <th className="text-left py-2">Control</th>
                  <th className="text-left py-2">Workflow</th>
                  <th className="text-left py-2">Freshness</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2 pr-4">Drive</th>
                </tr>
              </thead>
              <tbody>
                {CRAM_CATALOGUE.evidence.map((e) => (
                  <tr key={e.id} className="border-t border-lineSoft">
                    <td className="px-4 py-2.5">{e.name}</td>
                    <td className="py-2.5 text-muted">{e.type}</td>
                    <td className="py-2.5 mono text-[10px]">{e.customerId ?? "Enterprise"}</td>
                    <td className="py-2.5 mono text-[10px]">{e.linkedControl}</td>
                    <td className="py-2.5 mono text-[10px]">{e.linkedWorkflow}</td>
                    <td className="py-2.5">{e.freshness}</td>
                    <td className="py-2.5"><span className={`pill ${STATUS_STYLE[e.status] ?? ""}`}>{e.status}</span></td>
                    <td className="py-2.5 pr-4"><DriveLink folderKey={e.driveFolder} docPath={e.driveDoc} compact /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "heatmap" && (
        <div className="space-y-4">
          <EwraRegulatoryPack defaultTab="snapshot" />
        </div>
      )}

      {tab === "corridors" && <CorridorEwraWorkflow defaultView={locState?.corridorView} />}

      <Card className="mt-4 p-4 text-[11px] text-muted">
        <b className="text-ink">Cross-reference:</b>{" "}
        <Link to="/cram" className="text-ai hover:underline">CRAM Workspace</Link>
        {" · "}<Link to="/test-bench" className="text-ai hover:underline">Risk Test Bench</Link>
        {" · "}<Link to="/investigation" className="text-ai hover:underline">Investigation Hub</Link>
        {" · "}<Link to="/reporting" className="text-ai hover:underline">Reporting Centre</Link>
        {" · "}<Link to="/validation" className="text-ai hover:underline">Model Validation</Link>
      </Card>
      </div>
      {/* ── Docked detail panel ─────────────────────────────────── */}
      {panelOpen && focusOpen !== null && (() => {
        const f = FOCUS[focusOpen];
        const folder = DRIVE_FOLDERS[f.folder];
        const pct = f.total > 0 ? Math.round((f.current / f.total) * 100) : 0;
        const gapsHere = focusOpen === 0 ? gapRegs.length
          : focusOpen === 1 ? CRAM_CATALOGUE.controls.filter((c) => c.status !== "effective").length
          : CRAM_CATALOGUE.evidence.length - evidenceCurrent;
        const riskLabel = gapsHere === 0 ? "Low" : gapsHere <= 2 ? "Medium" : "High";
        const riskColor = gapsHere === 0 ? "#2FD8A6" : gapsHere <= 2 ? "#F6A623" : "#FF5C77";
        return (
          <aside className="w-full xl:w-[384px] shrink-0 xl:sticky xl:top-4">
            <RegDetailPanel
              focus={f}
              folder={folder}
              pct={pct}
              riskLabel={riskLabel}
              riskColor={riskColor}
              updated={CRAM_CATALOGUE.updated}
              owner={perimeterDef.approverLabel}
              domains={domainGroups.map((d) => d.domain)}
              perimeterLabel={perimeterDef.label}
              onClose={() => setFocusOpen(null)}
            />
          </aside>
        );
      })()}
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="flex items-center gap-2 mb-2.5 mt-1">
      <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#6E72A6]">{children}</span>
      <Info size={11} className="text-[#4b4f7d]" />
      {hint && <span className="text-[9.5px] text-[#4b4f7d] font-medium">{hint}</span>}
      <div className="h-px flex-1 bg-[#1e2156]" />
    </div>
  );
}

// ─── KPI hero card ────────────────────────────────────────────────────────────

function KpiCard({
  illustration, accent, title, sub, value, unit, footer, valueColor, valueSize = "lg", action,
}: {
  illustration: ReactNode;
  accent: string;
  title: string;
  sub: string;
  value: string;
  unit?: string;
  footer: string;
  valueColor?: string;
  valueSize?: "lg" | "sm";
  action?: ReactNode;
}) {
  return (
    <div
      className="group relative flex flex-col p-4 rounded-2xl border border-[#26285C] overflow-hidden transition-all duration-200 hover:border-[#A953DF]/30 hover:shadow-[0_8px_30px_rgba(0,0,0,.35)] hover:-translate-y-0.5"
      style={{ background: "linear-gradient(160deg,#111536 0%,#0A0E28 70%)" }}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] opacity-70" style={{ background: `linear-gradient(90deg,transparent,${accent},transparent)` }} />
      {/* Soft glow behind illustration */}
      <span aria-hidden className="absolute -top-4 -left-4 w-24 h-24 rounded-full blur-2xl opacity-20" style={{ background: accent }} />
      <div className="relative flex items-start gap-3">
        <div
          className="w-16 h-16 rounded-2xl grid place-items-center shrink-0 transition-transform duration-200 group-hover:scale-[1.06]"
          style={{ background: `linear-gradient(150deg,${accent}26,${accent}0D)`, boxShadow: `inset 0 0 0 1px ${accent}2E` }}
        >
          {illustration}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold font-display text-white leading-tight">{title}</div>
          <div className="text-[10px] text-[#8A8FC0] mt-0.5 leading-snug">{sub}</div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span
          className={`font-display font-bold leading-none tabular-nums ${valueSize === "sm" ? "text-[15px]" : "text-[30px]"}`}
          style={{ color: valueColor ?? "white" }}
        >
          {value}
        </span>
        {unit && <span className="text-[10.5px] text-[#8A8FC0] font-medium">{unit}</span>}
      </div>
      <div className="mt-2.5 pt-2.5 border-t border-[#1e2156] flex items-center gap-1.5 text-[10px] text-[#6E72A6]">
        <span className="w-3.5 h-3.5 rounded-full grid place-items-center shrink-0" style={{ background: `${accent}22` }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
        </span>
        {footer}
      </div>
    </div>
  );
}

// ─── Domain chip ──────────────────────────────────────────────────────────────

function DomainChip({ Icon, accent, label, count }: { Icon: LucideIcon; accent: string; label: string; count: number }) {
  return (
    <div className="group flex flex-col gap-2 p-3 rounded-xl border border-[#22254f] bg-[#0A0E28] transition-all duration-200 hover:border-[#A953DF]/30 hover:-translate-y-0.5">
      <div
        className="w-9 h-9 rounded-lg grid place-items-center shrink-0 transition-transform group-hover:scale-105"
        style={{ background: `linear-gradient(150deg,${accent}30,${accent}12)`, color: accent, boxShadow: `inset 0 0 0 1px ${accent}30` }}
      >
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="text-[10.5px] font-semibold text-[#D6D9F5] leading-tight">{label}</div>
        <div className="text-[9.5px] mt-1 font-semibold" style={{ color: accent }}>
          {count} regulation{count === 1 ? "" : "s"}
        </div>
      </div>
    </div>
  );
}

// ─── Focus area card ──────────────────────────────────────────────────────────

function FocusCard({
  num, Icon, accent, title, desc, current, total, unit, active, onClick,
}: {
  num: string;
  Icon: LucideIcon;
  accent: string;
  title: string;
  desc: string;
  current: number;
  total: number;
  unit: string;
  active: boolean;
  onClick: () => void;
}) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative text-left p-4 rounded-2xl border overflow-hidden transition-all duration-200 cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A953DF]",
        active
          ? "border-[#A953DF]/50 shadow-[0_0_32px_rgba(169,83,223,.12)]"
          : "border-[#26285C] hover:border-[#A953DF]/30 hover:scale-[1.005]",
      ].join(" ")}
      style={{ background: active ? "#100f28" : "#0A1130" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-full grid place-items-center shrink-0"
          style={{ background: `linear-gradient(150deg,${accent}33,${accent}12)`, color: accent, boxShadow: `inset 0 0 0 1px ${accent}33` }}
        >
          <Icon size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-display text-[11px] font-black tabular-nums" style={{ color: accent }}>{num}</span>
            <span className="text-[13px] font-bold font-display text-white leading-tight">{title}</span>
          </div>
          <p className="text-[10.5px] text-[#8A8FC0] mt-1 leading-snug line-clamp-2">{desc}</p>
        </div>
        <ChevronRight size={16} className="text-[#6E72A6] shrink-0 transition-transform group-hover:translate-x-0.5" />
      </div>
      <div className="mt-3.5 flex items-end justify-between">
        <div className="text-[13px] font-display font-bold text-white tabular-nums">
          {current} <span className="text-[#6E72A6] font-normal">/ {total} {unit}</span>
        </div>
        <div className="text-[12px] font-bold tabular-nums" style={{ color: accent }}>{pct}%</div>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-[#1e2156] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg,${accent},${accent}aa)` }} />
      </div>
    </button>
  );
}

// ─── Implementation tile ──────────────────────────────────────────────────────

function ImplTile({ Icon, accent, label, count }: { Icon: LucideIcon; accent: string; label: string; count: number }) {
  return (
    <div className="group relative flex items-center gap-3 p-3.5 rounded-xl border border-[#22254f] bg-[#0A0E28] transition-all duration-200 hover:border-[#A953DF]/30 hover:-translate-y-0.5">
      <div
        className="w-10 h-10 rounded-full grid place-items-center shrink-0"
        style={{ background: `linear-gradient(150deg,${accent}33,${accent}12)`, color: accent, boxShadow: `inset 0 0 0 1px ${accent}30` }}
      >
        <Icon size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[9.5px] text-[#8A8FC0] uppercase tracking-wide font-semibold truncate">{label}</div>
        <div className="text-[22px] font-display font-bold text-white leading-none mt-0.5 tabular-nums">{count}</div>
      </div>
      <ChevronRight size={14} className="text-[#3c4070] shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-[#6E72A6]" />
    </div>
  );
}

// ─── Tab navigation pill ──────────────────────────────────────────────────────

function TabPill({
  Icon, accent, label, count, active, onClick,
}: {
  Icon: LucideIcon;
  accent: string;
  label: string;
  count: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A953DF]",
        active
          ? "border-[#A953DF]/50 bg-[#100f28] shadow-[0_0_20px_rgba(169,83,223,.1)]"
          : "border-[#26285C] bg-[#0A1130] hover:border-[#A953DF]/30",
      ].join(" ")}
    >
      <div
        className="w-8 h-8 rounded-lg grid place-items-center shrink-0"
        style={{ background: active ? accent : `${accent}1A`, color: active ? "white" : accent }}
      >
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-[11px] font-semibold leading-tight truncate ${active ? "text-white" : "text-[#C4C8F0]"}`}>{label}</div>
        <div className="text-[9px] text-[#6E72A6] mt-0.5 truncate">{count}</div>
      </div>
      <ChevronRight size={13} className={`shrink-0 transition-transform ${active ? "text-[#A953DF] translate-x-0.5" : "text-[#6E72A6] group-hover:translate-x-0.5"}`} />
    </button>
  );
}

// ─── Docked detail panel ──────────────────────────────────────────────────────

interface PanelFocus {
  idx: number;
  num: string;
  title: string;
  folder: DriveFolderKey;
  accent: string;
  Icon: LucideIcon;
  current: number;
  total: number;
  unit: string;
}

const PANEL_BADGE = ["Primary Library", "Controls Library", "Evidence Library"];
const PANEL_SUBTABS: { id: "obligations" | "controls" | "evidence" | "changelog"; label: string }[] = [
  { id: "obligations", label: "Obligations" },
  { id: "controls", label: "Mapped Controls" },
  { id: "evidence", label: "Evidence" },
  { id: "changelog", label: "Change Log" },
];

function RegDetailPanel({
  focus, folder, pct, riskLabel, riskColor, updated, owner, domains, perimeterLabel, onClose,
}: {
  focus: PanelFocus;
  folder: { label: string; url: string; description: string };
  pct: number;
  riskLabel: string;
  riskColor: string;
  updated: string;
  owner: string;
  domains: string[];
  perimeterLabel: string;
  onClose: () => void;
}) {
  const { Icon, accent } = focus;
  const [subTab, setSubTab] = useState<"obligations" | "controls" | "evidence" | "changelog">("obligations");

  const subCounts = {
    obligations: CRAM_CATALOGUE.coverage.obligations,
    controls: CRAM_CATALOGUE.coverage.controlsTotal,
    evidence: CRAM_CATALOGUE.evidence.length,
    changelog: CRAM_CATALOGUE.regulations.filter((r) => r.status === "gap").length,
  };

  const rows: { a: string; b: string; status?: string }[] =
    subTab === "obligations"
      ? CRAM_CATALOGUE.regulations.slice(0, 6).map((r) => ({ a: r.name, b: r.ref, status: r.status }))
      : subTab === "controls"
        ? CRAM_CATALOGUE.controls.slice(0, 6).map((c) => ({ a: `${c.id} · ${c.name}`, b: c.owner, status: c.status }))
        : subTab === "evidence"
          ? CRAM_CATALOGUE.evidence.slice(0, 6).map((e) => ({ a: e.name, b: e.type, status: e.status }))
          : CRAM_CATALOGUE.regulations.filter((r) => r.status === "gap").map((r) => ({ a: r.name, b: r.ref, status: r.status }));

  return (
    <div
      className="rounded-2xl border overflow-hidden xl:max-h-[calc(100vh-2rem)] flex flex-col"
      style={{ borderColor: `${accent}55`, boxShadow: `0 0 40px ${accent}1f`, background: "#070c1f" }}
      role="region"
      aria-label={`${focus.title} details`}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-[#1e2156]" style={{ background: "linear-gradient(135deg,#0c1233 0%,#151a44 100%)" }}>
        <div className="flex items-start gap-2">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="font-display text-[14px] font-black tabular-nums" style={{ color: accent }}>{focus.num}</span>
            <h3 className="m-0 text-[15px] font-bold font-display text-white truncate">· {focus.title}</h3>
          </div>
          <span className="ml-auto pill text-[9px] shrink-0 mt-0.5" style={{ background: `${accent}22`, color: accent }}>
            {PANEL_BADGE[focus.idx] ?? "Library"}
          </span>
          <button type="button" onClick={onClose} className="shrink-0 w-7 h-7 rounded-lg grid place-items-center text-[#8A8FC0] hover:text-white hover:bg-white/10 transition" aria-label="Close panel">
            <X size={15} />
          </button>
        </div>
        <p className="text-[11px] text-[#A7ACDB] mt-2 mb-0 leading-relaxed">{folder.description}</p>
        {/* Illustration band */}
        <div className="mt-3 flex items-center justify-center py-4 rounded-xl border border-[#26285C] relative overflow-hidden" style={{ background: `linear-gradient(135deg,${accent}18,${accent}06)` }}>
          <span aria-hidden className="absolute w-24 h-24 rounded-full blur-2xl opacity-25" style={{ background: accent }} />
          <Icon size={46} style={{ color: accent }} className="relative" strokeWidth={1.6} />
        </div>
      </div>

      <div className="p-5 space-y-4 overflow-y-auto">
        {/* Meta grid */}
        <div className="space-y-2.5">
          <MetaRow label="Owner" value={owner} />
          <MetaRow label="Last updated" value={updated} />
          <MetaRow label={`Total ${focus.unit.toLowerCase()}`} value={String(focus.total)} />
          <MetaRow label="Mapped" value={`${pct}% (${focus.current} / ${focus.total})`} />
          <MetaRow label="Risk rating" value={riskLabel} valueColor={riskColor} dot />
          <MetaRow label="Status" value="Active" valueColor="#2FD8A6" dot />
          <MetaRow label="Perimeter" value={perimeterLabel} />
        </div>

        {/* Key domains */}
        <div>
          <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#6E72A6] mb-2">Key domains</div>
          <div className="flex flex-wrap gap-1.5">
            {domains.slice(0, 8).map((d) => (
              <span key={d} className="pill text-[9.5px] bg-panel2 text-[#C4C8F0] border border-[#26285C]">{d}</span>
            ))}
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-4 border-b border-[#1e2156]">
          {PANEL_SUBTABS.map((t) => {
            const on = subTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id)}
                className={`relative pb-2 text-[11px] font-semibold transition ${on ? "text-white" : "text-[#6E72A6] hover:text-[#A7ACDB]"}`}
              >
                {t.label} <span className="text-[9.5px] text-[#6E72A6]">({subCounts[t.id]})</span>
                {on && <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full" style={{ background: accent }} />}
              </button>
            );
          })}
        </div>

        {/* Top items */}
        <div>
          <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#6E72A6] mb-2">
            Top {PANEL_SUBTABS.find((t) => t.id === subTab)?.label.toLowerCase()}
          </div>
          <div className="rounded-xl border border-[#26285C] overflow-hidden">
            {rows.length === 0 ? (
              <div className="px-3 py-4 text-[11px] text-[#6E72A6]">No items in this view.</div>
            ) : rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2.5 border-b border-[#191b46] last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-[#E6E8FA] truncate">{r.a}</div>
                  <div className="text-[9.5px] text-[#6E72A6] truncate">{r.b}</div>
                </div>
                {r.status && (
                  <span className={`pill text-[9px] shrink-0 ${STATUS_STYLE[r.status] ?? "bg-panel2 text-muted"}`}>{r.status}</span>
                )}
              </div>
            ))}
          </div>
          <a href={folder.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10.5px] text-ai hover:underline mt-2">
            View all {focus.total} {focus.unit.toLowerCase()} <ChevronRight size={12} />
          </a>
        </div>

        {/* Quick actions */}
        <div>
          <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#6E72A6] mb-2">Quick actions</div>
          <div className="grid grid-cols-2 gap-2">
            <FlyoutAction Icon={FolderOpen} href={folder.url} label="Open library" />
            <FlyoutAction Icon={Download} href={folder.url} label="Export library" />
            <FlyoutAction Icon={Share2} href={folder.url} label="Share" />
            <FlyoutAction Icon={ExternalLink} href={folder.url} label="View in Drive" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value, valueColor, dot }: { label: string; value: string; valueColor?: string; dot?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] text-[#8A8FC0]">{label}</span>
      <span className="text-[11px] font-semibold flex items-center gap-1.5 text-right" style={{ color: valueColor ?? "#E6E8FA" }}>
        {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: valueColor }} />}
        {value}
      </span>
    </div>
  );
}

function FlyoutAction({ Icon, href, label }: { Icon: LucideIcon; href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[#26285C] bg-[#0A1130] text-[11px] font-semibold text-[#C4C8F0] hover:border-[#A953DF]/35 hover:text-white transition"
    >
      <Icon size={14} className="text-[#8A8FC0]" />
      {label}
    </a>
  );
}

// ─── KPI illustrations ────────────────────────────────────────────────────────

function RegIllustFeeds() {
  return (
    <svg viewBox="0 0 48 48" width={40} height={40} fill="none">
      {/* Back sheet */}
      <rect x="10" y="8" width="24" height="30" rx="3" fill="#A953DF" fillOpacity="0.18" stroke="#A953DF" strokeWidth="1.6"/>
      {/* Front sheet */}
      <rect x="15" y="12" width="24" height="30" rx="3" fill="#A953DF" fillOpacity="0.30" stroke="#A953DF" strokeWidth="1.6"/>
      <line x1="20" y1="20" x2="34" y2="20" stroke="#c9a2ee" strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="20" y1="26" x2="34" y2="26" stroke="#c9a2ee" strokeOpacity="0.7" strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="20" y1="32" x2="29" y2="32" stroke="#c9a2ee" strokeOpacity="0.5" strokeWidth="1.6" strokeLinecap="round"/>
      {/* RSS dot */}
      <circle cx="18" cy="15.5" r="1.6" fill="#A953DF"/>
    </svg>
  );
}

function RegIllustCheck() {
  return (
    <svg viewBox="0 0 48 48" width={40} height={40} fill="none">
      {/* Clipboard */}
      <rect x="11" y="10" width="22" height="30" rx="3" fill="#39B9ED" fillOpacity="0.16" stroke="#39B9ED" strokeWidth="1.6"/>
      <rect x="17" y="7" width="10" height="6" rx="2" fill="#0A0E28" stroke="#39B9ED" strokeWidth="1.6"/>
      <path d="M15 20 l2.5 2.5 L22 18" fill="none" stroke="#2FD8A6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="25" y1="20" x2="30" y2="20" stroke="#7fd0f2" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M15 28 l2.5 2.5 L22 26" fill="none" stroke="#2FD8A6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="25" y1="28" x2="30" y2="28" stroke="#7fd0f2" strokeOpacity="0.7" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Clock badge */}
      <circle cx="34" cy="34" r="7" fill="#0A0E28" stroke="#39B9ED" strokeWidth="1.6"/>
      <path d="M34 30.5 v3.5 l2.2 1.5" fill="none" stroke="#39B9ED" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function RegIllustChanges() {
  return (
    <svg viewBox="0 0 48 48" width={40} height={40} fill="none">
      {/* Radar rings */}
      <circle cx="22" cy="26" r="15" fill="#F6A623" fillOpacity="0.08" stroke="#F6A623" strokeWidth="1.5"/>
      <circle cx="22" cy="26" r="9" fill="none" stroke="#F6A623" strokeOpacity="0.5" strokeWidth="1.3"/>
      <circle cx="22" cy="26" r="3.5" fill="#F6A623" fillOpacity="0.6"/>
      {/* Sweep */}
      <path d="M22 26 L34 18 A15 15 0 0 1 33 33 Z" fill="#F6A623" fillOpacity="0.18"/>
      <line x1="22" y1="26" x2="34" y2="18" stroke="#F6A623" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Alert badge */}
      <circle cx="37" cy="14" r="7" fill="#FF5C77"/>
      <rect x="35.6" y="9.5" width="2.8" height="5.5" rx="1.4" fill="white"/>
      <circle cx="37" cy="17.5" r="1.4" fill="white"/>
    </svg>
  );
}

function RegIllustCatalogue() {
  return (
    <svg viewBox="0 0 48 48" width={40} height={40} fill="none">
      {/* Back folder */}
      <path d="M7 15 h10 l3 3 h14 a2 2 0 0 1 2 2 v16 a2 2 0 0 1 -2 2 H7 a2 2 0 0 1 -2 -2 V17 a2 2 0 0 1 2 -2 Z" fill="#7C6CF7" fillOpacity="0.20" stroke="#7C6CF7" strokeWidth="1.5"/>
      {/* Front folder */}
      <path d="M11 22 h26 a2 2 0 0 1 2 2 l-2 14 a2 2 0 0 1 -2 2 H9 a2 2 0 0 1 -2 -2 l1.5 -14 a2 2 0 0 1 2 -2 Z" fill="#7C6CF7" fillOpacity="0.38" stroke="#7C6CF7" strokeWidth="1.5"/>
      <line x1="14" y1="30" x2="30" y2="30" stroke="#b9aeff" strokeOpacity="0.6" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
