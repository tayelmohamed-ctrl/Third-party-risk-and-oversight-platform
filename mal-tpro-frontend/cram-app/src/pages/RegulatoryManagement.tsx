import { useMemo, useState, useEffect, Fragment, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card } from "../components/ui";
import {
  ScrollText, Shield, GitMerge, Lock, LayoutGrid, Globe,
  Rss, CalendarClock, Radar, Library, Landmark, ClipboardCheck,
  Search, Map as MapIcon, Wrench, FlaskConical, ShieldCheck,
  ChevronRight, X, ExternalLink, Download, Share2, FolderOpen,
  Building2, RefreshCw, type LucideIcon,
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

const JURIS_META: Record<string, { Icon: LucideIcon; accent: string }> = {
  UAE:           { Icon: Landmark,  accent: "#39B9ED" },
  US:            { Icon: Landmark,  accent: "#A953DF" },
  International: { Icon: Globe,     accent: "#2FD8A6" },
  Group:         { Icon: Building2, accent: "#F6A623" },
};

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
  const [focusOpen, setFocusOpen] = useState<number | null>(null); // presentational detail flyout

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

  // Coverage grouped by jurisdiction (real, derived).
  const domainGroups = useMemo(
    () => jurisdictions.map((j) => ({
      juris: j,
      count: CRAM_CATALOGUE.regulations.filter((r) => r.jurisdiction === j).length,
    })),
    [jurisdictions],
  );

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

  return (
    <div>
      <AgentBanner agent="sayed" title="Regulatory Management — browse · track · impact · remediation">
        Sayed monitors <b>{perimeterSources.length} authoritative sources weekly</b> for{" "}
        <b>{perimeterDef.label}</b> ({perimeterDef.subtitle}).
        {perimeter === "mal_bank"
          ? " CBUAE rulebook, UAE FIU, FATF, and UAE TFS programmes."
          : " FinCEN, OFAC, FFIEC, BSA/MSB guidance, and Zenus BaaS addendum."}
        {" "}Changes feed Signal Feeds and the obligation register.
      </AgentBanner>

      {/* KPI hero row */}
      <div className="grid grid-cols-4 gap-3 mt-4 mb-5 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <KpiCard
          Icon={Rss} accent="#A953DF"
          title="Signal Feeds" sub="Regulatory & supervisory updates"
          value={String(perimeterSources.length)} unit="Active feeds"
          footer={`Last sync · ${lastCheckLabel}`}
        />
        <KpiCard
          Icon={CalendarClock} accent="#39B9ED"
          title="Last Check" sub="Automated scan completion"
          value={lastCheckLabel} valueSize="sm"
          footer="Frequency · Monday 09:00 UAE"
        />
        <KpiCard
          Icon={Radar} accent="#F6A623"
          title="Changes Detected" sub="New / updated regulatory items"
          value={String(monitor?.pendingChanges ?? 0)} unit="Updates"
          valueColor={(monitor?.pendingChanges ?? 0) > 0 ? "#FF5C77" : "#2FD8A6"}
          footer="Feeds Signal Feeds + register"
        />
        <KpiCard
          Icon={Library} accent="#7C6CF7"
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
          <b className="text-ink"> Primary:</b> CBUAE &amp; FinCEN RSS, Zenus BaaS addendum version (Drive).
          <b className="text-ink"> Backup:</b> HTTP content hash on rulebooks and guidance pages.
          When changes are detected, Walid is notified via Slack and email.
        </p>
        <div className="flex flex-wrap gap-2">
          {LICENSE_PROFILES.map((p) => (
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

      {/* Regulatory coverage by jurisdiction */}
      <SectionLabel>Regulatory coverage by jurisdiction</SectionLabel>
      <div className="grid grid-cols-4 gap-2.5 mb-5 max-lg:grid-cols-2">
        {domainGroups.map(({ juris, count }) => {
          const m = JURIS_META[juris] ?? { Icon: Globe, accent: "#39B9ED" };
          return <DomainChip key={juris} Icon={m.Icon} accent={m.accent} label={juris} count={count} />;
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

      {/* Focus-area detail flyout (presentation only) */}
      {focusOpen !== null && (() => {
        const f = FOCUS[focusOpen];
        const folder = DRIVE_FOLDERS[f.folder];
        const pct = f.total > 0 ? Math.round((f.current / f.total) * 100) : 0;
        const gapsHere = focusOpen === 0 ? gapRegs.length
          : focusOpen === 1 ? CRAM_CATALOGUE.controls.filter((c) => c.status !== "effective").length
          : CRAM_CATALOGUE.evidence.length - evidenceCurrent;
        const riskLabel = gapsHere === 0 ? "Low" : gapsHere <= 2 ? "Medium" : "High";
        const riskColor = gapsHere === 0 ? "#2FD8A6" : gapsHere <= 2 ? "#F6A623" : "#FF5C77";
        return (
          <FocusFlyout
            focus={f}
            folder={folder}
            pct={pct}
            riskLabel={riskLabel}
            riskColor={riskColor}
            updated={CRAM_CATALOGUE.updated}
            jurisdictions={jurisdictions}
            perimeterLabel={perimeterDef.subtitle}
            gapsHere={gapsHere}
            onClose={() => setFocusOpen(null)}
          />
        );
      })()}
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2.5 mt-1">
      <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#6E72A6]">{children}</span>
      <div className="h-px flex-1 bg-[#1e2156]" />
    </div>
  );
}

// ─── KPI hero card ────────────────────────────────────────────────────────────

function KpiCard({
  Icon, accent, title, sub, value, unit, footer, valueColor, valueSize = "lg", action,
}: {
  Icon: LucideIcon;
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
      className="group relative flex flex-col p-4 rounded-2xl border border-[#26285C] overflow-hidden transition-all duration-200 hover:border-[#A953DF]/30 hover:shadow-[0_6px_28px_rgba(0,0,0,.32)]"
      style={{ background: "linear-gradient(150deg,#0c1130 0%,#0A1130 60%)" }}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] opacity-60" style={{ background: `linear-gradient(90deg,transparent,${accent},transparent)` }} />
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-xl grid place-items-center shrink-0 transition-transform duration-200 group-hover:scale-105"
          style={{ background: `${accent}1A`, color: accent, boxShadow: `inset 0 0 0 1px ${accent}33` }}
        >
          <Icon size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-bold font-display text-white leading-tight">{title}</div>
          <div className="text-[10px] text-[#8A8FC0] mt-0.5 leading-snug">{sub}</div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span
          className={`font-display font-bold leading-none tabular-nums ${valueSize === "sm" ? "text-[15px]" : "text-[28px]"}`}
          style={{ color: valueColor ?? "white" }}
        >
          {value}
        </span>
        {unit && <span className="text-[10.5px] text-[#8A8FC0] font-medium">{unit}</span>}
      </div>
      <div className="mt-2.5 pt-2.5 border-t border-[#1e2156] flex items-center gap-1.5 text-[10px] text-[#6E72A6]">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent }} />
        {footer}
      </div>
    </div>
  );
}

// ─── Domain chip ──────────────────────────────────────────────────────────────

function DomainChip({ Icon, accent, label, count }: { Icon: LucideIcon; accent: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-[#26285C] bg-[#0A1130] transition-colors hover:border-[#A953DF]/25">
      <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: `${accent}1A`, color: accent }}>
        <Icon size={17} />
      </div>
      <div className="min-w-0">
        <div className="text-[11.5px] font-semibold text-[#C4C8F0] leading-tight truncate">{label}</div>
        <div className="text-[10px] text-[#6E72A6] mt-0.5">{count} regulation{count === 1 ? "" : "s"}</div>
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
        <div className="w-11 h-11 rounded-xl grid place-items-center shrink-0" style={{ background: `${accent}1A`, color: accent }}>
          <Icon size={21} />
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
    <div className="flex items-center gap-3 p-3.5 rounded-xl border border-[#26285C] bg-[#0A1130] transition-colors hover:border-[#A953DF]/25">
      <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: `${accent}1A`, color: accent }}>
        <Icon size={17} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] text-[#8A8FC0] uppercase tracking-wide font-semibold truncate">{label}</div>
        <div className="text-[20px] font-display font-bold text-white leading-none mt-0.5 tabular-nums">{count}</div>
      </div>
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

// ─── Focus detail flyout ──────────────────────────────────────────────────────

interface FlyoutFocus {
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

function FocusFlyout({
  focus, folder, pct, riskLabel, riskColor, updated, jurisdictions, perimeterLabel, gapsHere, onClose,
}: {
  focus: FlyoutFocus;
  folder: { label: string; url: string; description: string };
  pct: number;
  riskLabel: string;
  riskColor: string;
  updated: string;
  jurisdictions: string[];
  perimeterLabel: string;
  gapsHere: number;
  onClose: () => void;
}) {
  const { Icon, accent } = focus;

  // Top rows differ per focus area — all from the live catalogue.
  const rows: { a: string; b: string; status?: string }[] =
    focus.idx === 0
      ? CRAM_CATALOGUE.regulations.slice(0, 6).map((r) => ({ a: r.name, b: r.ref, status: r.status }))
      : focus.idx === 1
        ? CRAM_CATALOGUE.controls.slice(0, 6).map((c) => ({ a: `${c.id} · ${c.name}`, b: c.owner, status: c.status }))
        : CRAM_CATALOGUE.evidence.slice(0, 6).map((e) => ({ a: e.name, b: e.type, status: e.status }));

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-[fadeIn_.15s_ease]"
        onClick={onClose}
        aria-hidden
      />
      {/* Drawer */}
      <aside
        className="fixed top-0 right-0 h-full w-[420px] max-w-[94vw] z-50 border-l border-[#26285C] overflow-y-auto"
        style={{ background: "#070c1f" }}
        role="dialog"
        aria-label={`${focus.title} details`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 px-5 pt-5 pb-4 border-b border-[#1e2156]" style={{ background: "linear-gradient(135deg,#0c1233 0%,#151a44 100%)" }}>
          <div className="flex items-start gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-display text-[13px] font-black tabular-nums" style={{ color: accent }}>{focus.num}</span>
              <h3 className="m-0 text-[16px] font-bold font-display text-white truncate">{focus.title}</h3>
            </div>
            <span className="ml-auto pill text-[9.5px] shrink-0" style={{ background: `${accent}22`, color: accent }}>
              {folder.label.split("·").pop()?.trim() ?? "Library"}
            </span>
            <button type="button" onClick={onClose} className="shrink-0 w-7 h-7 rounded-lg grid place-items-center text-[#8A8FC0] hover:text-white hover:bg-white/10 transition">
              <X size={16} />
            </button>
          </div>
          <p className="text-[11px] text-[#A7ACDB] mt-2 mb-0 leading-relaxed">{folder.description}</p>
          {/* Illustration band */}
          <div className="mt-3 flex items-center justify-center py-3 rounded-xl border border-[#26285C]" style={{ background: `${accent}0D` }}>
            <Icon size={44} style={{ color: accent, opacity: 0.85 }} />
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Meta grid */}
          <div className="space-y-2.5">
            <MetaRow label="Perimeter" value={perimeterLabel} />
            <MetaRow label="Last updated" value={updated} />
            <MetaRow label={`Total ${focus.unit.toLowerCase()}`} value={String(focus.total)} />
            <MetaRow label="Mapped" value={`${pct}% (${focus.current} / ${focus.total})`} />
            <MetaRow label="Risk rating" value={riskLabel} valueColor={riskColor} dot />
            <MetaRow label="Open gaps" value={String(gapsHere)} valueColor={gapsHere === 0 ? "#2FD8A6" : "#FF5C77"} />
          </div>

          {/* Key domains */}
          <div>
            <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#6E72A6] mb-2">Key domains</div>
            <div className="flex flex-wrap gap-1.5">
              {jurisdictions.map((j) => (
                <span key={j} className="pill text-[10px] bg-panel2 text-[#C4C8F0] border border-[#26285C]">{j}</span>
              ))}
            </div>
          </div>

          {/* Top items */}
          <div>
            <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#6E72A6] mb-2">
              Top {focus.unit.toLowerCase()}
            </div>
            <div className="rounded-xl border border-[#26285C] overflow-hidden">
              {rows.map((r, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2.5 border-b border-[#191b46] last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11.5px] font-semibold text-[#E6E8FA] truncate">{r.a}</div>
                    <div className="text-[10px] text-[#6E72A6] truncate">{r.b}</div>
                  </div>
                  {r.status && (
                    <span className={`pill text-[9px] shrink-0 ${STATUS_STYLE[r.status] ?? "bg-panel2 text-muted"}`}>{r.status}</span>
                  )}
                </div>
              ))}
            </div>
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
      </aside>
    </>
  );
}

function MetaRow({ label, value, valueColor, dot }: { label: string; value: string; valueColor?: string; dot?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] text-[#8A8FC0]">{label}</span>
      <span className="text-[11.5px] font-semibold flex items-center gap-1.5 text-right" style={{ color: valueColor ?? "#E6E8FA" }}>
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
