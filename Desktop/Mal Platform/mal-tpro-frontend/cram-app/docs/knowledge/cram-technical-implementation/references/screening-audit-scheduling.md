# CRAM Technical Reference — Screening, Audit, Retention and Scheduling

Covers the screening orchestrator and result-handling SLAs, the immutable
audit-field list and retention policy, the review-scheduler logic, and the
event-hook rescore priorities.

## 1. Screening vendors and orchestration (5.1)

The Screening Orchestrator must call:
1. UN/UAE TFS and sanctions list provider (**primary + secondary**).
2. PEP commercial database.
3. Adverse-media provider.
4. Internal watchlist store.

All results must be normalised to: **Clear / Potential Match / True Match /
False Positive / Pending**.

## 2. Screening result handling rules (5.2)

| Result | Override triggered | System action | SLA |
|---|---|---|---|
| True Match (Sanctions) | **OVR-001: Hard Stop** | Block activation. Alert MLRO. Freeze where legally required. Generate SAR/STR referral | Immediate (real-time) |
| Potential Match (Sanctions) | Hold | Suspend application. Notify Compliance queue. Block activation until disposition | 4 hours |
| True Match (PEP) | **OVR-008: High Floor** | Score PEP factor as High. Require MLRO approval and EDD before activation | Same session |
| True Match (Adverse Media) | **OVR-009: High or Reject** | Score adverse media as High. Flag for Compliance review with severity assessment | 4 hours |
| True Match (Watchlist) | **OVR-002: Reject** | Block activation. Notify Compliance. Document rejection rationale | Immediate |
| Pending (any) | Hold | Suspend. Notify Compliance. **Maximum hold 48 hours** before escalation | 48 hours |
| Clear (all) | None | Proceed to scoring phase | N/A |

## 3. Mandatory audit fields (6.1)

Every CRR record must store, immutably:
- `crr_id` (UUID), `customer_id`, `segment`, `lifecycle`, `assessment_id`, `assessment_officer`
- `scored_at` (UTC timestamp), `model_version_id`
- All parameter scores: `factor`, `param_name`, `input`, `score (1/2/3)`, `weight`
- All factor scores and factor weights
- `composite_score` (4 decimal places), `math_rating`
- All screening results: `type`, `result`, `disposition`, `disposer`, `disposition_at`
- All override evaluations: `rule_id`, `triggered (true/false)`, `outcome`
- `final_rating`, `override_floor`, `override_notes`
- `approval_authority`, `approved_by`, `approved_at`
- `manual_override_flag`, `manual_override_rationale`, `manual_override_approver`, `override_expiry`

## 4. Retention policy (6.2)

- CRR records: minimum **5 years** after relationship end.
- Screening records: minimum **5 years** after relationship end.
- Configuration change log: minimum **5 years** after version retirement.
- Override log: minimum **5 years** after event.

All audit records are **write-once** and must not be modifiable or deletable by
any user — including system administrators — except under a documented, approved
data-correction process with full before/after audit.

## 5. Review scheduler logic (7.1)

```
def schedule_next_review(final_rating, scored_at):
    if final_rating == 'Low':        review_due = scored_at + 36 months
    if final_rating == 'Medium':     review_due = scored_at + 24 months
    if final_rating == 'High':       review_due = scored_at + 12 months
    if final_rating == 'Prohibited': review_due = N/A
    return review_due
```

- **Grace period:** 30 calendar days.
- **After grace period:** flag as **Overdue**; notify Compliance within 5
  business days; **restrict new product activations and limit increases** for the
  customer.
- **Methodology refinement:** apply a **6-month** cycle (not 12) for very-high-risk
  High customers — PEP / digital-fraud / correspondent — where risk appetite
  requires it.

## 6. Event hooks for rescore trigger (7.2)

| Event | Source system | Rescore priority |
|---|---|---|
| SAR/STR filed | AML/Compliance system | IMMEDIATE — within 4 hours |
| Sanctions screening list update (any near-match) | Screening Orchestrator | IMMEDIATE |
| Activity: turnover >3× expected in rolling 30 days | Transaction monitoring | SAME DAY |
| New PEP identification (screening refresh) | Screening Orchestrator | SAME DAY |
| New UBO/ownership change (LP/MER/FI) | Onboarding/KYC update | SAME DAY |
| Product limit increase or new high-risk product | Product system | PRE-ACTIVATION |
| Geolocation anomaly (VPN/TOR/impossible travel) | Digital/fraud signals | SAME SESSION or NEXT DAY |
| Adverse media discovery (periodic refresh) | Screening Orchestrator | WITHIN 48 HOURS |
