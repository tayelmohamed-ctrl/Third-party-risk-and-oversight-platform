import express from "express";
import cors from "cors";
import type { Assessment } from "../src/engine/rerating";
import { connectDb } from "./db/client";
import {
  allAssessments, allAuditLog, allFeedEvents, appendAssessment,
  historyFor, latestByCustomer, openMlroAlerts, storeEmpty,
} from "./db/auditStore";
import { ingestFeedEvent, resolveInboundEvent, type InboundFeedEvent } from "./pipeline";
import { runPeriodicReviews, schedulerStatus, startScheduler } from "./scheduler";
import { seedIfEmpty } from "./seed";
import { authMiddleware, rbacMiddleware } from "./auth/middleware";
import { requireCapability } from "./auth/rbac";
import { governAssessmentSubmission } from "./overrideGovernance";
import { seedPlatformUsers } from "./auth/seedPlatformUsers";
import { validateDataQuality, type AssessmentCapture, type KycQualityContext } from "../src/engine/dataQualityGate";
import { allVendorMappings, upsertVendorMapping } from "./identity/resolver";
import { getFeedQueue, startQueueWorker } from "./queue";
import {
  getModelGovernance, listValidationRuns, promoteModelToFrozen, runValidation, seedModelGovernanceIfEmpty,
} from "./db/validationStore";
import { registerWebhookRoutes, registerScreeningRoutes } from "./routes/screening";
import { registerOnboardingWebhookRoutes, registerOnboardingRoutes } from "./routes/onboarding";
import { registerOscilarWebhookRoutes, registerTmRoutes } from "./routes/tm";
import { registerRegulatoryRoutes } from "./routes/regulatory";
import { registerInvestigationRoutes } from "./routes/investigations";
import { registerFilingRoutes } from "./routes/filings";
import { registerTrainingRoutes } from "./routes/training";
import { registerPublicAuthRoutes, registerAuthRoutes } from "./routes/auth";
import { seedTrainingIfEmpty } from "./training/orchestrator";
import { registerExaminationRoutes } from "./routes/examination";
import { registerExamPackRoutes } from "./routes/examPack";
import { registerGovernanceRoutes } from "./routes/governance";
import { registerCtrRoutes } from "./routes/ctr";
import { registerRetentionRoutes } from "./routes/retention";
import { seedExaminationIfEmpty } from "./examination/orchestrator";
import { seedOpenItemsIfEmpty } from "./governance/openItemsStore";
import { seedConfigVersionsIfEmpty, loadAllActiveConfigIntoRuntime } from "./config/configStore";
import { seedCtrIfEmpty } from "./ctr/orchestrator";
import { seedLegalHoldIfEmpty } from "./retention/orchestrator";
import type { FeedSource } from "../src/pipeline/feeds";

const PORT = Number(process.env.PORT ?? 3010);
const app = express();

app.use(cors());
app.use(express.json());

// Public health (no auth)
app.get("/api/v1/crr/health", async (_req, res) => {
  const sched = await schedulerStatus();
  const queue = getFeedQueue();
  const qStats = await queue.stats();
  res.json({
    ok: true,
    auditStore: "postgresql-append-only",
    queue: queue.driver,
    queueStats: qStats,
    scheduler: sched.running,
    auth: process.env.AUTH_MODE ?? "dev",
    integrations: {
      phase0Complete: true,
      phase: "2",
      screeningAuthority: "vital4",
      vital4Mode: process.env.VITAL4_API_KEY ? "live" : "mock",
      shuftiMode: process.env.SHUFTIPRO_API_KEY && process.env.SHUFTIPRO_MODE !== "mock" ? "live" : "mock",
      oscilarMode: process.env.OSCILAR_API_KEY && process.env.OSCILAR_MODE !== "mock" ? "live" : "mock",
    },
  });
});

registerWebhookRoutes(app);
registerOnboardingWebhookRoutes(app);
registerOscilarWebhookRoutes(app);
registerPublicAuthRoutes(app);

app.use(authMiddleware);

app.post("/api/v1/crr/seed", async (_req, res) => {
  const seeded = await seedIfEmpty();
  res.json({ seeded, empty: await storeEmpty() });
});

app.get("/api/v1/crr/assessments", async (_req, res) => {
  res.json({ latest: await latestByCustomer(), all: await allAssessments() });
});

app.get("/api/v1/crr/history/:customerId", async (req, res) => {
  res.json(await historyFor(req.params.customerId));
});

registerAuthRoutes(app);

app.post("/api/v1/crr/assessments", async (req, res) => {
  const body = req.body as Assessment & {
    overrideJustification?: string;
    capture?: AssessmentCapture;
    kycContext?: KycQualityContext;
  };
  if (!body?.id || !body?.customerId || !req.user) {
    res.status(400).json({ error: "invalid assessment" });
    return;
  }

  if (body.capture && body.kycContext) {
    const dq = validateDataQuality(body.capture, body.kycContext);
    if (dq.status === "BLOCKED") {
      res.status(422).json({ error: "data_quality_blocked", verdict: dq });
      return;
    }
  }

  const wantsOverride = !!(body.input?.manualOverride);
  try {
    requireCapability(req.user.roles, wantsOverride ? "override" : "score");
  } catch (e) {
    const err = e as Error & { status?: number };
    res.status(err.status ?? 403).json({ error: err.message });
    return;
  }

  const governed = governAssessmentSubmission(body, req.user);
  if (!governed.ok) {
    res.status(governed.status).json({ error: governed.error, detail: governed.detail });
    return;
  }

  await appendAssessment(governed.assessment);
  res.status(201).json(governed.assessment);
});

