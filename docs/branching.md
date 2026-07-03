# Branch strategy

## Branches

| Branch | Purpose | Merge target |
|--------|---------|--------------|
| **`main`** | Stable, reviewed code — what you clone for a working platform | — |
| **`feature/*`** | New features and enhancements | `main` via PR |
| **`fix/*`** | Bug fixes | `main` via PR |

## Workflow

1. Branch from latest `main`:
   ```bash
   git checkout main && git pull
   git checkout -b feature/my-change
   ```
2. Commit focused changes with clear messages.
3. Open a **Pull Request** into `main` (template provided).
4. Ensure `npm test` and `npm run build` pass in `mal-tpro-frontend/cram-app`.
5. Merge after review — delete the feature branch.

## What not to commit

- `.env` files (use `.env.example`)
- `node_modules/`, `dist/`
- Local secrets or API keys

## Historical branches

| Branch | Notes |
|--------|--------|
| `feature/fincrime-os-save-jul2026` | Jul 2026 full snapshot — merged into `main` |
| `backend` | Legacy local branch name — use `main` going forward |
