import { useNavigate } from "react-router-dom";
import { Card } from "../../ui";
import type { TimeCriticalRow } from "../../../lib/executiveDashboard";

export default function TimeCriticalPanel({ rows, loading }: { rows: TimeCriticalRow[]; loading: boolean }) {
  const nav = useNavigate();

  return (
    <Card>
      <div className="px-4 py-3 border-b border-line flex items-center justify-between">
        <h3 className="m-0 text-sm font-display">Time-critical alerts (SLA)</h3>
        <span className="text-[10px] text-faint">{rows.length} active</span>
      </div>
      {loading ? (
        <div className="p-6 text-center text-muted text-sm">Loading alerts…</div>
      ) : rows.length === 0 ? (
        <div className="p-6 text-center text-muted text-sm">No SLA-critical items.</div>
      ) : (
        <div className="divide-y divide-lineSoft">
          {rows.slice(0, 6).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => nav(r.route)}
              className="w-full text-left px-4 py-3 hover:bg-panel2/50 transition border-none bg-transparent cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[12px] font-semibold text-ink">{r.alertType}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.slaMs <= 0 ? "bg-hi/20 text-hi" : r.slaMs < 8 * 3600_000 ? "bg-med/20 text-med" : "bg-panel2 text-muted"}`}>
                      {r.slaLabel}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted mt-1">{r.listOrSource} · {r.requiredAction} · {r.owner}</div>
                  {r.constraint && (
                    <div className="text-[10px] text-med mt-1 font-semibold">{r.constraint}</div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
