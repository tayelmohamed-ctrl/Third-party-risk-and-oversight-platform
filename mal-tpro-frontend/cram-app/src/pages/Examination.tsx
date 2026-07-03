import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui";
import {
  apiExaminationReadiness,
  apiListExaminationItems,
  apiPatchExaminationItem,
  apiRefreshExamination,
  type ExaminationItemRecord,
  type ExaminationReadiness,
  type ExaminationStatus,
} from "../lib/api";

const STATUS_STYLE: Record<ExaminationStatus, string> = {
  ready: "bg-low/15 text-low",
  in_progress: "bg-ai/15 text-[#c9b6f5]",
  not_started: "bg-panel2 text-muted",
  gap: "bg-hi/15 text-hi",
  na: "bg-med/15 text-med",
};

export default function Examination() {
  const [readiness, setReadiness] = useState<ExaminationReadiness | null>(null);
  const [items, setItems] = useState<ExaminationItemRecord[]>([]);
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [r, list] = await Promise.all([
      apiExaminationReadiness(),
      apiListExaminationItems(),
    ]);
    setReadiness(r);
    setItems(list.items);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const domains = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of items) map.set(i.domainId, i.domainName);
    return [...map.entries()];
  }, [items]);

  const filtered = useMemo(
    () => (domainFilter === "all" ? items : items.filter((i) => i.domainId === domainFilter)),
    [items, domainFilter],
  );

  async function handleRefresh() {
    setBusy(true);
    try {
      const result = await apiRefreshExamination();
      setReadiness(result.readiness);
      const list = await apiListExaminationItems();
      setItems(list.items);
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: ExaminationStatus) {
    setBusy(true);
    try {
      await apiPatchExaminationItem(id, { status });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-panel2 border-lineSoft">
        <p className="text-[12px] text-muted m-0">
          FFIEC BSA/AML Examination Manual procedure tracker — maps examination areas to live platform evidence.
          Auto-probes refresh from training, cases, filings, and validation stores.
        </p>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Readiness score", value: readiness ? `${readiness.readinessScore}/100` : "—", tone: "text-low" },
          { label: "Procedures ready", value: readiness ? `${readiness.ready}/${readiness.ready + readiness.inProgress + readiness.gaps + readiness.notStarted}` : "—", tone: "text-ink" },
          { label: "In progress", value: readiness?.inProgress ?? "—", tone: "text-ai" },
          { label: "Gaps", value: readiness?.gaps ?? "—", tone: readiness?.gaps ? "text-hi" : "text-muted" },
          { label: "Not started", value: readiness?.notStarted ?? "—", tone: "text-muted" },
        ].map((s) => (
          <Card key={s.label} className="p-3">
            <div className="text-[10px] text-faint uppercase">{s.label}</div>
            <div className={`text-xl font-display font-bold mt-1 ${s.tone}`}>{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button type="button" className="btn text-[11px]" disabled={busy} onClick={() => void handleRefresh()}>
          Refresh live probes
        </button>
        <select className="input text-[11px]" value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)}>
          <option value="all">All domains</option>
          {domains.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <Link to="/audit" className="btn btn-ghost text-[11px] ml-auto">Audit trail →</Link>
      </div>

      {readiness && readiness.domains.length > 0 && (
        <Card className="p-4">
          <div className="text-[10px] text-faint uppercase font-semibold mb-3">Domain readiness</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {readiness.domains.map((d) => (
              <div key={d.domainId} className="p-2 rounded-lg bg-panel2 border border-lineSoft text-[11px]">
                <div className="font-semibold">{d.domainName}</div>
                <div className="text-muted mt-1">{d.ready}/{d.total} ready · {d.pct}%</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-line bg-panel2 text-[10px] uppercase text-faint font-semibold">
          Examination matrix · {filtered.length} items
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-faint border-b border-lineSoft text-left">
                <th className="px-4 py-2 font-semibold">Domain</th>
                <th className="px-4 py-2 font-semibold">Procedure</th>
                <th className="px-4 py-2 font-semibold">FFIEC ref</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2 font-semibold">Score</th>
                <th className="px-4 py-2 font-semibold">Evidence</th>
                <th className="px-4 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-lineSoft hover:bg-panel2/40">
                  <td className="px-4 py-2.5">
                    <div className="mono text-[9px] text-faint">{item.id}</div>
                    <div>{item.domainName}</div>
                  </td>
                  <td className="px-4 py-2.5 max-w-xs">{item.procedure}</td>
                  <td className="px-4 py-2.5 text-muted text-[10px]">{item.ffiecRef}</td>
                  <td className="px-4 py-2.5">
                    <span className={`pill text-[9px] ${STATUS_STYLE[item.status]}`}>{item.status.replace("_", " ")}</span>
                  </td>
                  <td className="px-4 py-2.5 mono">{item.autoScore ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    {item.evidenceRoute ? (
                      <Link to={item.evidenceRoute} className="text-ai hover:underline">{item.evidenceRoute}</Link>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      className="input text-[10px] py-1"
                      value={item.status}
                      disabled={busy}
                      onChange={(e) => void setStatus(item.id, e.target.value as ExaminationStatus)}
                    >
                      {(["not_started", "in_progress", "ready", "gap", "na"] as const).map((s) => (
                        <option key={s} value={s}>{s.replace("_", " ")}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
