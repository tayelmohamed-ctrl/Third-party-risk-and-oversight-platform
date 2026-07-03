# 00 — Product Brief

## What we are building
An internal **Customer Risk Assessment (CRAM) system** that calculates a
customer's AML/CFT risk rating (Low / Medium / High / Prohibited) at onboarding,
periodic review, and on trigger events; applies mandatory overrides and floors;
and drives the resulting CDD/EDD treatment, approval authority, review frequency
and monitoring intensity. It replaces today's spreadsheets with a consistent,
auditable, configurable engine that can demonstrate compliance to CBUAE.

Model reference: **CRAM-CBUAE-2026-05-FREEZE-01**.

## Who uses it
- **MLRO / Head of Compliance** — owns the model. Approves High / prohibited-but-retained
  cases, applies/authorises manual overrides, ratifies configuration (weights, band
  boundary, OVR active-status, reference libraries) via maker-checker, reads MI/KRIs,
  and generates the CBUAE examination pack. Needs explainability on every decision.
- **Compliance Analyst (prepared-by) & Reviewer (reviewed-by)** — capture inputs,
  run an assessment, review outcomes. Cannot self-approve their own work (SoD).
- **Product / Engineering team** — integrate the scoring API into onboarding, core
  banking and TM; extend reference data; operate the platform. They need a clean,
  documented, versioned API and a deterministic engine they can test.

## What "done" looks like
- Score the four assessment templates (NP-New, NP-Existing, LP-New, LP-Existing)
  end-to-end, producing the final rating + four outcome fields + full audit block.
- All hard stops / floors enforced and non-bypassable; manual MLRO override path
  with mandatory justification.
- Reference libraries (country, profession, nature-of-business, product/service/
  channel, OVR) served from versioned config; changeable without code.
- Every documented golden test vector passes; engine matches manual calc to 0.0001.
- Immutable audit + reproducible historical assessments bound to model/reference versions.
- A scoring API for the product team and an MLRO web UI for operating + governing the model.

## Scope notes / phasing
- The consolidated master BRD quantifies **NP and LP** segments (5 factors each).
  The methodology skill additionally defines **FI** (6 factors incl. systems-and-controls),
  **MER**, **EMP** and an **EXT** extension. Build NP + LP first (Phase 1–4), then
  extend to FI/MER/EMP via the same engine and config — do not fork the engine.
- Out of scope (consume/notify only): transaction-monitoring rules, SAR/STR filing,
  customer-facing UI, anti-fraud scoring. CRAM publishes the rating to those systems.
