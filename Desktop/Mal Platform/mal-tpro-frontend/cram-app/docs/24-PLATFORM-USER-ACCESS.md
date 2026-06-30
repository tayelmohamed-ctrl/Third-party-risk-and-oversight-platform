# 24 — Platform user access (executive profiles)

Three signed-in access profiles for the Mal FinCrime OS console. In **dev mode** (`AUTH_MODE=dev`), switch users from the header dropdown or the Risk Test Bench.

## Users

| Name | Title | Email | RBAC roles | Primary focus |
|------|-------|-------|------------|---------------|
| **Tayel Mohamed** | Head of Financial Crimes | `tayel.mohamed@mal.ae` | MLRO, Reviewer | Investigations, TM, screening, STR/SAR approval, overrides |
| **Walid Elsheikha** | Head of Compliance | `walid.elsheikha@mal.ae` | MLRO, ConfigChecker | Regulatory, validation sign-off, board MI, config approval |
| **David Henry** | Chief of Product | `david.henry@mal.ae` | Reviewer, ConfigMaker | CRAM model, product risk, propose config — no MLRO override |

## Dev auth tokens (API / curl)

```bash
# Tayel — Head of Financial Crimes
Authorization: Bearer dev:tayel.mohamed@mal.ae:MLRO,Reviewer

# Walid — Head of Compliance
Authorization: Bearer dev:walid.elsheikha@mal.ae:MLRO,ConfigChecker

# David — Chief of Product
Authorization: Bearer dev:david.henry@mal.ae:Reviewer,ConfigMaker
```

## What is implemented

- **`src/config/platformUsers.ts`** — single catalogue of users, roles, and capability helpers
- **`src/lib/authSession.ts`** — sessionStorage persists selected user; API calls send matching Bearer token
- **`src/components/UserAccessSwitcher.tsx`** — header dropdown in Layout
- **`server/auth/seedPlatformUsers.ts`** — upserts users into `app_users` on every API boot
- **`server/auth/middleware.ts`** — `DEV_USERS` derived from platform catalogue

## What is needed for production

1. **Identity provider (OIDC)** — Azure AD, Okta, or bank IdP with MFA enforced
2. **Group → role mapping** — map IdP groups to CRAM roles (`MLRO`, `Reviewer`, `ConfigMaker`, `ConfigChecker`)
3. **Set `AUTH_MODE=oidc`** and configure `OIDC_ISSUER`, `OIDC_AUDIENCE`, `OIDC_JWKS_URI` in `.env`
4. **Provision accounts** in IdP for the three executives with correct group membership
5. **Remove dev Bearer tokens** in production — JWT only
6. **Optional:** SSO login page replacing header switcher; audit log already records `actor` email per action

## Capability matrix (summary)

| Capability | Tayel | Walid | David |
|------------|:-----:|:-----:|:-----:|
| Score / assess | ✓ | ✓ | ✓ |
| Review / screening disposition | ✓ | ✓ | ✓ |
| MLRO override | ✓ | ✓ | — |
| Read audit / MI | ✓ | ✓ | ✓ |
| Config propose | — | — | ✓ |
| Config approve | — | ✓ | — |

Source of truth: `server/auth/rbac.ts` capability matrix.
