# Contributing

## Prerequisites

- Node.js 20+
- Docker Desktop (PostgreSQL)
- Read [SETUP.md](../SETUP.md) once before contributing

## Before opening a PR

```bash
cd mal-tpro-frontend/cram-app
npm install
npm test
npm run build
```

## Pull requests

- Target branch: **`main`**
- Use the PR template (auto-filled on GitHub)
- One logical change per PR when possible
- Link related issues if applicable

## Commit messages

- Start with a verb: `Add`, `Fix`, `Update`, `Refactor`
- First line ≤ 72 characters
- Body explains **why**, not only what

## Code layout

Do not move application folders without updating imports, Vite config, Docker paths, and tests. See [README.md](../README.md) repository layout.
