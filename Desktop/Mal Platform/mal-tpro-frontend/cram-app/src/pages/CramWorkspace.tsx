import { useState, Fragment } from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui";
import AgentBanner from "../components/agents/AgentBanner";
import DriveLink from "../components/cram/DriveLink";
import EwraRegulatoryPack from "../components/cram/EwraRegulatoryPack";
import RegulatoryLineageFlow from "../components/cram/RegulatoryLineageFlow";
import { heatCellColor } from "../config/ewraRegulatoryPack";
import {
  CRAM_CATALOGUE, DRIVE_FOLDER_ORDER, DRIVE_FOLDERS,
  STATUS_STYLE,
} from "../config/cramDriveCatalogue";

export default function CramWorkspace() {
  const [selReg, setSelReg] = useState<string>("REG-CBUAE-AML");
  const { coverage, heatMap } = CRAM_CATALOGUE;
  const covPct = Math.round((coverage.covered / coverage.obligations) * 100);

  return (
    <div>
      {/* Google Drive master repository */}
      <Card className="p-4 mb-4">
        <div className="text-sm font-display font-semibold mb-1">Google Drive — master repository</div>
        <div className="text-[10.5px] text-faint mb-3">Regulations · controls · workflows · evidence</div>
        <div className="grid grid-cols-3 gap-3 max-lg:grid-cols-1">
            {DRIVE_FOLDER_ORDER.map((key) => {
              const f = DRIVE_FOLDERS[key];
              return (
                <a
                  key={key}
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-xl border border-line bg-panel2 hover:border-ai hover:bg-panel3 transition"
                >
                  <div className="text-[12px] font-semibold text-ink">{f.label}</div>
                  <div className="text-[10.5px] text-muted mt-1 leading-snug">{f.description}</div>
                  <div className="text-[10px] text-ai mt-2 mono truncate">{f.url}</div>
                </a>
              );
            })}
        </div>
      </Card>

      <Card className="p-4 mb-4">
        <div className="text-[11.5px] text-muted">Obligation coverage</div>
        <div className="h-2.5 rounded-md bg-panel3 overflow-hidden flex w-full max-w-[280px] mt-2">
          <i className="block h-full bg-low" style={{ width: `${covPct}%` }} />
          <i className="block h-full bg-hi" style={{ width: `${100 - covPct}%` }} />
        </div>
        <div className="text-[11px] text-muted mt-1.5">
          {coverage.obligations} obligations · <span className="text-low">{coverage.covered} covered</span>
          {" · "}<span className="text-med">{coverage.partial} partial</span>
          {" · "}<span className="text-hi">{coverage.uncovered} uncovered</span>
        </div>
      </Card>

      <AgentBanner agent="sayed" title="Sayed keeps the CRAM honest">
        CBUAE notice 2026/14 (virtual-asset travel rule) is <b>uncovered</b>. I propose mapping it to control{" "}
        <span className="mono">C-118</span>. Evidence and workflow drafts are in{" "}
        <DriveLink folderKey="controlsWorkflows" docPath="Controls/C-118-VASP-travel-rule-DRAFT" label="Drive → C-118 draft" />.
      </AgentBanner>

      {/* Lineage graph */}
      <RegulatoryLineageFlow selReg={selReg} onSelectReg={setSelReg} />

      {/* Heat map + Control register */}
      <div className="grid grid-cols-2 gap-4 mt-4 max-md:grid-cols-1">
        <Card>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-line flex-wrap">
            <h3 className="m-0 text-sm font-display">Risk heat map</h3>
            <span className="ml-auto text-faint text-[11px]">{heatMap.title}</span>
          </div>
          <div className="p-4">
            <div className="grid gap-1 text-[11px]" style={{ gridTemplateColumns: "80px repeat(3,1fr)" }}>
              <div />
              {heatMap.matrix.cols.map((c) => <HL key={c}>{c.replace(" control", "")}</HL>)}
              {heatMap.matrix.rows.map((row, ri) => (
                <Fragment key={row}>
                  <HL>{row.replace(" inherent", " inh.")}</HL>
                  {heatMap.matrix.cells[ri].map((val, ci) => (
                    <HC key={`${ri}-${ci}`} c={heatCellColor(ri, ci, val)}>{val}</HC>
                  ))}
                </Fragment>
              ))}
            </div>
            <div className="text-[11px] text-muted mt-3">{heatMap.matrix.interpretation}</div>
            <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-lineSoft">
              <Link to="/regulatory" className="text-[11px] text-ai hover:underline">Full EWRA pack (methodology + snapshot) →</Link>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-line flex-wrap">
            <h3 className="m-0 text-sm font-display">Control register</h3>
            <span className="ml-auto text-faint text-[11px]">
              {coverage.controlsTotal} controls · {coverage.controlsEffective} effective · {coverage.controlsGap} gap
            </span>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-faint text-[10px] uppercase">
                  <th className="text-left font-semibold px-4 py-2">Control</th>
                  <th className="text-left font-semibold py-2">Tests</th>
                  <th className="text-left font-semibold py-2">Status</th>
                  <th className="text-left font-semibold py-2 pr-4">Drive</th>
                </tr>
              </thead>
              <tbody>
                {CRAM_CATALOGUE.controls.map((c) => (
                  <tr key={c.id} className="border-t border-lineSoft">
                    <td className="px-4 py-2.5">
                      <span className="mono">{c.id}</span> {c.name}
                      <div className="text-[10px] text-faint mt-0.5">{c.owner}</div>
                    </td>
                    <td className="py-2.5 text-muted">{c.tests}</td>
                    <td className="py-2.5">
                      <span className={`pill ${STATUS_STYLE[c.status] ?? ""}`}>{c.status}</span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <DriveLink folderKey={c.driveFolder} docPath={c.driveDoc} compact />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-lineSoft">
            <DriveLink
              folderKey="controlsWorkflows"
              docPath="Controls/Control-register-master"
              label="Full control register spreadsheet (Drive)"
            />
          </div>
        </Card>
      </div>

      <EwraRegulatoryPack defaultTab="methodology" />

      {/* All workflows index */}
      <Card className="mt-4 p-4">
        <div className="text-sm font-display font-semibold mb-1">Workflow module index</div>
        <div className="text-[10.5px] text-faint mb-3">Every live module linked to control + Drive SOP</div>
        <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-faint text-[10px] uppercase">
                  <th className="text-left py-2">Workflow</th>
                  <th className="text-left py-2">Module</th>
                  <th className="text-left py-2">Controls</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">App</th>
                  <th className="text-left py-2">Drive SOP</th>
                </tr>
              </thead>
              <tbody>
                {CRAM_CATALOGUE.workflows.map((w) => (
                  <tr key={w.id} className="border-t border-lineSoft">
                    <td className="py-2.5 mono text-[11px]">{w.id}</td>
                    <td className="py-2.5">{w.module}</td>
                    <td className="py-2.5 mono text-[10px] text-muted">{w.controls.join(", ")}</td>
                    <td className="py-2.5"><span className={`pill ${STATUS_STYLE[w.status] ?? ""}`}>{w.status}</span></td>
                    <td className="py-2.5"><Link to={w.route} className="text-ai hover:underline">{w.route}</Link></td>
                    <td className="py-2.5"><DriveLink folderKey={w.driveFolder} docPath={w.driveDoc} compact /></td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </Card>
    </div>
  );
}

const HL = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center text-muted text-[10.5px] justify-center">{children}</div>
);
const HC = ({ c, children }: { c: string; children: React.ReactNode }) => (
  <div className="rounded-lg py-3 px-2 text-center font-semibold text-[#020A18]" style={{ background: c }}>{children}</div>
);
