# CRAM Technical Reference — SIT Test Pack and UAT Sign-off

This is the handbook's own minimum SIT pack: **TC-001…TC-012**, the **12
mandatory** test cases referenced by the BRD acceptance criteria ("all 12
mandatory SIT test cases pass with zero defects"). It is a distinct set from the
methodology's broader validation pack (TC-001…TC-022) — keep them labelled by
source.

## 1. SIT test cases — minimum required (8.1)

| Test ID | Scenario | Expected outcome |
|---|---|---|
| TC-001 | NP New Onboarding — all parameters Low | Composite ≤1.5 → Final Rating = Low |
| TC-002 | NP New Onboarding — all parameters High | Composite >2.15 → Final Rating = High |
| TC-003 | NP New Onboarding — Sanctions True Match | OVR-001 fires → Final Rating = PROHIBITED → activation blocked |
| TC-004 | NP New Onboarding — PEP True Match (Foreign PEP) | OVR-008 fires → Final Rating = High regardless of composite score |
| TC-005 | NP New Onboarding — Composite = 1.3 (Low) + OVR-008 PEP True Match | Final Rating = High (OVR-008 cannot be diluted) |
| TC-006 | LP New Onboarding — Unable to verify UBO | OVR-004 fires → Final Rating = REJECT |
| TC-007 | FI New Onboarding — Shell bank identified | OVR-005 fires → Final Rating = PROHIBITED → cannot be overridden by a business user |
| TC-008 | Existing NP Review — Activity >3× expected | High trigger → immediate rescore initiated |
| TC-009 | Configuration change — business user attempts to update `CRAM_FACTOR_WEIGHTS` without Checker approval | Rejected with 403 |
| TC-010 | `OVR-001` `active_flag` update via Change Control API | Rejected with 403 (Locked rule) |
| TC-011 | Missing mandatory parameter | Assessment returns BLOCKED status → no final rating computed → activation blocked |
| TC-012 | Country library update (e.g. country moves from White to Grey List) | Composite score for affected customers recalculates at next event or periodic review |

## 2. UAT sign-off requirements (8.2)

- **Compliance sign-off:** all 20 OVR rules behave as documented; hard stops cannot be bypassed.
- **MLRO sign-off:** PEP, adverse-media and sanctions workflows produce correct outcomes.
- **Technology sign-off:** audit trail complete for all test cases; config change control enforced.
- **QA sign-off:** scoring formula produces results matching manual calculation within **0.0001 tolerance**.

## 3. Coverage mapping (for traceability)

| Validates | Test cases |
|---|---|
| Scoring boundaries / band mapping | TC-001, TC-002 |
| Hard stops (non-bypassable) | TC-003 (OVR-001), TC-007 (OVR-005), TC-010 (locked rule) |
| Non-dilution / floors | TC-004, TC-005 (OVR-008) |
| Reject outcomes | TC-006 (OVR-004) |
| Event-driven rescore | TC-008, TC-012 |
| Maker-checker / config governance | TC-009, TC-010 |
| Missing-data BLOCKED handling | TC-011 |