/** Enqueue feed event (durable) or sync-process when X-CRAM-Sync: true (UI demo). */
app.post("/api/v1/crr/events", rbacMiddleware, async (req, res) => {
  const raw = req.body as InboundFeedEvent;
  if (!raw?.id || !raw?.kind || !raw?.source) {
    res.status(400).json({ error: "invalid feed event" });
    return;
  }
  if (!raw.customerId && !raw.vendorSubjectId) {
    res.status(400).json({ error: "customerId or vendorSubjectId required" });
    return;
  }

  const resolution = await resolveInboundEvent(raw);
  if ("error" in resolution) {
    res.status(422).json({ error: resolution.error, deadLetter: true });
    return;
  }

  if (req.headers["x-cram-sync"] === "true") {
    const result = await ingestFeedEvent(resolution.event);
    res.json(result);
    return;
  }

  const queue = getFeedQueue();
  await queue.publish(resolution.event);
  res.status(202).json({ accepted: true, eventId: resolution.event.id, queue: queue.driver });
});

app.get("/api/v1/crr/events", async (_req, res) => {
  res.json(await allFeedEvents());
});

app.get("/api/v1/crr/audit", rbacMiddleware, async (_req, res) => {
  res.json(await allAuditLog());
});

app.get("/api/v1/crr/mlro/alerts", rbacMiddleware, async (_req, res) => {
  res.json(await openMlroAlerts());
});

app.get("/api/v1/crr/scheduler/status", async (_req, res) => {
  res.json(await schedulerStatus());
});

app.post("/api/v1/crr/scheduler/run", rbacMiddleware, async (_req, res) => {
  res.json(await runPeriodicReviews());
});

app.get("/api/v1/crr/queue/stats", async (_req, res) => {
  const queue = getFeedQueue();
  res.json({ driver: queue.driver, ...(await queue.stats()) });
});

app.get("/api/v1/crr/identity/mappings", rbacMiddleware, async (_req, res) => {
  res.json(await allVendorMappings());
});

app.post("/api/v1/crr/identity/mappings", rbacMiddleware, async (req, res) => {
  const { vendorId, source, customerId, customerName } = req.body as {
    vendorId: string; source: FeedSource; customerId: string; customerName: string;
  };
  if (!vendorId || !source || !customerId || !customerName) {
    res.status(400).json({ error: "vendorId, source, customerId, customerName required" });
    return;
  }
  const row = await upsertVendorMapping(vendorId, source, customerId, customerName);
  res.status(201).json(row);
});

/** Model validation — independent golden vectors, back-test, outcome analysis (SR 11-7). */
app.get("/api/v1/crr/validation/governance", rbacMiddleware, async (_req, res) => {
  res.json(await getModelGovernance());
});

app.get("/api/v1/crr/validation/runs", rbacMiddleware, async (_req, res) => {
  res.json(await listValidationRuns());
});

app.post("/api/v1/crr/validation/run", rbacMiddleware, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  res.status(201).json(await runValidation(req.user.email));
});

app.post("/api/v1/crr/validation/promote", rbacMiddleware, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const result = await promoteModelToFrozen(req.user.email);
  if (!result.ok) {
    res.status(422).json({ error: result.error, state: result.state });
    return;
  }
  res.json(result);
});

registerScreeningRoutes(app);
registerOnboardingRoutes(app);
registerTmRoutes(app);
registerRegulatoryRoutes(app);
registerInvestigationRoutes(app);
registerFilingRoutes(app);
registerTrainingRoutes(app);
registerExaminationRoutes(app);
registerExamPackRoutes(app);
registerGovernanceRoutes(app);
registerCtrRoutes(app);
registerRetentionRoutes(app);

async function bootstrap() {
  await connectDb();
  await seedPlatformUsers();
  await seedModelGovernanceIfEmpty();
  await seedOpenItemsIfEmpty();
  await seedConfigVersionsIfEmpty();
  await loadAllActiveConfigIntoRuntime();
  await seedCtrIfEmpty();
  await seedLegalHoldIfEmpty();
  await seedIfEmpty();
  await seedTrainingIfEmpty();
  await seedExaminationIfEmpty();
  startScheduler();

  await startQueueWorker(async (event) => {
    await ingestFeedEvent(event);
  });

  app.listen(PORT, () => {
    console.log(`CRAM API running on http://localhost:${PORT}`);
    console.log(`PostgreSQL append-only audit · queue=${process.env.QUEUE_DRIVER ?? "postgres"} · auth=${process.env.AUTH_MODE ?? "dev"}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
