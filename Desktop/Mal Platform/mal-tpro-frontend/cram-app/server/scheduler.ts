import cron from "node-cron";
import { isReviewDue, reRate } from "../src/engine/rerating";
import { appendAssessment, appendAudit, latestByCustomer } from "./db/auditStore";

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

export function startScheduler() {
  if (cronTask) return;

  const demo = process.env.SCHEDULER_DEMO !== "0";
  if (demo) {
    cronTask = cron.schedule("*/10 * * * *", () => { void runPeriodicReviews(); });
    nextRunAt = "every 10 min (demo)";
  } else {
    cronTask = cron.schedule("0 2 * * *", () => { void runPeriodicReviews(); });
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);
    nextRunAt = tomorrow.toISOString();
  }

  void appendAudit({
    actor: "scheduler", action: "scheduler.started",
    entity: "scheduler", entityId: "periodic-review",
    detail: demo ? "Nightly 02:00 + demo tick every 10 min" : "Nightly 02:00",
  });
}

export async function schedulerStatus() {
  const latest = await latestByCustomer();
  const now = new Date();
  const dueNow = latest.filter((a) => isReviewDue(a, now)).length;
  return {
    running: cronTask !== null,
    schedule: process.env.SCHEDULER_DEMO !== "0" ? "0 2 * * * + */10 * * * * (demo)" : "0 2 * * *",
    nextRunAt, lastRun, dueNow, customerCount: latest.length,
  };
}
