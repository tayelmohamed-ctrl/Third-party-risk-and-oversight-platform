# Phase prompts — paste one at a time, after each phase is green

Work one phase at a time. Only move on when the phase's tests pass and you've
reviewed the output. Each prompt assumes Claude has already read the kit (kickoff).

---

## Phase 1 — Foundations
Build the monorepo skeleton from `docs/01-BUILD-SPEC.md`: workspaces for
`packages/engine`, `apps/api`, `apps/web`, `packages/db`, `packages/seed-loader`.
Create the PostgreSQL schema + migrations for every table in §3 (config/reference
versioned; assessment/audit append-only — enforce append-only at the DB level).
Write a seed loader that imports all `seed/data/*` as model version
`CRAM-CBUAE-2026-05-FREEZE-01` (status = draft), adding the derived OVR columns
(class, active_flag with OVR-001..007 LOCKED, auto_evaluated, segment_applicability).
Validate on load: each factor-weight column sums to 100%; country firm_score present.
Stand up auth/RBAC roles (Analyst, Reviewer, MLRO, ConfigMaker, ConfigChecker,
ServiceAccount) as a skeleton. Add a smoke test proving the seed loaded
(251 countries, 736 professions, 169 activities, 20 OVR rules).

## Phase 2 — Scoring engine (NP), pure + tested
Implement `@cram/engine` exactly per `docs/02-SCORING-ENGINE-CONTRACT.md`:
pre-screening/hard stops (§2), parameter & factor scoring with re-normalisation
(§3), raw composite (§4), override floor + precedence (§5), the **parameterised
band boundary** (§6, run dual), final rating + outcomes + result object (§7),
missing-data BLOCKED. Pure functions, decimal math, no I/O. Encode all NP-relevant
golden vectors in `docs/04` as tests and make them green. Show me the test report.

## Phase 3 — Engine (LP) + reference services
Add LP-New / LP-Existing templates and the reference-derivation services: country
4-component → firm_score (§8), and the **activity/profession sub-model (ISIC Rev. 5,
`docs/06`)**: build an activity resolver (provided ISIC code → `isic_activity_lookup`
typology shortcuts → `isic_aml_mapping` title match → legacy `nature_of_business`
→ theme fallback), take the rule-adjusted base score and `max()` with any matched
`isic_rule_library` keyword/regex rule; profession via `profession.csv` max'd with
`isic_profession_guidance`. Expose the resolved ISIC code, matched rule_ids, base
score, final score, CDD/EDD and controls in the result (explainability). Wire
nature-of-business score 4, restricted goods (VH02), country firm_score 4 and
Category-A nexus to prohibition. Unmapped activity/profession → at least Medium +
remediation flag (never Low). Pass the LP, activity-typology and prohibition golden vectors.

## Phase 4 — Application, workflow, API
Build the assessment workflow over A–H sections; screening-orchestrator adapter
interfaces (sanctions/PEP/adverse-media/watchlist) that normalise to
Clear/Potential/True/FP/Pending and auto-evaluate OVR-001/008/009; the append-only
audit writer; the config service with maker-checker (Maker≠Checker, OVR-001..007
locked → 403, weight-sum validation); the review scheduler (EDATE by rating, 30-day
grace, overdue restriction) and event-hook intake. Expose the API surface in
`docs/01 §5` with OpenAPI. Pass the config-governance golden vectors (GV-26..29).

## Phase 5 — MLRO web UI
Build screens: new/continue assessment (A–H), review queue (enforce
prepared-by≠reviewed-by), approval for High/prohibited-but-retained, manual MLRO
override with mandatory justification, an **explainability view** (parameter/factor
scores, contributions, composite, triggered overrides, boundary set, final rating),
config maker-checker screens, a Model Governance screen showing the open-items
register and draft→frozen promotion gate, an MI/KRI dashboard, and the CBUAE
exam-pack export. No business logic in the browser — call the API.

## Phase 6 — Hardening & acceptance
Run the 12 mandatory SIT cases and the methodology validation pack; support UAT
sign-off (MLRO + ≥2 officers); set up a parallel-run comparison harness targeting
<0.1% discrepancy vs manual CRR; pen-test the OVR-001..007 lock; confirm audit
immutability; confirm data residency, encryption, performance (<2s p95), RPO/RTO.
Produce the acceptance evidence pack. Do not promote the model version to frozen
until every open item in `docs/05` is dispositioned.

---

## Handy follow-up prompts
- "Explain how rating X was produced for assessment {id} using only the audit block."
- "Add segment FI: load its parameters/weights from the methodology skill into the
  same tables and prove the engine scores it with no engine code change."
- "Generate the OpenAPI client the onboarding team will use to call `/crr/score`."
- "Write the runbook for the MLRO to ratify open item #1 (band boundary) and promote
  a new model version."

---

## Phase 7 — Platform shell & the three agents (Mal FinCrime OS)
After the engine, data and API are solid, build the platform shell to match
`prototypes/Mal-FinCrimeOS-prototype.html` and the blueprint
`docs/08-PLATFORM-ARCHITECTURE.md`. Implement the role-aware left nav and these
screens wired to real data: Executive Dashboard (with the three-agent strip),
CRAM Workspace (regulation→control→workflow→evidence lineage), CRAM Risk Test
Bench (the full customer form + live scoring from `@cram/engine`, loading the FULL
seed libraries — 736 professions, 251 countries, 830 ISIC activities), Investigation
Hub (Mohsen's 6-step preparation pipeline + evidence-linked narrative), Reporting
Centre (Jana drafts SAR/STR/board/exam packs), and Governance (model version,
locked hard stops, open items, draft→frozen gate). Use the three agents by name —
**Sayed** (understand & score, CRAM + Test Bench), **Mohsen** (investigate, Hub),
**Jana** (report, Reporting) — each "prepares; the human decides," each action in
the immutable audit trail with a `cram_ref`. Match the dark design system
(Space Grotesk / Inter / JetBrains Mono; tokens in the blueprint §14). Do not put
business logic in the browser — call the API.
