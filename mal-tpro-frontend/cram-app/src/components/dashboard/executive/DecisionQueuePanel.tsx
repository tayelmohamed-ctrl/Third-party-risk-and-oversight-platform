import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../ui";
import type { DecisionRow } from "../../../lib/executiveDashboard";
import DecisionApprovalModal from "./DecisionApprovalModal";

function PriorityBadge({ p }: { p: DecisionRow["priority"] }) {
  const cls =
    p === "P0" ? "bg-hi/20 text-hi border-hi/40" : p === "P1" ? "bg-med/20 text-med border-med/40" : "bg-panel2 text-muted border-line";
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${cls}`}>{p}</span>;
}

function CategoryBadge({ row }: { row: DecisionRow }) {
  const labels: Record<string, string> = {
    pep: "PEP",
    str_sar: "STR/SAR",
    onboarding: "Onboarding",
    governance: "Governance",
    partner: "Partner",
    standard: "Standard",
  };
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded bg-panel2 border border-line text-faint uppercase">
      {labels[row.category] ?? row.category}
    </span>
  );
}

export default function DecisionQueuePanel({ rows, loading }: { rows: DecisionRow[]; loading: boolean }) {
  const nav = useNavigate();
  const [activeRow, setActiveRow] = useState<DecisionRow | null>(null);

  return (
    <>
      <Card>
        <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-2">
          <h3 className="m-0 text-sm font-display">Needs decision (today)</h3>
          <span className="text-[10px] text-faint font-semibold">{rows.length} item(s)</span>
        </div>
        {loading ? (
          <div className="p-6 text-center text-muted text-sm">Loading queue…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-muted text-sm">No decisions queued for this perimeter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-faint text-[9px] uppercase tracking-wide border-b border-lineSoft">
                  <th className="text-left font-semibold px-4 py-2">Pri</th>
                  <th className="text-left font-semibold py-2">Type</th>
                  <th className="text-left font-semibold py-2">Age</th>
                  <th className="text-left font-semibold py-2">Entity</th>
                  <th className="text-left font-semibold py-2">Reason</th>
                  <th className="text-left font-semibold py-2">Approver</th>
                  <th className="text-right font-semibold px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 8).map((r) => (
                  <tr key={r.id} className="border-b border-lineSoft hover:bg-panel2/40">
                    <td className="px-4 py-2.5"><PriorityBadge p={r.priority} /></td>
                    <td className="py-2.5"><CategoryBadge row={r} /></td>
                    <td className="py-2.5 text-muted mono text-[11px]">{r.ageingHours}h</td>
                    <td className="py-2.5">
                      <div className="font-medium text-ink truncate max-w-[120px]">{r.entity}</div>
                      <div className="text-[10px] text-faint mono">{r.entityId}</div>
                    </td>
                    <td className="py-2.5 text-muted max-w-[180px]">{r.reason}</td>
                    <td className="py-2.5 text-[10px] text-muted max-w-[120px]">
                      {r.primaryApproverLabel}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        className="btn text-[10px] py-1 px-2 mr-1"
                        onClick={() => setActiveRow(r)}
                      >
                        Decide
                      </button>
                      <button type="button" className="btn-ghost btn text-[10px] py-1 px-2" onClick={() => nav(r.route)}>
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <DecisionApprovalModal row={activeRow} onClose={() => setActiveRow(null)} />
    </>
  );
}
