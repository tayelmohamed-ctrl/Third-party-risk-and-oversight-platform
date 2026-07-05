import { useNavigate } from "react-router-dom";
import { Card } from "../../ui";
import type { ActionKpi } from "../../../lib/executiveDashboard";

export default function ActionKpiRow({ kpis }: { kpis: ActionKpi[] }) {
  const nav = useNavigate();

  return (
    <div className="grid grid-cols-3 gap-3 max-md:grid-cols-1">
      {kpis.map((k) => (
        <button
          key={k.id}
          type="button"
          onClick={() => nav(k.route)}
          className="text-left border-none bg-transparent p-0 cursor-pointer w-full group"
        >
          <Card className="p-4 transition group-hover:border-ai/40 group-hover:bg-panel2/30">
            <div
              className={`font-display font-bold text-[28px] tracking-tight ${
                k.severity === "hi" ? "text-hi" : k.severity === "med" ? "text-med" : "text-low"
              }`}
            >
              {k.value}
            </div>
            <div className="text-muted text-[11.5px] mt-0.5">{k.label}</div>
            <div className="text-[10px] text-faint mt-2">{k.hint}</div>
            {!k.live && (
              <span className="text-[9px] text-faint mt-1 inline-block">Awaiting live feed</span>
            )}
          </Card>
        </button>
      ))}
    </div>
  );
}
