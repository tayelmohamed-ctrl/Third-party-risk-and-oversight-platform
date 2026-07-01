# 28 — SAR Filing Drafts (FFIEC Phase 1, Step 2)

When an investigator escalates a case (`sar_recommended` or `escalate`), Jana auto-generates a **live filing draft** from the investigation case and CBUAE-aligned template library.

## Flow

```
Investigation Hub → Escalate to Jana (SAR/STR)
        ↓
Case disposition (pending_mlro) + audit: case.disposition
        ↓
Jana draft builder → FilingDraft row (PostgreSQL)
        ↓
Audit: filing.draft.created
        ↓
Redirect → Reporting Centre / Filing drafts tab
        ↓
Maker-checker → MLRO approve → manual goAML submission
```

## Template selection

| Condition | Template | Filing type |
|-----------|----------|-------------|
| UAE + executed transaction (amount in metadata) | `RPT-STR-UAE-001` | `str_uae` |
| UAE + attempted/blocked or no amount | `RPT-SAR-UAE-001` | `sar_uae` |
| US license region | `RPT-SAR-US-001` | `sar_us` |

Structured v2 sections are pre-filled from case + evidence. Unresolved fields remain for MLRO completion before goAML/FinCEN submission.

## Regulatory alignment

Draft structure and the in-editor **Regulatory compliance map** follow:

| Source | Application |
|--------|-------------|
| **CBUAE Notice 3354/2022** | goAML cover fields, Introduction → Body → Conclusion, Who/What/When/Where/Why/How, SLA (35bd / 24h / complex 15+30), post-STR §6.2, no tipping-off |
| **Thematic Review — STR Framework (Jan 2023)** | Counterparty screening, disposition rationale, TM rule citation, expected vs observed, related accounts |
| **FFIEC BSA/AML Manual · Appendix L** | SAR narrative quality (Who/What/When/Where/Why/How), supporting documentation, MLRO attestation |
| **FinCEN SAR Form 111** | US-only Part IV/V sections when FIU = FinCEN |

Implementation: `src/config/filingGuidanceRequirements.ts` (`evaluateDraftCompliance`), `src/lib/filingDraftDocument.ts` (35+ section schema), editor compliance panel in `FilingDraftEditor.tsx`.

**Annex 1 anti-patterns** (insufficient narratives) are surfaced in the editor — drafts must not use aggregate-only amounts, missing counterparties, or defensive filing language without genuine suspicion.

## REST API

| Method | Path | Capability | Purpose |
|--------|------|------------|---------|
| GET | `/api/v1/crr/filings/stats` | authenticated | Draft counts by status |
| GET | `/api/v1/crr/filings` | authenticated | List drafts |
| GET | `/api/v1/crr/filings/:id` | authenticated | Draft detail |
| GET | `/api/v1/crr/filings/by-case/:caseId` | authenticated | Drafts for case |
| POST | `/api/v1/crr/filings/from-case/:caseId` | `review` | Manual draft create |
| POST | `/api/v1/crr/filings/:id/submit-review` | `review` | Maker-checker queue |
| POST | `/api/v1/crr/filings/:id/mlro-approve` | `approve_high` | MLRO sign-off |

Disposition response now includes `{ case, filingDraft }`.

## UI

- **Investigation Hub** — Escalate creates draft and navigates to `/reporting?draft={id}`
- **Reporting Centre → Filing drafts** — branded **Mal FinCrime OS** document editor:
  - Mal logo header · confidential STR/SAR layout
  - **FIU destination selector** (UAE goAML · US FinCEN) with editable contact fields
  - Tabbed sections: Cover · Introduction · Narrative · Transactions · Investigation · Compliance · MLRO · FinCEN (US)
  - **Regulatory compliance map** — live score vs CBUAE / Thematic Review / FFIEC App L requirements
  - UAE **STR vs SAR** selector, **expedited (24h)**, **complex investigation**, **defensive filing** attestation
  - **Preview document** — print-ready full text for copy / review pack
  - **Save draft** — persists structured v2 body via PATCH
  - Submit for review → MLRO approve workflow (blockers shown when required fields incomplete)

### Structured draft (v2)

Body schema: `version: 2`, `fiu`, `sections[]`, `renderedText`. Legacy v1 flat drafts auto-upgrade on load in the editor.

## Verify

```bash
# Escalate existing case (MLRO/Reviewer auth)
curl -X POST http://localhost:3010/api/v1/crr/cases/{caseId}/disposition \
  -H "Authorization: Bearer dev:tayel.mohamed@mal.ae:MLRO,Reviewer" \
  -H "Content-Type: application/json" \
  -d '{"disposition":"sar_recommended","notes":"Layering pattern confirmed"}'

# List drafts
curl http://localhost:3010/api/v1/crr/filings \
  -H "Authorization: Bearer dev:tayel.mohamed@mal.ae:MLRO,Reviewer"
```

## Tests

```bash
npm test -- filing-drafts
```

## Next

- ~~OIDC auth~~ — `30-OIDC-AUTH-PHASE1.md`
- ~~FFIEC examination matrix~~ — `31-FFIEC-EXAMINATION-MATRIX.md`

**Phase 1 complete.** Phase 2: goAML API integration (actual FIU submission).
