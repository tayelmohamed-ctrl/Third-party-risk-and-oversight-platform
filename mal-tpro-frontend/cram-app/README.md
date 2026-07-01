# Mal FinCrime OS — CRAM Console

A CRAM-centred Financial Crime Compliance Platform for **Mal**, with three AI agents
(**Sayed** understands & scores · **Mohsen** investigates · **Jana** reports).
Built with Vite + React + TypeScript + Tailwind. Brand-aligned to Mal guidelines.

## Run locally
```bash
cp .env.example .env
npm run db:up          # PostgreSQL (Docker, port 5433)
npm install
npm run db:migrate     # schema + append-only REVOKE/triggers
npm run dev            # Vite (5174) + API (3010)
```

### Partner Oversight (third-party risk platform)
Also start the **TPRO backend** (controls, cases, reg-changes, intelligence) in a second terminal:

```bash
cd ../../backend
cp .env.example .env   # once
docker compose up --build
```

Open **http://localhost:5174/partner** — the full Partner Defense Command UI lives at
`partner/Mal_ThirdParty_Risk_Oversight_Platform.jsx` and calls the TPRO API via the
Vite proxy at `/tpro-api` → `http://localhost:3001/api`. Offline seed/localStorage is
used automatically when the backend is down.

Requires **Docker** for PostgreSQL. See `docs/12-PRODUCTION-INFRA.md` for queue drivers (postgres/sqs/kafka), identity resolution, and RBAC auth tokens.
Build for production:
```bash
npm run build && npm run preview
```

## What's inside
- `src/engine/` — the **pure, deterministic CRAM scoring engine** (factors, weights,
  override floors, non-dilution, parameterised band boundary) + data lookups.
- `src/data/` — the **full seed libraries** (251 countries, 736 professions, 830 ISIC
  activities, nature-of-business, products, override rules, sanctions programme).
- `src/pages/` — Executive Dashboard, CRAM Workspace, **CRAM Risk Test Bench** (live
  scoring), Investigation Hub (Mohsen's 6-step pipeline), Reporting Centre (Jana),
  Governance. Regulatory & Screening are scaffolded stubs.
- `src/components/` — Layout (sidebar/topbar), Mal logomark, shared UI.
- `docs/` — the full build kit: product brief, build spec, scoring-engine contract,
  reference-data guide, golden test vectors, open items, ISIC logic, platform
  architecture blueprint, **Mal design system**, the non-technical guide, and the
  three skills under `docs/knowledge/`.
- `.cursor/rules/` + `AGENTS.md` — guardrails Cursor applies automatically.
- `seed/` — the source CSV/JSON libraries + schemas.

## Continue building in Cursor
Open this folder in Cursor. The `.cursor/rules` and `AGENTS.md` set the
non-negotiables (non-dilution, locked hard stops, no default-to-Low, immutable
audit, segregation of duties, AI-prepares/humans-decide, the three agent names,
and the Mal brand). Then work through `docs/` and the phase prompts in `docs/`
(the `prompts/` set is also in the build kit) to wire the remaining modules,
the database, auth/roles and the audit store.

## Honest scope note
Functional front-end + **production-grade API**: PostgreSQL append-only audit (DB-level
REVOKE UPDATE/DELETE), durable feed queue (postgres/SQS/Kafka), vendor identity resolution,
OIDC/RBAC auth, server-side scheduler, and the full CRAM scoring engine. Managed HA infra
and bank IdP wiring are deployment tasks — see `docs/12-PRODUCTION-INFRA.md`.
