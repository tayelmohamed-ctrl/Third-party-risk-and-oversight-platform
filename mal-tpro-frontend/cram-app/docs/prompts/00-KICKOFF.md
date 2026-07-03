# Kickoff prompt — paste this into Claude in Cursor (first message)

> Copy everything in the box below into Cursor's Claude chat once this kit is the
> open repository. It points Claude at the knowledge base and sets the first task.
> Don't ask Claude to build everything at once — work phase by phase (next file).

---

You are the lead engineer building the **Customer Risk Assessment (CRAM)** system
for a CBUAE digital bank (model `CRAM-CBUAE-2026-05-FREEZE-01`).

Before writing any code, read, in this order:
1. `AGENTS.md` and `.cursor/rules/cram-core.mdc` (the non-negotiables)
2. `docs/00-PRODUCT-BRIEF.md`
3. `docs/01-BUILD-SPEC.md`
4. `docs/02-SCORING-ENGINE-CONTRACT.md` (the exact scoring logic)
5. `docs/03-REFERENCE-DATA-GUIDE.md` and the files in `seed/data/`
6. `docs/04-GOLDEN-TEST-VECTORS.md` and `docs/05-OPEN-ITEMS-REGISTER.md`
7. `docs/06-ACTIVITY-RISK-ISIC.md` (how business-activity & profession are scored via ISIC Rev. 5)
8. `docs/08-PLATFORM-ARCHITECTURE.md` and the visual targets in `prototypes/` (the platform shell + the three agents Sayed / Mohsen / Jana)
9. The three skills under `docs/knowledge/` for any logic detail you need to expand.

Then, before coding, produce:
- A short **understanding summary** (≤1 page): the scoring pipeline, the
  non-dilution rule, the parameterised band boundary, and the six open items —
  in your own words, so I can confirm you have it right.
- A **proposed repo layout** for the monorepo (engine package, api, web, db,
  seed loader, tests) consistent with `docs/01-BUILD-SPEC.md`.
- A **Phase 1 plan** (foundations: monorepo + DB schema + migrations + seed loader
  + auth/RBAC skeleton) with the files you'll create.

Rules of engagement:
- Implement strictly to the contract. **Do not invent** weights, scores or
  thresholds — everything comes from `seed/` or `docs/`. If something is missing
  or ambiguous, ask me or mark it as an open item; never guess or default to Low.
- The scoring engine is a **pure, deterministic package** (no DB, no clock, no
  network) using **decimal** arithmetic. Weights, boundaries, review intervals and
  the OVR library are **configuration, not code**.
- Every feature ships with tests (including the relevant golden vectors) and a full
  explainability/audit record. Respect segregation of duties.
- Comment compliance logic with the doc reference (e.g. `// CRAM contract §5`).

Wait for my confirmation of the summary and Phase 1 plan before generating code.
Ask me up to three clarifying questions if you need to.
