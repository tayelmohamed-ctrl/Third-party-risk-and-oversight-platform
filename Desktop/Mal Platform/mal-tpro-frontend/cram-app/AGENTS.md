# AGENTS.md — CRAM build

This repository builds the **Customer Risk Assessment (CRAM) tool** for a CBUAE
digital bank (model `CRAM-CBUAE-2026-05-FREEZE-01`). This file orients any AI
coding agent (Cursor, Claude, etc.). Read it first, then `docs/00-PRODUCT-BRIEF.md`.

## Source of truth (read before coding)
- `docs/knowledge/` — three skills that encode the methodology, the BRD, and the
  technical handbook. These are authoritative for *logic*.
- `docs/01-BUILD-SPEC.md` — architecture, stack, modules, data model, RBAC, APIs, phases.
- `docs/02-SCORING-ENGINE-CONTRACT.md` — the exact scoring pipeline and formulas. **Read this before any engine code.**
- `docs/03-REFERENCE-DATA-GUIDE.md` — how the reference libraries (country, profession, etc.) are modelled and loaded.
- `docs/04-GOLDEN-TEST-VECTORS.md` — deterministic cases the engine must pass.
- `docs/05-OPEN-ITEMS-REGISTER.md` — known reconciliation items awaiting MLRO ratification.
- `docs/06-ACTIVITY-RISK-ISIC.md` — how business-activity (LP/MER) & profession (NP) are scored via the official ISIC Rev. 5 AML mapping.
- `seed/data/` — the real reference data already extracted (251 countries, 736 professions, 169 activities, 20 OVR rules, factor weights, product baselines, sanctions programme, and the **ISIC Rev. 5 AML activity mapping (830 entries) + 18-rule typology library**).
- `docs/08-PLATFORM-ARCHITECTURE.md` — the full **Mal FinCrime OS** blueprint: CRAM as the brain; three agents **Sayed / Mohsen / Jana**; modules, IA, navigation, user journeys, ER & data-flow diagrams, AI interaction model, the CRAM Risk Test Bench spec.
- `docs/PARTNER-PORTAL-VISION.md` — **Partner Portal** (`/partner`) product philosophy, UX principles, lifecycle, gamification, and quality bar. Read before any Partner Oversight UI or workflow change.
- `prototypes/Mal-FinCrimeOS-prototype.html` — clickable visual target for the platform shell.
- `prototypes/cram-scoring-mock.html` — standalone working scoring-engine mock (visual target for the Risk Test Bench).
- `docs/09-MAL-DESIGN-SYSTEM.md` — Mal brand-aligned UI tokens (palette, Outfit/Inter, logomark, voice). The UI must match this and the prototypes.

## Non-negotiables
See `.cursor/rules/cram-core.mdc`. In short: non-dilution, locked hard stops,
no default-to-Low, unrounded thresholds, parameterised band boundary, immutable
audit, reproducibility, segregation of duties, pure deterministic engine, decimal
math, config-not-code.

## Definition of done (per feature)
1. Implements the cited doc section (reference it in comments).
2. Has tests, including the relevant golden vectors; engine matches manual calc within 0.0001.
3. Produces a full explainability/audit record.
4. Respects RBAC and SoD.
5. No hard-coded weights, boundaries or scores — all from config/seed.

## Build order
Follow the phases in `docs/01-BUILD-SPEC.md` §Delivery plan and the prompts in
`prompts/`. Do not jump to the UI before the engine + tests are green.

## House style
- Monorepo; the engine is an isolated package with zero infrastructure deps.
- Small, reviewed commits; conventional-commit messages.
- Comment non-obvious compliance logic with the doc reference (e.g. `// CRAM 7.3.2 override-to-High`).
