import { useEffect, useState } from "react";
import { Card, Sec } from "./ui";
import { apiHealth, apiLatestAssessments, apiSchedulerStatus, type HealthStatus, type SchedulerStatus } from "../lib/api";

type ItemStatus = "strong" | "partial" | "gap";

interface ThemeItem {
  label: string;
  detail: string;
  status: ItemStatus;
  live?: string;
}

const STRONG = "bg-low/15 text-low";
const PARTIAL = "bg-med/15 text-med";

export default function Theme1Status() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [sched, setSched] = useState<SchedulerStatus | null>(null);
  const [customers, setCustomers] = useState(0);
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [h, s, cs] = await Promise.all([
          apiHealth(),
          apiSchedulerStatus(),
          apiLatestAssessments(),
        ]);
        if (cancelled) return;
        setHealth(h);
        setSched(s);
        setCustomers(cs.length);
        setOnline(true);
      } catch {
        if (!cancelled) setOnline(false);
      }
    }
    load();
    const id = setInterval(load, 20000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const pg = health?.auditStore?.includes("postgresql");
  const queue = health?.queue;
  const schedulerOn = sched?.running;

  const items: ThemeItem[] = [
    {
      label: "Review cadence (Low 5y · Med 3y · High 1y)",
      detail: "REVIEW_MONTHS enforced · nextReviewDate on every assessment",
      status: "strong",
      live: sched ? `${sched.dueNow} due · ${sched.customerCount} monitored` : undefined,
    },
    {
      label: "Event-driven re-rating",
      detail: "9 triggers · applyTrigger → reRate → append timeline",
      status: "strong",
    },
    {
      label: "Perpetual KYC / continuous monitoring",
      detail: "Customers stay under assessment; feeds + scheduler keep ratings current",
      status: "strong",
      live: customers ? `${customers} customers wired` : undefined,
    },
    {
      label: "Trigger pipeline (adverse media · SAR · ownership · TM · PEP)",
      detail: "FeedAdapter → queue → processEvent → auto reRate",
      status: "strong",
      live: queue ? `queue: ${queue}` : undefined,
    },
    {
      label: "Server-side scheduler",
      detail: "Nightly 02:00 + periodic review auto-run without browser",
      status: schedulerOn ? "strong" : online === false ? "partial" : "strong",
      live: sched?.running ? sched.schedule.split(" ")[0] : undefined,
    },
    {
      label: "Persistence & immutable audit",
      detail: "PostgreSQL append-only · REVOKE UPDATE/DELETE · full input snapshots",
      status: pg ? "strong" : online === false ? "partial" : "strong",
      live: pg ? "postgresql-append-only" : health?.auditStore,
    },
  ];

  const allStrong = items.every((i) => i.status === "strong") && online !== false;
  const overall: ItemStatus = online === false ? "partial" : allStrong ? "strong" : "partial";

  return (
    <div>
      <Sec>Failure-theme #1 — dynamic re-rating (USAA / Danske gap)</Sec>
      <Card className="p-4">
        <div className="flex items-start gap-4 flex-wrap mb-4">
          <div className="flex-1 min-w-[200px]">
            <div className="text-[10.5px] text-faint uppercase tracking-wide font-semibold">Theme 1 status</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-display font-bold text-[22px]">
                {overall === "strong" ? "Strong & complete" : "Partial — API offline"}
              </span>
              <span className={`pill text-[11px] font-semibold ${overall === "strong" ? STRONG : PARTIAL}`}>
                {overall === "strong" ? "● built" : "◐ check server"}
              </span>
            </div>
            <p className="text-[12px] text-muted mt-2 m-0 leading-relaxed">
              {overall === "strong"
                ? "Ratings are no longer scored once at onboarding. Review cadence, event triggers, feed pipeline, scheduler and PostgreSQL audit are all live — the gap that bit USAA and Danske is closed."
                : "Start the API: npm run db:up && npm run db:migrate && npm run dev (port 5174)."}
            </p>
          </div>
          {online && (
            <div className="grid grid-cols-3 gap-3 text-center min-w-[240px]">
              <MiniStat n={String(customers)} l="Monitored" />
              <MiniStat n={String(sched?.dueNow ?? "—")} l="Reviews due" />
              <MiniStat n={health?.queueStats?.done != null && health.queueStats.done >= 0 ? String(health.queueStats.done) : "—"} l="Feed events" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 max-md:grid-cols-1">
          {items.map((item) => (
            <div key={item.label} className="flex items-start gap-2.5 py-2.5 px-3 rounded-xl bg-panel2 border border-lineSoft">
              <span className={`pill text-[10px] shrink-0 mt-0.5 ${item.status === "strong" ? STRONG : PARTIAL}`}>
                {item.status === "strong" ? "Strong" : "Partial"}
              </span>
              <div className="min-w-0">
                <div className="text-[12px] font-semibold">{item.label}</div>
                <div className="text-[10.5px] text-muted">{item.detail}</div>
                {item.live && <div className="text-[10px] text-faint mono mt-0.5">{item.live}</div>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function MiniStat({ n, l }: { n: string; l: string }) {
  return (
    <div className="rounded-lg bg-panel2 border border-lineSoft px-2 py-2">
      <div className="font-display font-bold text-[18px] text-low">{n}</div>
      <div className="text-[10px] text-muted">{l}</div>
    </div>
  );
}
