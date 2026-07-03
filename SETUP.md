# Mal Platform — full restore guide

Use this to run the project on a **new laptop** from GitHub with the same code that is saved today.

## 1. Clone the saved branch

```bash
git clone git@github.com:tayelmohamed-ctrl/Third-party-risk-and-oversight-platform.git
cd Third-party-risk-and-oversight-platform
git checkout main
```

## 2. Prerequisites

- **Node.js** 20+ and **npm**
- **Docker Desktop** (PostgreSQL for FinCrime OS + optional TPRO backend)
- **Git** with SSH access to GitHub

## 3. FinCrime OS (CRAM app) — primary platform

```bash
cd mal-tpro-frontend/cram-app
cp .env.example .env          # edit if needed; defaults work for local dev
npm install
npm run db:up                 # PostgreSQL on localhost:5433
npm run db:migrate            # apply Prisma schema
npm run dev                   # Vite :5174 + API :3010
```

Open **http://localhost:5174**

| Area | Route |
|------|--------|
| Dashboard / CRAM Test Bench | `/` `/test-bench` |
| Transaction Monitoring & Purpose codes | `/transaction-monitoring` |
| Regulatory Management / Corridor EWRA | `/regulatory-management` |
| Partner Oversight | `/partner` |
| Investigation Hub | `/investigation` |

## 4. Partner / TPRO backend (optional — live partner data)

Second terminal:

```bash
cd backend
cp .env.example .env
docker compose up --build      # API :3001
```

Partner UI at **http://localhost:5174/partner** proxies to `/tpro-api` → `3001`.

## 5. Legacy partner shell (standalone Vite)

```bash
cd mal-tpro-frontend
npm install
npm run dev                    # :5173 — single-file platform only
```

## 6. Verify

```bash
cd mal-tpro-frontend/cram-app
npm test                       # 247 tests should pass
npm run build
```

## 7. What is in Git vs local-only

| In Git (saved) | Not in Git (local only) |
|----------------|-------------------------|
| All source, configs, JSON libraries, tests | `node_modules/` — run `npm install` |
| `regulatory_monitor_state.json` (Sayed monitor snapshot) | `.env` — copy from `.env.example` |
| CRAM methodology `.docx` in `public/` | Docker Postgres **data volume** — empty DB until migrate; re-seed via app |
| Purpose code catalog JSON + PDF generators | |
| `.partnerships-extract/` — partner contracts & due diligence PDFs (~113MB) | |

## 8. Re-import purpose catalog from Excel (optional)

If you update `Mal_Transaction_Purpose_Code_Catalog_v1.xlsx`:

```bash
cd mal-tpro-frontend/cram-app
npx tsx scripts/import-transaction-purpose-catalog.ts ~/Downloads/Mal_Transaction_Purpose_Code_Catalog_v1.xlsx
```

## 9. Snapshot tags

| Tag | Meaning |
|-----|---------|
| `save-2026-07-03` | Full code snapshot including TM purpose catalog, CRAM exports, partner compliance |

---

**Repo:** [Third-party-risk-and-oversight-platform](https://github.com/tayelmohamed-ctrl/Third-party-risk-and-oversight-platform)  
**Branch:** `main`
