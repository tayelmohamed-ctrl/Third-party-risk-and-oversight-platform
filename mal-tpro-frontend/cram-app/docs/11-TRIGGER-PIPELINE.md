# 11 — Real trigger pipeline (feeds → automatic re-rating)

**Failure mode addressed:** *"no trigger pipeline (adverse media / SAR / ownership change)."*
Re-rating is no longer driven only by people clicking buttons — inbound **signals
from feeds** now drive it automatically.

## Architecture
```
 Real feed (vendor)            Pipeline (built)                     Outcome
 ─────────────────             ───────────────                      ───────
 screening / negative news ─┐
 sanctions/PEP list service ─┤   FeedAdapter.subscribe()     processEvent():
 SAR/goAML filings          ─┼──►  emits FeedEvent  ───────►  1 resolve customer
 transaction monitoring     ─┤                                2 thresholds/rules
 KYC / CRM (ownership,PEP)  ─┘                                3 dedupe (event id)
                                                              4 reRate() + append
                                                                 to timeline (audit)
                                                              5 record in event log
                                                              6 MLRO alert on escalation
```

## What's built
- **`src/pipeline/feeds.ts`** — the integration contract. `FeedAdapter` (one per real
  source), `FeedEvent`, `FeedSource`, and `KIND_TO_TRIGGER` mapping feed kinds to the
  re-rating triggers from `rerating.ts`.
- **`src/pipeline/triggerEngine.ts`** — `processEvent()`: customer matching, a **rules/
  threshold layer** (e.g. adverse-media confidence ≥ 50%, transaction severity ≥ high),
  **idempotent dedupe** by event id, then auto `reRate()` + append to the customer
  timeline. Accepts an injectable `PipelineStore` so the same logic runs in-browser
  and on the server.
- **`server/auditStore.ts`** — **immutable append-only audit store** (JSONL files under
  `data/audit/` — no UPDATE/DELETE API). Persists assessments, feed events, audit log,
  and MLRO alerts.
- **`server/scheduler.ts`** — **server-side periodic-review scheduler** (nightly 02:00 +
  demo tick every 10 min). Runs `reRate(PERIODIC_REVIEW)` for all due customers without
  a browser open.
- **`server/index.ts`** — REST API: `POST /api/v1/crr/events` (webhook intake),
  `GET /api/v1/crr/assessments`, `GET /api/v1/crr/audit`, `GET /api/v1/crr/scheduler/status`,
  `POST /api/v1/crr/scheduler/run`, `GET /api/v1/crr/mlro/alerts`.
- **`src/store/eventStore.ts`** + **`src/store/assessmentStore.ts`** — client wrappers
  that read/write via the server API (no localStorage).
- **`src/pages/Feeds.tsx`** ("Signal Feeds" in the nav) — start the **live pipeline**
  and watch signals stream in and auto-re-rate customers; per-source adapter status;
  manual "fire a signal" buttons; counters (ingested / auto-re-rated / filtered).
- **`src/components/PipelineStatus.tsx`** — live status cards for trigger pipeline,
  server scheduler, immutable audit store, and MLRO alert queue.
- **`src/pipeline/mockFeeds.ts`** — a **feed simulator** (dev only) that emits realistic
  events so the pipeline runs end-to-end today.

## Run locally
```bash
npm install
npm run dev    # starts Vite (5174) + API server (3010) together
```

## Going from simulator to real feeds (one interface per vendor)
Replace the simulator by implementing `FeedAdapter` for each source, e.g.:
```ts
export const acmeAdverseMedia: FeedAdapter = {
  source: "adverse-media",
  label: "Acme negative-news API",
  subscribe(handler) {
    const ws = new WebSocket(ACME_URL);
    ws.onmessage = (m) => {
      const hit = JSON.parse(m.data);
      handler({
        id: hit.eventId, source: "adverse-media", kind: "adverse_media",
        customerId: mapVendorIdToCustomer(hit.subjectId),
        at: hit.timestamp, severity: hit.severity,
        payload: { confidence: hit.score, outlet: hit.source },
        headline: hit.summary,
      });
    };
    return () => ws.close();
  },
};
```
POST each event to `/api/v1/crr/events` (or wire the adapter on the server). Everything
downstream (thresholds, dedupe, re-rating, audit, MLRO alerts) is unchanged.

## Still to do (next phases)
- Move ingestion to a **durable queue** (SQS/Kafka) for high-volume vendor feeds.
- Persist the audit store to **PostgreSQL** with DB-level `REVOKE UPDATE, DELETE`.
- Real **identity resolution** (vendor id → customerId) instead of the demo's direct id.
- Production auth/RBAC on the API surface.
