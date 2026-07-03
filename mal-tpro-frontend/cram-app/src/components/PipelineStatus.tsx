import { useEffect, useState } from "react";
import { apiAuditLog, apiHealth, apiMlroAlerts, apiSchedulerStatus, type HealthStatus, type SchedulerStatus } from "../lib/api";

const OK = "bg-low/15 text-low";
const WAIT = "bg-faint/15 text-faint";

export default function PipelineStatus() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [scheduler, setScheduler] = useState<SchedulerStatus | null>(null);
  const [alerts, setAlerts] = useState(0);
  const [auditCount, setAuditCount] = useState(0);
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const h = await apiHealth();
        if (cancelled) return;
        setHealth(h);
        setOnline(h.ok);
        const [s, a, log] = await Promise.all([
          apiSchedulerStatus(),
          apiMlroAlerts().catch(() => []),
          apiAuditLog().catch(() => []),
        ]);
        if (cancelled) return;
        setScheduler(s);
        setAlerts(a.length);
        setAuditCount(log.length);
      } catch {
        if (!cancelled) setOnline(false);
      }
    }
    load();
    const id = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const pgActive = health?.auditStore?.includes("postgresql");
  const queueLabel = health?.queue ?? "—";
  const qPending = health?.queueStats?.pending;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
      <StatusCard label="Trigger pipeline" value="Built" sub="feeds → queue → processEvent" ok />
      <StatusCard
        label="Durable queue"
        value={online === false ? "Offline" : queueLabel}
        sub={qPending != null && qPending >= 0 ? `${qPending} pending` : "postgres · sqs · kafka"}
        ok={online === true && !!health?.queue}
      />
      <StatusCard
        label="Server-side scheduler"
        value={online === false ? "Offline" : scheduler?.running ? "Running" : "Starting…"}
        sub={scheduler ? `${scheduler.dueNow} due now` : "nightly periodic reviews"}
        ok={online === true && !!scheduler?.running}
      />
      <StatusCard
        label="PostgreSQL audit"
        value={online === false ? "Offline" : pgActive ? "Active" : "—"}
        sub={auditCount ? `${auditCount} entries · REVOKE UPDATE/DELETE` : "append-only + DB triggers"}
        ok={online === true && !!pgActive}
      />
      <StatusCard
        label="MLRO alert queue"
        value={String(alerts)}
        sub="auto-escalations · RBAC protected"
        ok={alerts === 0}
        warn={alerts > 0}
      />
    </div>
  );
}

function StatusCard({ label, value, sub, ok, warn }: { label: string; value: string; sub: string; ok?: boolean; warn?: boolean }) {
  const pill = warn ? "bg-hi/15 text-hi" : ok ? OK : WAIT;
  return (
    <div className="rounded-xl border border-line bg-panel p-3.5">
      <div className="text-[10.5px] text-faint uppercase tracking-wide font-semibold">{label}</div>
      <div className="flex items-center gap-2 mt-1">
        <span className="font-display font-bold text-[18px]">{value}</span>
        <span className={`pill text-[10px] ${pill}`}>{ok ? (warn ? "action" : "✓") : "—"}</span>
      </div>
      <div className="text-[10.5px] text-muted mt-1">{sub}</div>
    </div>
  );
}
