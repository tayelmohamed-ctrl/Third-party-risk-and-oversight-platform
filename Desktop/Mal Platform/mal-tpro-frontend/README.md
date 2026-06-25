# Mal — Third-Party Risk & Oversight Platform (frontend)

Runs the real single-file platform (`src/Mal_ThirdParty_Risk_Oversight_Platform.jsx`)
in a browser via Vite.

## Run it
```bash
npm install
npm run dev          # opens http://localhost:5173
```

That's it — the platform appears in your browser. It uses its built-in seeded data
and persists your edits to localStorage (via a shim in index.html), so nothing else
is required to *see and click through* every module.

## Connect it to the backend (end-to-end)
The platform currently reads/writes window.storage (seeded/local). To make it show
LIVE backend data, replace those reads/writes with fetch() calls to the API
(http://localhost:3001/api). Hand this exact task to Claude Code in Cursor:

> "Replace the window.storage reads/writes for controls, cases and reg-changes in
>  src/Mal_ThirdParty_Risk_Oversight_Platform.jsx with fetch() calls to
>  http://localhost:3001/api (see the backend README API table). Keep seeded data
>  as an offline fallback."

The backend already allows CORS from http://localhost:5173.

## Note
This file was built as a Claude artifact. If the dev server reports a missing import
or that `App` isn't found, confirm the first line is `import React, ...` and the
component is `export default function App()` — both are already correct in this copy.
