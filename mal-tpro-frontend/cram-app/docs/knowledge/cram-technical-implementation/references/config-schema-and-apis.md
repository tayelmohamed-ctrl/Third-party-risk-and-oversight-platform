# CRAM Technical Reference — Configuration Schema and APIs

Covers the configuration table schema, the `model_version_id` lifecycle, and the
REST API contracts. All configuration changes flow through the Change Control API
with maker-checker; OVR-001…OVR-007 are locked.

## 1. Configuration table schema (3.1)

| Table | Key fields | Version control | Change control |
|---|---|---|---|
| `CRAM_FACTOR_WEIGHTS` | `segment`, `lifecycle`, `factor_name`, `weight`, `effective_from`, `effective_to` | `model_version_id`, `created_by`, `approved_by`, `approved_at` | Maker-checker required; new row per version; prior row expires |
| `CRAM_PARAMETERS` | `segment`, `lifecycle`, `factor_name`, `param_name`, `weight`, `mandatory_flag` | `model_version_id`, `created_by`, `approved_by` | Same as above |
| `CRAM_RATING_DESCRIPTORS` | `param_name`, `score (1/2/3)`, `descriptor_text`, `evidence_required` | `model_version_id` | Compliance approval required for any descriptor change |
| `CRAM_COUNTRY_LIBRARY` | `iso2`, `country`, `fatf_status`, `basel_band`, `ti_band`, `sanctions`, `conflict`, `tax`, `auto_score`, `internal_rating`, `final_rating` | `updated_by`, `approved_by`, `effective_from` | Maker-checker; audit log per change |
| `CRAM_PRODUCT_BASELINE` | `product_code`, `product_name`, `baseline_risk`, `override_notes` | `updated_by`, `approved_by` | Product Governance + Compliance approval |
| `CRAM_OVERRIDE_RULES` | `rule_id (OVR-001..020)`, `outcome`, `priority`, `active_flag` | `model_version_id` | **OVR-001..007: `active_flag = LOCKED`** (not updatable by API). OVR-008..020: maker-checker to change `active_flag` |
| `CRAM_OCCUPATION_LIBRARY` | `occupation_name`, `category`, `risk_rating`, `evidence_requirement` | `updated_by`, `approved_by` | Maker-checker; Compliance approval |

Notes:
- `mandatory_flag` in `CRAM_PARAMETERS` drives the BLOCKED-vs-re-normalise
  behaviour in the scoring engine (mandatory missing → BLOCK; optional missing →
  re-normalise remaining parameter weights).
- `CRAM_COUNTRY_LIBRARY.final_rating` is the resolved country rating that feeds
  the geography factor; `auto_score` + `internal_rating` allow Compliance to
  escalate based on internal typology evidence.

## 2. `model_version_id` lifecycle (3.2)

1. Current active version: `CRAM-CBUAE-2026-June` (canonical frozen identifier `CRAM-CBUAE-2026-05-FREEZE-01`).
2. All scoring records must store the `model_version_id` active at the time of scoring.
3. When configuration changes are approved, the Change Control API increments the version suffix (e.g. `Version-02`) and stores a new `effective_from` timestamp.
4. The prior version remains queryable for historical audit but is not used for new assessments.

## 3. API specifications (Section 4)

### 3.1 Score Customer API

```
POST /api/v1/crr/score
Content-Type: application/json
Authorization: Bearer {compliance_service_token}
```

Request body:
```json
{
  "customer_id": "string",
  "segment": "NP|LP|MER|FI|EMP|EXT",
  "lifecycle": "new_onboarding|existing_review|event_rescore",
  "screening_results": {
    "sanctions": "Clear|Potential|True|FP|Pending",
    "pep": "...",
    "adverse_media": "...",
    "watchlist": "..."
  },
  "parameters": [
    { "factor": "string", "param_name": "string", "score": "Low|Medium|High" }
  ],
  "assessment_officer": "string",
  "assessment_id": "string"
}
```

Response:
```json
{
  "crr_id": "uuid",
  "composite_score": 1.8750,
  "math_rating": "Medium",
  "override_results": [
    { "rule_id": "OVR-008", "triggered": true, "outcome": "HIGH_FLOOR" }
  ],
  "final_rating": "High",
  "model_version_id": "CRAM-CBUAE-2026-June",
  "scored_at": "2026-06-01T09:00:00Z",
  "blocked_parameters": []
}
```

A non-empty `blocked_parameters` array indicates a BLOCKED assessment
(`math_rating = MATH_INCOMPLETE`); no final rating is computed and activation is
blocked.

### 3.2 Get CRR History API

```
GET /api/v1/crr/history/{customer_id}
```

Returns all historical CRR records for the customer, including
`model_version_id`, `composite_score`, `final_rating`, `override_results`,
assessor and timestamp. Sorted descending by `scored_at`.

### 3.3 Update Configuration API

```
PATCH /api/v1/crr/config/{table_name}
X-Maker-User: {user_id}
X-Checker-User: {approver_id}
X-Approval-Reference: {approval_doc_ref}
```

Validations:
- Maker and Checker must be **different users**.
- Checker must hold the **Compliance approval role**.
- For `CRAM_OVERRIDE_RULES` where `rule_id IN ('OVR-001'…'OVR-007')`: **REJECT with 403 (Locked rule)**.
- Weight changes must validate **sum = 1.0** across the factor before accepting.
