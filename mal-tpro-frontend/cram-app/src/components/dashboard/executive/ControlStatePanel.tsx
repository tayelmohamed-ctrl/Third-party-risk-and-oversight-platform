import { Card } from "../../ui";
import { PERIMETERS } from "../../../config/perimeters";
import { usePerimeter } from "../../../context/PerimeterContext";
import type { ControlStateRow } from "../../../lib/executiveDashboard";

function statusDot(status: ControlStateRow["status"]) {
  if (status === "ok") return "bg-low";
  if (status === "warn") return "bg-med";
  if (status === "error") return "bg-hi";
  return "bg-faint";
}

export default function ControlStatePanel({ rows }: { rows: ControlStateRow[] }) {
  const { perimeter } = usePerimeter();
  const label = PERIMETERS[perimeter].label;

  return (
    <Card>
      <div className="px-4 py-3 border-b border-line">
        <h3 className="m-0 text-sm font-display">Control state · {label}</h3>
        <p className="text-[11px] text-muted mt-1 mb-0">System health — live signals only where wired to API.</p>
      </div>
      <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3 max-md:grid-cols-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start gap-2">
            <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${statusDot(r.status)}`} aria-hidden />
            <div className="min-w-0">
              <div className="text-[11px] text-muted">{r.label}</div>
              <div className="text-[12px] font-semibold text-ink truncate">{r.value}</div>
              {!r.live && <div className="text-[9px] text-faint">Config reference — not live-probed</div>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
