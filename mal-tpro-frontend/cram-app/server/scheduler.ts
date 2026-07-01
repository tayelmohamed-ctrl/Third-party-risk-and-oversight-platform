import cron from "node-cron";
import { isReviewDue, reRate } from "../src/engine/rerating";
import { appendAssessment, appendAudit, latestByCustomer } from "./db/auditStore";
import { runRegulatorySourceCheck } from "./regulatory/monitor";
import { SAYED_REGULATORY_MONITOR } from "../src/config/regulatorySources";
import { runValidation } from "./db/validationStore";
import { runRetentionScheduler } from "./retention/orchestrator";
import { RETENTION_SCHEDULER_CRON } from "../src/config/retentionPolicy";

export interface SchedulerRun {
  at: string;
  dueCount: number;
  processed: number;
  rerated: number;
  customers: { customerId: string; customerName: string; prevRating: string; newRating: string }[];
}

let lastRun: SchedulerRun | null = null;
let nextRunAt: string | null = null;
let cronTask: cron.ScheduledTask | null = null;

export async function runPeriodicReviews(asOf: Date = new Date()): Promise<SchedulerRun> {
  const latest = await latestByCustomer();
  const due = latest.filter((a) => isReviewDue(a, asOf));
  const customers: SchedulerRun["customers"] = [];
  let rerated = 0;

  for (const a of due) {
    const outcome = reRate(a, "PERIODIC_REVIEW", "Scheduled review (server scheduler)", "scheduler", undefined, asOf);
    if (!outcome.ok) {
      await appendAudit({
        actor: "scheduler", action: "scheduler.dq_blocked",
        entity: "customer", entityId: a.customerId,
        detail: outcome.verdict.summary,
      });
      continue;
    }
    const next = outcome.assessment;
    await appendAssessment(next);
    customers.push({
      customerId: a.customerId, customerName: a.customerName,
      prevRating: a.rating, newRating: next.rating,
    });
    if (next.rating !== a.rating) rerated++;
  }

  const run: SchedulerRun = {
    at: asOf.toISOString(), dueCount: due.length,
    processed: due.length, rerated, customers,
  };

  lastRun = run;
  await appendAudit({
    actor: "scheduler", action: "scheduler.periodic_review",
    entity: "scheduler", entityId: run.at,
    detail: `${run.processed} reviews run · ${run.rerated} rating changes`,
  });

  return run;
}

let lastRegulatoryRun: string | null = null;
let lastValidationRun: string | null = null;
let lastRetentionRun: string | null = null;
let regulatoryCronTask: cron.ScheduledTask | null = null;
let validationCronTask: cron.ScheduledTask | null = null;
let retentionCronTask: cron.ScheduledTask | null = null;

async function runQuarterlyValidation() {
  try {
    const { report } = await runValidation("scheduler@quarterly-validation");
    lastValidationRun = report.at;
    await appendAudit({
      actor: "scheduler",
      action: "validation.quarterly",
      entity: "validation_run",
      entityId: report.at,
      detail: `${report.verdict} · ${report.golden.passRate * 100}% golden · ${report.backtest.outcome.summary}`,
      after: report.verdict,
    });
  } catch (e) {
    await appendAudit({
      actor: "scheduler",
      action: "validation.quarterly_failed",
      entity: "scheduler",
      entityId: "quarterly-validation",
      detail: (e as Error).message,
    });
  }
}

export function startScheduler() {
  if (cronTask) return;

  const demo = process.env.SCHEDULER_DEMO !== "0";
  if (demo) {
    cronTask = cron.schedule("*/10 * * * *", () => { void runPeriodicReviews(); });
    nextRunAt = "every 10 min (demo)";
    regulatoryCronTask = cron.schedule(SAYED_REGULATORY_MONITOR.demoCron, () => {
      void runRegulatorySourceCheck("scheduled").then((r) => { lastRegulatoryRun = r.at; });
    });
    validationCronTask = cron.schedule("0 3 1 */3 *", () => { void runQuarterlyValidation(); });
    retentionCronTask = cron.schedule("*/30 * * * *", () => {
      void runRetentionScheduler().then((r) => { lastRetentionRun = r.runId; });
    });
  } else {
    cronTask = cron.schedule("0 2 * * *", () => { void runPeriodicReviews(); });
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);
    nextRunAt = tomorrow.toISOString();
    regulatoryCronTask = cron.schedule(SAYED_REGULATORY_MONITOR.cronUtc, () => {
      void runRegulatorySourceCheck("scheduled").then((r) => { lastRegulatoryRun = r.at; });
    });
    validationCronTask = cron.schedule("0 3 1 1,4,7,10 *", () => { void runQuarterlyValidation(); });
    retentionCronTask = cron.schedule(RETENTION_SCHEDULER_CRON, () => {
      void runRetentionScheduler().then((r) => { lastRetentionRun = r.runId; });
    });
  }

  void runRetentionScheduler().then((r) => { lastRetentionRun = r.runId; }).catch(() => undefined);

  void appendAudit({
    actor: "scheduler", action: "scheduler.started",
    entity: "scheduler", entityId: "periodic-review",
    detail: demo
      ? "Nightly 02:00 + demo tick every 10 min · Sayed reg monitor every 6h (demo)"
      : "Nightly 02:00 · Sayed reg monitor weekly (Mon 05:00 UTC)",
  });

  // Baseline Sayed source check on startup if never run
  void runRegulatorySourceCheck("scheduled").then((r) => { lastRegulatoryRun = r.at; }).catch(() => undefined);
}

export async function schedulerStatus() {
  const latest = await latestByCustomer();
  const now = new Date();
  const dueNow = latest.filter((a) => isReviewDue(a, now)).length;
  return {
    running: cronTask !== null,
    schedule: process.env.SCHEDULER_DEMO !== "0" ? "0 2 * * * + */10 * * * * (demo)" : "0 2 * * *",
    regulatoryMonitor: {
      running: regulatoryCronTask !== null,
      cadence: SAYED_REGULATORY_MONITOR.cadence,
      cronUtc: SAYED_REGULATORY_MONITOR.cronUtc,
      lastRunAt: lastRegulatoryRun,
    },
    quarterlyValidation: {
      running: validationCronTask !== null,
      lastRunAt: lastValidationRun,
    },
    retention: {
      running: retentionCronTask !== null,
      cronUtc: process.env.SCHEDULER_DEMO !== "0" ? "*/30 * * * * (demo)" : RETENTION_SCHEDULER_CRON,
      lastRunId: lastRetentionRun,
    },
    nextRunAt, lastRun, dueNow, customerCount: latest.length,
  };
}
