# Third-Party Risk & Oversight Platform

A lightweight Third-Party Risk Management (TPRM) and oversight platform for
tracking vendors, controls, oversight cases, regulatory changes, risk
assessments, and findings.

The repository is organized so the **data spec is the source of truth**, a small
**API** serves it over HTTP, and the **frontend renders from the API with a
seeded offline fallback**:

```
.
├── spec/        # JSON source of truth (data + JSON Schema)
│   ├── schema.json
│   ├── third-parties.json
│   ├── assessments.json
│   ├── findings.json
│   ├── controls.json
│   ├── cases.json
│   └── reg-changes.json
├── server/      # Zero-dependency mock REST API (http://localhost:3001/api)
│   └── index.js
└── frontend/    # Vite + React (JSX) app (http://localhost:5173)
    ├── Mal_ThirdParty_Risk_Oversight_Platform.jsx   # the single-file app
    └── src/      # entry point + styles
```

## Quick start

Open two terminals.

**1. API** (`http://localhost:3001`):

```bash
cd server
npm start          # or: node index.js
```

**2. Frontend** (`http://localhost:5173`):

```bash
cd frontend
npm install        # or pnpm install
npm run dev        # Vite dev server, fixed to port 5173
```

Then open http://localhost:5173. The header shows **Online · API** when it can
reach the API, or **Offline · seeded data** when it falls back to the bundled
seed.

> The frontend works **without** the API running — it loads the seeded data from
> `spec/` (persisted to `window.localStorage`) and continues to support
> create/update/delete locally. When the API is reachable, reads and writes go to
> it instead.

## API routes

Base URL: `http://localhost:3001/api`

Resources: `controls`, `cases`, `reg-changes`

| Method   | Path                    | Description                  |
| -------- | ----------------------- | ---------------------------- |
| `GET`    | `/api/health`           | Health check + resource list |
| `GET`    | `/api/:resource`        | List all records             |
| `GET`    | `/api/:resource/:id`    | Get a single record          |
| `POST`   | `/api/:resource`        | Create a record              |
| `PUT`    | `/api/:resource/:id`    | Update a record              |
| `DELETE` | `/api/:resource/:id`    | Delete a record              |

Examples:

```
GET    http://localhost:3001/api/controls
POST   http://localhost:3001/api/cases
PUT    http://localhost:3001/api/cases/case-001
DELETE http://localhost:3001/api/reg-changes/reg-005
```

The server seeds its in-memory store from `spec/*.json` at startup and enables
CORS so the Vite app on `:5173` can call it directly.

## Frontend data access

`frontend/Mal_ThirdParty_Risk_Oversight_Platform.jsx` contains the data layer.
Each resource is read and written through `fetch()` against `API_BASE`
(`http://localhost:3001/api`); every call is wrapped so that any network/HTTP
error falls back to the seeded data in `window.localStorage`:

- **read** → `GET /api/:resource`, else seeded cache
- **create** → `POST /api/:resource`, else append to cache
- **update** → `PUT /api/:resource/:id`, else patch cache
- **delete** → `DELETE /api/:resource/:id`, else remove from cache

## Data spec (source of truth)

All data lives in [`spec/`](./spec) as JSON validated by
[`spec/schema.json`](./spec/schema.json). See [`spec/README.md`](./spec/README.md)
for the entity model, enums, and relationships.

## Tech stack

- React 18 + Vite 6 (frontend, single-file app)
- Node.js built-in `http` (zero-dependency mock API)
- JSON + JSON Schema (draft-07) data spec
- Plain CSS for a self-contained, dependency-light UI
