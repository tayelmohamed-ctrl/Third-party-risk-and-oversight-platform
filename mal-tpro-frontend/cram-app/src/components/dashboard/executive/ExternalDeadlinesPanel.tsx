import { useNavigate } from "react-router-dom";
import { Card } from "../../ui";
import type { ExternalDeadlineRow } from "../../../lib/executiveDashboard";

export default function ExternalDeadlinesPanel({
  rows,
  loading,
}: {
  rows: ExternalDeadlineRow[];
  loading: boolean;
}) {
  const nav = useNavigate();

  return (
    <Card>
      <div className="px-4 py-3 border-b border-line flex items-center justify-between">
        <h3 className="m-0 text-sm font-display">External deadlines</h3>
        <span className="text-[10px] text-faint">{rows.length} due</span>
      </div>
      {loading ? (
        <div className="p-6 text-center text-muted text-sm">Loading deadlines…</div>
      ) : rows.length === 0 ? (
        <div className="p-6 text-center text-muted text-sm">No external deadlines in the next 7 days.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-faint text-[9px] uppercase tracking-wide border-b border-lineSoft">
                <th className="text-left font-semibold px-4 py-2">Counterparty</th>
                <th className="text-left font-semibold py-2">Item</th>
                <th className="text-left font-semibold py-2">Deadline</th>
                <th className="text-left font-semibold py-2">Status</th>
                <th className="text-left font-semibold py-2">Owner</th>
                <th className="text-right font-semibold px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-lineSoft hover:bg-panel2/40">
                  <td className="px-4 py-2.5 font-medium">{r.counterparty}</td>
                  <td className="py-2.5 text-muted max-w-[220px]">{r.title}</td>
                  <td className="py-2.5 text-[11px] mono text-muted">
                    {new Date(r.deadline).toLocaleDateString()}
                  </td>
                  <td className="py-2.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-panel2 border border-line capitalize">
                      {r.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-muted text-[11px]">{r.owner}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button type="button" className="btn text-[10px] py-1 px-2" onClick={() => nav(r.route)}>
                      Open pack
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
