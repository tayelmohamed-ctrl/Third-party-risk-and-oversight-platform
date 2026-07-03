Scaffold a new feature for the Mal Third-Party Risk & Oversight Platform.

Usage: /feature [feature-name]
Example: /feature vendor-questionnaire
Example: /feature partner-alerts

**Platform context**
- Backend: NestJS 10 + Prisma 5 + PostgreSQL, TypeScript strict, global prefix `/api`
- Auth: stub mode (dev) — all mutating routes must use `@Roles(...)` decorator; valid roles: SUPERVISOR, CO, MLRO, ANALYST, PARTNER
- Frontend: React 18 + Vite — single file at `mal-tpro-frontend/src/Mal_ThirdParty_Risk_Oversight_Platform.jsx`
- Audit: every mutation is logged automatically by the global `AuditInterceptor` — do NOT add manual audit calls
- Working directory for backend: `/Users/tayelmohamed/Desktop/Mal Platform/backend`
- CLAUDE.md is the backend contract — read it before starting

**Workflow**

1. If no argument provided, ask: "What feature do you want to build? Describe what it does and who uses it."

2. Once the feature name and description are known, ask these clarifying questions before writing any code:
   - What data does it manage? (what fields, what relationships to existing models)
   - Who can read it? Who can mutate it? (which roles)
   - Does it need seeded data for the UI to be meaningful?
   - What does the frontend view look like? (list view, form, dashboard card — describe or sketch)

3. After confirming the answers, implement in this order:

   **A. Prisma model** — add to `backend/prisma/schema.prisma`
   - Use string IDs with a prefix (e.g. `"VQ-1"`)
   - Use enums for status fields (add to schema)
   - Follow existing relationship patterns (see Case → Typology as reference)

   **B. Migration** — from `backend/`:
   ```bash
   npm run prisma:migrate
   ```

   **C. NestJS module** — from `backend/`:
   ```bash
   npx nest g resource modules/[name] --no-spec
   ```
   Then:
   - Move business logic into the service (controller stays thin)
   - Guard all `@Post`, `@Patch`, `@Delete` routes with `@Roles(...)`
   - Import the new module in `src/app.module.ts`

   **D. Seed data** — add to `backend/prisma/seed.ts` if the frontend needs starting rows.
   Use upsert pattern (see existing typology/control seed code).

   **E. Build + test** — from `backend/`:
   ```bash
   npm run build && npm test
   ```
   Fix any TypeScript or test errors before proceeding.

   **F. Frontend component** — add to the JSX file at the location that matches the feature's navigation position.
   - Follow the existing component pattern: function component, no default export, named consistently with the tab it lives under
   - No external state management — use React `useState` / `useEffect` + fetch to `http://localhost:3001/api/[route]`
   - Include the auth headers: `x-user-id: 1`, `x-user-role: SUPERVISOR`

4. After all steps complete, print:
   ```
   ✓ Feature "[name]" scaffolded
     Backend:  GET/POST /api/[route]  (roles: [...])
     Prisma:   [ModelName] model added + migrated
     Seed:     [N] rows added (or "no seed needed")
     Frontend: [ComponentName] component added at [location in JSX]

   Next steps:
     1. [top thing still to wire up or test]
     2. [second thing]
   ```

**Non-negotiable rules (from CLAUDE.md)**
- Four-eyes on approval flows: reviewer ID must differ from assignee
- Audit log is append-only: never UPDATE or DELETE AuditLog rows
- Processors (ShuftiPro, Oscilar) are never CDD reliance — do not model them as such
- Customer references must be pseudonymous (CUST-####)
