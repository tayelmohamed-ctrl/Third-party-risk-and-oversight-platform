import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "../components/ui";
import { apiAuditLog, isApiAvailable, type AuditLogEntry } from "../lib/api";

const ACTION_GROUPS: Record<string, string> = {
  "override.applied": "Override",
  "tm.alert.received": "TM",
  "case.created.from_tm": "Case",
  "case.created.manual": "Case",
  "case.assigned": "Case",
  "case.pipeline_step": "Case",
  "case.disposition": "Case",
  "case.evidence.added": "Case",
  "screening.": "Screening",
  "onboarding.": "Onboarding",
  "regulatory.": "Regulatory",
};

function groupFor(action: string): string {
  for (const [prefix, label] of Object.entries(ACTION_GROUPS)) {
    if (action.startsWith(prefix.replace(".", "")) || action.includes(prefix.replace(".", ""))) {
      if (prefix.endsWith(".")) {
        if (action.startsWith(prefix)) return label;
      } else if (action === prefix) return label;
    }
  }
  if (action.startsWith("screening")) return "Screening";
  if (action.startsWith("case.")) return "Case";
  return "Other";
}

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState<boolean | null>(null);
  const [filter, setFilter] = useState("");
  const [group, setGroup] = useState<string>("all");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const log = await apiAuditLog();
      setEntries(log);
      setOnline(true);
    } catch {
      setEntries([]);
      setOnline(await isApiAvailable());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const groups = useMemo(() => {
    const s = new Set(entries.map((e) => groupFor(e.action)));
    return ["all", ...Array.from(s).sort()];
  }, [entries]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return entries.filter((e) => {
      if (group !== "all" && groupFor(e.action) !== group) return false;
      if (!q) return true;
      return [e.action, e.actor, e.entity, e.entityId, e.detail, e.before, e.after]
        .some((v) => v?.toLowerCase().includes(q));
    });
  }, [entries, filter, group]);

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-4 p-3 border border-line rounded-xl bg-panel2">
        <span className="pill bg-low/15 text-low text-[11px] font-semibold">Append-only · PostgreSQL</span>
        <span className="text-[12px] text-muted">
          Immutable audit trail for overrides, cases, TM alerts, screening, and regulatory actions.
        </span>
        <button type="button" className="btn btn-ghost ml-auto text-[12px]" onClick={() => void refresh()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {online === false && (
        <Card className="p-4 mb-4 border-med/40 bg-med/5">
          <div className="text-[13px] font-semibold text-med">API offline</div>
          <div className="text-[12px] text-muted mt-1">Start the server with <span className="mono">npm run dev</span> to load live audit entries.</div>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap mb-4">
        <input
          type="search"
          placeholder="Search actor, action, entity…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-panel border border-line text-[13px]"
        />
        <select
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="px-3 py-2 rounded-lg bg-panel border border-line text-[13px]"
        >
          {groups.map((g) => (
            <option key={g} value={g}>{g === "all" ? "All groups" : g}</option>
          ))}
        </select>
      </div>

      <Card>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
          <h3 className="m-0 text-sm font-display">Audit log</h3>
          <span className="text-faint text-[11px] ml-auto">{filtered.length} entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-faint text-[10px] uppercase tracking-wide border-b border-line">
                <th className="text-left font-semibold px-4 py-2">Time</th>
                <th className="text-left font-semibold px-4 py-2">Actor</th>
                <th className="text-left font-semibold px-4 py-2">Action</th>
                <th className="text-left font-semibold px-4 py-2">Entity</th>
                <th className="text-left font-semibold px-4 py-2">Detail</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && !loading && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No audit entries yet.</td></tr>
              )}
              {filtered.map((e) => (
                <tr key={e.id} className="border-t border-lineSoft hover:bg-panel2/50">
                  <td className="px-4 py-2.5 mono text-faint whitespace-nowrap">{new Date(e.at).toLocaleString()}</td>
                  <td className="px-4 py-2.5">{e.actor}</td>
                  <td className="px-4 py-2.5">
                    <span className="pill bg-ai/10 text-ai text-[10px]">{e.action}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-muted">{e.entity}</span>
                    <span className="mono text-faint block text-[10px]">{e.entityId}</span>
                  </td>
                  <td className="px-4 py-2.5 text-muted max-w-md truncate" title={e.detail}>{e.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
