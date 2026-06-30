import { useMemo, useState, Fragment } from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui";
import AgentBanner from "../components/agents/AgentBanner";
import DriveLink from "../components/cram/DriveLink";
import {
  CRAM_CATALOGUE, DRIVE_FOLDER_ORDER, DRIVE_FOLDERS,
  STATUS_STYLE, type DriveFolderKey,
} from "../config/cramDriveCatalogue";

type TabId = "regulations" | "controls" | "workflows" | "evidence" | "heatmap";

const TABS: { id: TabId; label: string; folder: DriveFolderKey }[] = [
  { id: "regulations", label: "Regulations & obligations", folder: "regulations" },
  { id: "controls", label: "Control register", folder: "controlsWorkflows" },
  { id: "workflows", label: "Workflow modules", folder: "controlsWorkflows" },
  { id: "evidence", label: "Evidence locker", folder: "evidenceRisk" },
  { id: "heatmap", label: "Risk heat map", folder: "evidenceRisk" },
];

const KANBAN = ["Identified", "Mapped", "Implemented", "Tested", "Evidenced"] as const;

export default function RegulatoryManagement() {
  const [tab, setTab] = useState<TabId>("regulations");
  const [jurisdiction, setJurisdiction] = useState<string>("all");

  const regulations = useMemo(() => {
    if (jurisdiction === "all") return CRAM_CATALOGUE.regulations;
    return CRAM_CATALOGUE.regulations.filter((r) => r.jurisdiction === jurisdiction);
  }, [jurisdiction]);

  const jurisdictions = useMemo(
    () => [...new Set(CRAM_CATALOGUE.regulations.map((r) => r.jurisdiction))],
    [],
  );

  const gapRegs = CRAM_CATALOGUE.regulations.filter((r) => r.status === "gap");

  return (
    <div>
      <AgentBanner agent="sayed" title="Regulatory Management — browse · track · impact · remediation">
        Every regulation, control, workflow SOP, and evidence artefact is indexed against the{" "}
        <b>Mal Google Drive master repository</b>. Three folders cover the full CRAM lineage —
        click any row to open the authoritative document set.
      </AgentBanner>

      {/* Drive folders overview */}
      <div className="grid grid-cols-3 gap-3 mt-4 mb-4 max-lg:grid-cols-1">
        {DRIVE_FOLDER_ORDER.map((key) => {
          const f = DRIVE_FOLDERS[key];
          return (
            <a
              key={key}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 rounded-2xl border border-line bg-panel2 hover:border-ai transition"
            >
              <div className="text-sm font-display font-semibold">{f.label}</div>
              <p className="text-[11px] text-muted mt-1 mb-2 leading-snug">{f.description}</p>
              <span className="text-[10px] text-ai mono break-all">{f.url}</span>
            </a>
          );
        })}
      </div>

      {/* Implementation Kanban summary */}
      <Card className="p-4 mb-4">
        <div className="text-sm font-display font-semibold mb-1">Implementation status</div>
        <div className="text-[10.5px] text-faint mb-3">Identified → Mapped → Implemented → Tested → Evidenced</div>
        <div className="grid grid-cols-5 gap-2 max-md:grid-cols-2">
            {KANBAN.map((stage, i) => {
              const counts = [gapRegs.length + 2, CRAM_CATALOGUE.regulations.length - gapRegs.length, CRAM_CATALOGUE.controls.filter((c) => c.status === "effective").length, CRAM_CATALOGUE.workflows.filter((w) => w.status === "live").length, CRAM_CATALOGUE.evidence.length];
              return (
                <div key={stage} className="p-3 rounded-xl border border-line bg-panel2 text-center">
                  <div className="text-[10px] text-faint uppercase tracking-wide">{stage}</div>
                  <div className="text-xl font-display font-bold mt-1">{counts[i]}</div>
                </div>
              );
            })}
          </div>
          {gapRegs.length > 0 && (
            <div className="mt-3 text-[12px] text-hi">
              {gapRegs.length} gap(s) require remediation:{" "}
              {gapRegs.map((g) => g.name).join(" · ")}
              {" — "}
              <Link to="/cram" className="text-ai hover:underline">Open CRAM Workspace →</Link>
            </div>
          )}
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 rounded-lg text-[12px] font-semibold border transition ${
              tab === t.id ? "bg-ai/20 border-ai text-ink" : "border-line text-muted hover:bg-panel2"
            }`}
          >
            {t.label}
            <span className="block text-[10px] font-normal text-faint mt-0.5">{DRIVE_FOLDERS[t.folder].label}</span>
          </button>
        ))}
      </div>

      {tab === "regulations" && (
        <Card>
          <div className="px-4 py-3 border-b border-line flex flex-wrap gap-3 items-center">
            <h3 className="m-0 text-sm font-display">Regulation & obligation library</h3>
            <select className="input ml-auto text-[12px] max-w-[160px]" value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)}>
              <option value="all">All jurisdictions</option>
              {jurisdictions.map((j) => <option key={j} value={j}>{j}</option>)}
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
        <Card className="p-4">
          <div className="text-sm font-display font-semibold mb-1">Risk heat map</div>
          <div className="text-[10.5px] text-faint mb-3">Inherent risk × control strength</div>
          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
              <div>
                <div className="grid gap-1 text-[11px] max-w-sm" style={{ gridTemplateColumns: "80px repeat(3,1fr)" }}>
                  <div />
                  {CRAM_CATALOGUE.heatMap.matrix.cols.map((c) => (
                    <div key={c} className="text-center text-muted text-[10px]">{c.replace(" control", "")}</div>
                  ))}
                  {CRAM_CATALOGUE.heatMap.matrix.rows.map((row, ri) => (
                    <Fragment key={row}>
                      <div className="text-muted text-[10px] flex items-center">{row.replace(" inherent", "")}</div>
                      {CRAM_CATALOGUE.heatMap.matrix.cells[ri].map((val, ci) => (
                        <div key={`${ri}-${ci}`} className="rounded-lg py-3 text-center font-semibold text-[#020A18] text-[11px]"
                          style={{ background: ri === 0 && ci === 0 ? "#FF5C77" : ri === 0 && ci === 1 ? "#F6A623" : val >= 20 ? "#2FD8A6" : "#F6A623" }}>
                          {val}
                        </div>
                      ))}
                    </Fragment>
                  ))}
                </div>
                <p className="text-[11px] text-muted mt-3">{CRAM_CATALOGUE.heatMap.matrix.interpretation}</p>
              </div>
              <div className="space-y-3">
                <div className="p-3 rounded-xl border border-line bg-panel2">
                  <div className="text-[12px] font-semibold">Methodology document</div>
                  <p className="text-[11px] text-muted mt-1">How inherent risk and control strength are scored for the enterprise matrix.</p>
                  <DriveLink folderKey={CRAM_CATALOGUE.heatMap.methodologyDriveFolder} docPath={CRAM_CATALOGUE.heatMap.methodologyDriveDoc} label="Open methodology (Drive)" className="mt-2" />
                </div>
                <div className="p-3 rounded-xl border border-line bg-panel2">
                  <div className="text-[12px] font-semibold">Latest approved snapshot</div>
                  <p className="text-[11px] text-muted mt-1">Q2 2026 EWRA heat map — board-approved, stored in evidence folder.</p>
                  <DriveLink folderKey={CRAM_CATALOGUE.heatMap.snapshotDriveFolder} docPath={CRAM_CATALOGUE.heatMap.snapshotDriveDoc} label="Open snapshot (Drive)" className="mt-2" />
                </div>
                <Link to="/cram" className="text-[12px] text-ai hover:underline block">View interactive heat map in CRAM Workspace →</Link>
              </div>
          </div>
        </Card>
      )}

      <Card className="mt-4 p-4 text-[11px] text-muted">
        <b className="text-ink">Cross-reference:</b>{" "}
        <Link to="/cram" className="text-ai hover:underline">CRAM Workspace</Link>
        {" · "}<Link to="/test-bench" className="text-ai hover:underline">Risk Test Bench</Link>
        {" · "}<Link to="/investigation" className="text-ai hover:underline">Investigation Hub</Link>
        {" · "}<Link to="/reporting" className="text-ai hover:underline">Reporting Centre</Link>
        {" · "}<Link to="/validation" className="text-ai hover:underline">Model Validation</Link>
      </Card>
    </div>
  );
}
