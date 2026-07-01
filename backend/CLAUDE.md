# Mal — Third-Party Risk & Oversight Platform — Backend

> This file is read automatically by Claude Code at the start of every session.
> It is the contract. When extending the backend, obey it and cross-check against
> the frontend spec before inventing anything.

## Source of truth
- `/frontend/Mal_ThirdParty_Risk_Oversight_Platform.jsx` — the full platform. Every
  module, status, enum, SLA, and rule originates here.
- `/spec/Mal_AMLCFT_Examiner_Framework.json` — the 56 controls / 17 domains / risk weights.
- `/spec/Mal_ThreatAtlas_Dataset.json` — the 55 typologies + corridors.
- `prisma/seed-data/*.json` — the above, normalised for seeding. **Already ported — do not regenerate by hand.**

If a requirement is unclear, read the JSX. Extract; do not paraphrase.

## Stack
NestJS 10 + Prisma 5 + PostgreSQL. TypeScript strictNullChecks on.

## Modules (one per frontend view)
controls (+evidence, +tests, freshness, dashboard) · cases (+DPL, disposition,
four-eyes, SAR) · reg-change (+impact tasks, control-impact map) · crosswalk
(BSA/FATF/Wolfsberg) · typologies · reports (examiner-room, board-pack) · audit
(append-only log + chain verify).

## Auth (STUBBED — intentional)
`src/common/auth/auth.guard.ts` trusts `x-user-id` / `x-user-name` / `x-user-role`
headers when `AUTH_MODE=stub`. The single seam to swap for OIDC (Auth0/Clerk/
Keycloak) is the `mode === 'stub'` branch. Do not scatter auth logic elsewhere.
Roles: SUPERVISOR, CO, MLRO, ANALYST, PARTNER. Use the `@Roles(...)` decorator.

## NON-NEGOTIABLE rules — enforce in services, never trust the UI
1. **Four-eyes / maker-checker** (`cases.service.ts#approve`): the reviewer's id MUST
   differ from the case assignee's id, and only CO/MLRO may approve. A SAR cannot be
   filed until an independent reviewer has approved the disposition.
2. **Control freshness** (`controls.service.ts#freshness`): cadence by risk — Critical 3mo,
   High 6mo, Medium/Low 12mo. States: Current / Due soon (≤30d) / Overdue / Never tested.
3. **Audit log is append-only** (`common/audit`): every mutating request writes one row;
   each row hashes `sha256(prevHash + body)`. Never UPDATE or DELETE AuditLog. `/api/audit/verify`
   re-walks the chain.
4. **Privacy**: customer references are pseudonymous (CUST-####). SAR detail is
   access-restricted; the examiner room exposes register-level metadata only.
5. **Processors are never CDD reliance** (ShuftiPro, Oscilar are processors, not reliance partners).

## Enums (verbatim)
- ControlStatus: OPERATING, PARTIAL, GAP, NOT_IMPLEMENTED
- CaseStatus: OPEN, INVESTIGATING, PENDING_QA, SAR_FILED, CLOSED_NO_SAR, ESCALATED
- Severity + response SLA: P1=4h, P2=24h, P3=48h. SAR clock = 30 days.
- TaskStatus: OPEN, IN_PROGRESS, DONE

## How to extend (checklist for any new module)
1. Add the model(s) to `prisma/schema.prisma`; `npm run prisma:migrate`.
2. `nest g resource modules/<name>` (REST, no CRUD spec).
3. Put business rules in the service; guard mutating routes with `@Roles`.
4. Mutations are audited automatically by the global interceptor — don't re-log.
5. Add seed data to `prisma/seed.ts` if the frontend expects starting rows.
6. `npm run build && npm test`, then commit.

## Fidelity check (run before declaring done)
"List every status enum, SLA constant and control id used in `/frontend/*.jsx`,
then confirm each exists in `schema.prisma` and the seed. Report any gaps."
