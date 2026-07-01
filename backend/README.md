# Mal — Third-Party Risk & Oversight Platform — Backend

NestJS + Prisma + PostgreSQL backend for the Mal third-party risk & oversight
platform. Seeded with the **exact** platform datasets (56 controls, 55 typologies,
14 regulatory changes) so the API returns real data on first run.

It enforces the compliance logic server-side: **four-eyes / maker-checker** on case
dispositions, **risk-based control-test freshness**, and an **append-only,
tamper-evident audit log** (hash chain). Auth is **stubbed** behind one clean seam
so you can drop in Auth0 / Clerk / Keycloak later without touching anything else.

---

## Quick start (Docker — nothing to install but Docker)

```bash
cp .env.example .env
docker compose up --build
# API on http://localhost:3001/api   (migrates + seeds automatically)
curl http://localhost:3001/api/health
```

## Quick start (local Node)

```bash
cp .env.example .env                       # point DATABASE_URL at your Postgres
npm install
npx prisma migrate dev --name init         # creates tables (downloads Prisma engine)
npm run seed                               # loads the 56 controls etc.
npm run start:dev                          # http://localhost:3001/api
```

> Note: `prisma migrate` / `generate` download Prisma's engine binaries on first run.
> That needs outbound access to `binaries.prisma.sh` — fine on a normal machine.

---

## Push this into your repo

```bash
cd mal-tpro-backend
git init
git remote add origin https://github.com/tayelmohamed-ctrl/Third-party-risk-and-oversight-platform.git
git checkout -b backend
git add .
git commit -m "Add NestJS + Prisma backend (controls, cases, reg-change, crosswalk, reports, audit)"
git push -u origin backend
# open a PR into main, or push to main if you prefer
```

Also copy your frontend `.jsx` into `/frontend` and the two dataset JSONs into
`/spec` so `CLAUDE.md` and the seed stay anchored to the source of truth.

---

## Working in Cursor + Claude Code

1. Open the repo folder in Cursor.
2. `npm install -g @anthropic-ai/claude-code`
3. In Cursor's terminal: `claude`
4. Claude Code auto-reads `CLAUDE.md`. Drive it module-by-module
   (e.g. "Add object-storage upload for evidence files to the controls module").

---

## API reference (prefix `/api`)

| Method | Route | Notes |
|---|---|---|
| GET | `/health` | liveness |
| GET | `/controls` | register with freshness |
| GET | `/controls/dashboard` | health, status & freshness breakdown |
| PATCH | `/controls/:id/status` | set status (SUP/CO/MLRO) |
| POST | `/controls/:id/test` | mark tested (sets lastTested) |
| POST | `/controls/:id/evidence` | attach evidence |
| GET | `/cases` · `/cases/queue` · `/cases/sars` · `/cases/:id` | case list / KPIs / SAR register / detail |
| POST | `/cases` | open a case (e.g. from an alert) |
| POST | `/cases/:id/dpl` | add decision-provenance entry |
| POST | `/cases/:id/disposition` | propose SAR / NO_SAR / ESCALATE |
| POST | `/cases/:id/approve` | **four-eyes** — CO/MLRO, must ≠ assignee |
| POST | `/cases/:id/sar` | file SAR (locked until approved) |
| GET | `/reg-changes` · `/reg-changes/summary` · `/reg-changes/impact-map` | feed / KPIs / control pressure |
| PATCH | `/reg-changes/:id/task` | set remediation-task status |
| GET | `/crosswalk?framework=BSA\|FATF\|WOLFSBERG` | coverage per framework |
| GET | `/typologies` · `/typologies/:id` | threat atlas |
| GET | `/reports/examiner-room?period=` | read-only examiner snapshot |
| GET | `/reports/board-pack?period=` | quarterly board pack |
| GET | `/audit?take=` · `/audit/verify` | audit log + chain integrity |

Dev auth: send headers `x-user-role: CO`, `x-user-id: u-co`, `x-user-name: Jason Mullen`.
See `api-smoke.sh` for a full four-eyes walkthrough with curl.

---

## What's needed from your side
- **Postgres** (Docker Compose provides one; use a managed instance in prod).
- **Node 20+**.
- Env vars: `DATABASE_URL`, `CORS_ORIGIN`, and (later) your OIDC issuer/audience.
- **Object store** (S3/Supabase) when evidence files move past metadata.
- **Integration credentials** when wiring the real pipes: Oscilar (monitoring/
  screening), ShuftiPro (IDV), sanctions list feed, SaaScada (ledger), FinCEN BSA E-Filing.

## Honest status
This is a real, runnable backend with the core compliance logic and tamper-evident
audit trail enforced server-side. To be fully production for an MSB it still needs:
real OIDC/RBAC (unstub the guard), the live integrations above, evidence object
storage, automated tests/CI, security testing, and infra hardening. The scaffold is
structured so each slots in without a rewrite.
