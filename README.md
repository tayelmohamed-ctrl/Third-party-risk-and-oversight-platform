# Third-Party Risk & Oversight Platform

A lightweight Third-Party Risk Management (TPRM) and oversight platform for
tracking vendors, risk assessments, findings, and continuous monitoring across
the vendor portfolio.

The repository is organized so the **data spec is the source of truth** and the
**frontend renders directly from it**:

```
.
├── spec/        # JSON source of truth (data + JSON Schema)
│   ├── schema.json
│   ├── third-parties.json
│   ├── assessments.json
│   └── findings.json
└── frontend/    # Vite + React (JSX) single-page app that reads ../spec
    └── src/
```

## Features

- **Dashboard** — portfolio metrics: third-party counts, open findings, due/overdue
  assessments, residual-risk distribution, and a weighted portfolio risk score.
- **Third parties** — searchable, filterable inventory with per-vendor detail
  pages (risk profile, assessments, findings, relationship metadata).
- **Assessments** — security, privacy, financial, operational, and compliance
  assessments with status and posture scores.
- **Findings** — issue tracking with severity, status, owner, and remediation
  plans, linked back to vendors and assessments.

## Data spec (source of truth)

All application data lives in [`spec/`](./spec) as JSON validated by
[`spec/schema.json`](./spec/schema.json). The frontend imports these files
directly, so editing the JSON updates the app. See [`spec/README.md`](./spec/README.md)
for the entity model and relationships.

## Running the frontend

Requires Node.js 18+.

```bash
cd frontend
npm install      # or pnpm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # production build into frontend/dist
npm run preview  # preview the production build
```

The dev server is configured (`vite.config.js`) to read the sibling `spec/`
directory so the JSON spec can be imported as the single source of truth.

## Tech stack

- React 18 + React Router (single-page app)
- Vite 6 build tooling
- Plain CSS (no UI framework) for a self-contained, dependency-light UI
- JSON + JSON Schema (draft-07) data spec
