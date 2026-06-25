Audit the Mal TPRO platform against a production-readiness checklist.

**Project paths**
- Backend:  `/Users/tayelmohamed/Desktop/Mal Platform/backend`
- Frontend: `/Users/tayelmohamed/Desktop/Mal Platform/mal-tpro-frontend`

Run all checks below. For each, read the relevant file or run the relevant command and report:
- ✅ PASS — meets the requirement
- ⚠ WARN — works but needs attention before prod
- ❌ FAIL — must fix before going live

---

**AUTH & SECURITY**
- [ ] `backend/.env`: `AUTH_MODE` must not be `"stub"` in production — check if there's a prod env strategy
- [ ] `backend/src/main.ts`: NestJS Helmet middleware present (`app.use(helmet())`)
- [ ] `backend/src/main.ts`: Rate limiting (`@nestjs/throttler`) applied globally
- [ ] `backend/.env`: `CORS_ORIGIN` is a specific domain, not `*` or `true`
- [ ] `backend/src/`: No hardcoded secrets, API keys, or passwords in source files
- [ ] `mal-tpro-frontend/src/Mal_ThirdParty_Risk_Oversight_Platform.jsx`: The `fetchLive` function calls `api.anthropic.com` directly from the browser with no API key in the source — confirm no key is embedded (look for `x-api-key` header)

**BACKEND RELIABILITY**
- [ ] `GET /api/health` returns `{ ok: true }` — run curl check
- [ ] `backend/package.json`: `start:prod` uses `node dist/src/main.js`, not `ts-node`
- [ ] `backend/docker-compose.yml`: production `command` uses `prisma migrate deploy` (not `migrate dev`)
- [ ] `backend/prisma/schema.prisma`: all models have appropriate indexes for query patterns
- [ ] `backend/src/`: ValidationPipe is global (check `main.ts`)
- [ ] No `console.log` with sensitive data in service files

**FRONTEND**
- [ ] `mal-tpro-frontend/src/`: No hardcoded `localhost` URLs that would break in production
- [ ] `mal-tpro-frontend/vite.config.js`: `server.open: true` should be removed for production builds
- [ ] Run `npm run build` in `mal-tpro-frontend/` — confirm it succeeds with no errors
- [ ] Frontend has an error boundary for when the API is unreachable

**DOCKER & INFRASTRUCTURE**
- [ ] `backend/Dockerfile`: node not running as root (should have `USER node` or similar)
- [ ] `backend/Dockerfile`: uses multi-stage build (build stage + lean runtime stage)
- [ ] `backend/docker-compose.yml`: database port `5432` not exposed on `0.0.0.0` in a production config
- [ ] `backend/docker-compose.yml`: `pgdata` volume defined (already present — confirm)

**DATA & COMPLIANCE**
- [ ] `backend/prisma/seed.ts`: seed is not called automatically on production startup
- [ ] Customer references in cases are pseudonymised (check `CUST-####` pattern in seed/cases data)
- [ ] SAR data is access-restricted (check `@Roles` on `/api/cases/sars`)
- [ ] Audit log has no UPDATE or DELETE operations on `AuditLog` model (check service files)

---

**Output format**

Print a table:

```
Category         | Check                              | Status | Note
-----------------|------------------------------------|--------|------
Auth             | AUTH_MODE not stub                 | ⚠ WARN | set to stub — needs OIDC for prod
...
```

Then print:
```
TOP BLOCKERS (must fix before go-live):
1. ...
2. ...
3. ...

QUICK WINS (low effort, high value):
1. ...
```
