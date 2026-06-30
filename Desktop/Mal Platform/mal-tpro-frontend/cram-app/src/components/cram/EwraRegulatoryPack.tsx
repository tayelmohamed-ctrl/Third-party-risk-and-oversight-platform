import { Fragment, useState } from "react";
import { EWRA_REGULATORY_PACK, heatCellColor } from "../../config/ewraRegulatoryPack";
import DriveLink from "./DriveLink";
import AgentAiTag from "../agents/AgentAiTag";
import { Card } from "../ui";

type Tab = "methodology" | "snapshot";

export default function EwraRegulatoryPack({ defaultTab = "methodology" }: { defaultTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const { methodology, snapshot } = EWRA_REGULATORY_PACK;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={() => setTab("methodology")}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${tab === "methodology" ? "bg-ai/20 border-ai" : "border-line text-muted"}`}>
          Methodology document
        </button>
        <button type="button" onClick={() => setTab("snapshot")}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${tab === "snapshot" ? "bg-ai/20 border-ai" : "border-line text-muted"}`}>
          Q2 2026 approved snapshot
        </button>
      </div>

      {tab === "methodology" && (
        <Card className="p-0 overflow-hidden border-line">
          <DocHeader
            title={methodology.title}
            meta={[
              ["Document ID", methodology.documentId],
              ["Status", methodology.status],
              ["Approved", `${methodology.approvedDate} · ${methodology.approvedBy}`],
              ["Model", methodology.modelVersion],
              ["Prepared by", methodology.preparedBy],
            ]}
            driveFolder="controlsWorkflows"
            driveDoc="Risk/Heat-map-methodology"
          />
          <div className="p-5 space-y-5 text-[12.5px] leading-relaxed" style={{ color: "#d7ddf0" }}>
            <RegBlock title="Executive summary">{methodology.executiveSummary}</RegBlock>
            <RegBlock title="Regulatory basis">
              <ul className="list-disc pl-5 space-y-1 text-muted m-0">
                {methodology.regulatoryBasis.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </RegBlock>
            {methodology.sections.map((s) => (
              <section key={s.id}>
                <h4 className="text-[13px] font-display font-semibold text-ink m-0 mb-2">{s.id}. {s.heading}</h4>
                <p className="text-muted m-0 mb-2">{s.body}</p>
                {s.bullets && (
                  <ul className="list-disc pl-5 space-y-1 text-muted mb-2">
                    {s.bullets.map((b) => <li key={b}>{b}</li>)}
                  </ul>
                )}
                {s.scoringTable && (
                  <table className="w-full text-[11px] border border-lineSoft rounded-lg overflow-hidden mb-2">
                    <thead><tr className="bg-panel2 text-faint uppercase text-[10px]"><th className="text-left px-3 py-2">Rating</th><th className="text-left px-3 py-2">Criteria</th></tr></thead>
                    <tbody>
                      {s.scoringTable.map((row) => (
                        <tr key={row.rating} className="border-t border-lineSoft">
                          <td className="px-3 py-2 font-semibold whitespace-nowrap">{row.rating}</td>
                          <td className="px-3 py-2 text-muted">{row.criteria}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {s.matrix && (
                  <MatrixGrid rows={s.matrix.rows} cols={s.matrix.cols} cells={s.matrix.cells} />
                )}
                {s.matrix?.legend && (
                  <div className="grid gap-1 text-[11px] text-muted mt-2">
                    {Object.entries(s.matrix.legend).map(([k, v]) => (
                      <div key={k}><span className="font-semibold capitalize text-ink">{k}:</span> {v}</div>
                    ))}
                  </div>
                )}
                {"interpretation" in s && s.interpretation && (
                  <p className="text-[11px] text-muted italic mt-2 m-0">{String(s.interpretation)}</p>
                )}
                {"governance" in s && s.governance && (
                  <p className="text-[11px] text-muted mt-2 m-0"><b className="text-ink">Governance:</b> {String(s.governance)}</p>
                )}
              </section>
            ))}
          </div>
        </Card>
      )}

      {tab === "snapshot" && (
        <Card className="p-0 overflow-hidden border-line">
          <DocHeader
            title={snapshot.title}
            meta={[
              ["Document ID", snapshot.documentId],
              ["Period", snapshot.assessmentPeriod],
              ["Approved", `${snapshot.approvedDate} · ${snapshot.approvedBy}`],
              ["Next review", snapshot.nextReview],
            ]}
            driveFolder="evidenceRisk"
            driveDoc="Risk/Heat-maps/EWRA-Q2-2026"
          />
          <div className="p-5 space-y-5 text-[12.5px] leading-relaxed" style={{ color: "#d7ddf0" }}>
            <RegBlock title="Executive summary">{snapshot.executiveSummary}</RegBlock>
            <div className="grid grid-cols-3 gap-2 max-md:grid-cols-2">
              {snapshot.keyMetrics.map((m) => (
                <div key={m.label} className="p-3 rounded-xl border border-lineSoft bg-panel2">
                  <div className="text-[10px] text-faint uppercase">{m.label}</div>
                  <div className="font-display text-xl font-bold text-ink mt-0.5">{m.value}</div>
                  <div className="text-[10.5px] text-muted mt-1">{m.detail}</div>
                </div>
              ))}
            </div>
            <RegBlock title="Approved heat map — Q2 2026">
              <MatrixGrid rows={snapshot.matrix.rows} cols={snapshot.matrix.cols} cells={snapshot.matrix.cells} />
              <p className="text-[11px] text-muted mt-2 m-0">{snapshot.matrix.totalThemes} enterprise risk themes assessed.</p>
            </RegBlock>
            <RegBlock title="Priority remediations (red / amber zone)">
              <div className="space-y-2">
                {snapshot.priorityRemediations.map((r) => (
                  <div key={r.id} className="p-3 rounded-xl border border-lineSoft bg-panel2 text-[11px]">
                    <div className="flex flex-wrap gap-2 items-baseline">
                      <span className="mono text-faint">{r.id}</span>
                      <b>{r.theme}</b>
                      <span className="pill text-[9px] bg-hi/15 text-hi">{r.inherent} × {r.controlRating}</span>
                    </div>
                    <div className="text-muted mt-1">Control {r.control} · Owner: {r.owner} · Target: {r.targetDate}</div>
                    <div className="mt-1">{r.status}</div>
                  </div>
                ))}
              </div>
            </RegBlock>
            <RegBlock title="Board conclusion">{snapshot.boardConclusion}</RegBlock>
            <div className="p-4 rounded-xl border border-ai/30 bg-ai/5 text-[12px]">
              <div className="text-[10px] text-faint uppercase mb-2">MLRO certification</div>
              <p className="m-0 text-muted italic">{snapshot.certification}</p>
              <div className="mt-3 font-semibold">{snapshot.signatory.name}</div>
              <div className="text-muted text-[11px]">{snapshot.signatory.title} · {snapshot.signatory.date}</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function DocHeader({
  title, meta, driveFolder, driveDoc,
}: {
  title: string;
  meta: [string, string][];
  driveFolder: "controlsWorkflows" | "evidenceRisk";
  driveDoc: string;
}) {
  return (
    <div className="px-5 py-4 border-b border-line bg-panel2">
      <AgentAiTag agent="sayed">Regulator-ready · board-approved</AgentAiTag>
      <h3 className="m-0 mt-2 text-base font-display text-ink">{title}</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-[11px] max-md:grid-cols-1">
        {meta.map(([k, v]) => (
          <div key={k}><span className="text-faint">{k}: </span><span className="text-muted">{v}</span></div>
        ))}
      </div>
      <DriveLink folderKey={driveFolder} docPath={driveDoc} label="Authoritative copy (Google Drive)" className="mt-3" />
    </div>
  );
}

function RegBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[12px] font-display font-semibold text-ink m-0 mb-2 uppercase tracking-wide">{title}</h4>
      {children}
    </div>
  );
}

function MatrixGrid({ rows, cols, cells }: { rows: string[]; cols: string[]; cells: number[][] }) {
  return (
    <div className="grid gap-1 text-[11px] max-w-md" style={{ gridTemplateColumns: `100px repeat(${cols.length}, 1fr)` }}>
      <div />
      {cols.map((c) => (
        <div key={c} className="text-center text-muted text-[10px] px-1">{c.replace(" control", "")}</div>
      ))}
      {rows.map((row, ri) => (
        <Fragment key={row}>
          <div className="text-muted text-[10px] flex items-center pr-2">{row.replace(" inherent", "")}</div>
          {cells[ri].map((val, ci) => (
            <div key={`${ri}-${ci}`} className="rounded-lg py-2.5 text-center font-semibold text-[#020A18] text-[11px]"
              style={{ background: heatCellColor(ri, ci, val) }}>
              {val}
            </div>
          ))}
        </Fragment>
      ))}
    </div>
  );
}
