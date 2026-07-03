# 30 — OIDC Authentication (Phase 1 Step 4a)

Production-ready OIDC JWT validation with dev-mode fallback for local development.

## Modes

| `AUTH_MODE` | Behaviour |
|-------------|-----------|
| `dev` (default) | `Bearer dev:<email>:<Roles>` or `X-CRAM-User` headers |
| `oidc` | JWT validated against IdP JWKS; group → role mapping |

## Server

- `server/auth/middleware.ts` — JWT verify via `jose`; strict OIDC (no dev fallback unless `OIDC_ALLOW_DEV_FALLBACK=1`)
- `server/auth/groupMapping.ts` — IdP groups → CRAM roles (`cram-mlro` → `MLRO`, etc.)
- `server/routes/auth.ts` — public config + authorization code token exchange

## Frontend

- `AuthProvider` — bootstraps session from `/auth/config`
- `/auth/login` — redirects to IdP authorize endpoint
- `/auth/callback` — exchanges code via BFF, stores access token
- `UserAccessSwitcher` — dev persona dropdown; read-only SSO chip in OIDC mode

## Env vars

```env
AUTH_MODE=oidc
OIDC_ISSUER=https://your-bank-idp.example.com
OIDC_AUDIENCE=cram-api
OIDC_CLIENT_ID=cram-console
OIDC_CLIENT_SECRET=...
OIDC_REDIRECT_URI=http://localhost:5174/auth/callback
OIDC_SCOPES=openid profile email
OIDC_GROUP_MAP={"cram-mlro":"MLRO","cram-reviewer":"Reviewer"}
VITE_AUTH_MODE=oidc
```

## API

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/v1/crr/auth/config` | public | SPA bootstrap |
| POST | `/api/v1/crr/auth/token` | public | Code → access token |
| GET | `/api/v1/crr/auth/me` | bearer | Current user + capabilities |

## Verify

```bash
curl http://localhost:3010/api/v1/crr/auth/config
```

## Tests

```bash
npm test -- auth-oidc
```
