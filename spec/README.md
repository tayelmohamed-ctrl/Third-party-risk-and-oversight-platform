# Data Spec — Source of Truth

This directory holds the canonical data for the Third-Party Risk & Oversight
Platform. The `frontend/` app reads directly from these files, so treat them as
the single source of truth.

| File                  | Contents                                              |
| --------------------- | ----------------------------------------------------- |
| `schema.json`         | JSON Schema (draft-07) describing every entity & enum |
| `third-parties.json`  | Vendor / partner inventory with risk profile          |
| `assessments.json`    | Risk assessments linked to third parties              |
| `findings.json`       | Findings / issues linked to third parties             |

## Relationships

- `assessments[].thirdPartyId` → `third-parties[].id`
- `findings[].thirdPartyId` → `third-parties[].id`
- `findings[].assessmentId` → `assessments[].id` (nullable)

## Enums

- **Risk tier**: `Critical`, `High`, `Medium`, `Low`
- **Third-party status**: `Onboarding`, `Active`, `Under Review`, `Offboarding`, `Terminated`
- **Data access**: `None`, `Internal`, `Confidential`, `Restricted`
- **Assessment type**: `Security`, `Privacy`, `Financial`, `Operational`, `Compliance`
- **Assessment status**: `Draft`, `In Progress`, `Submitted`, `Completed`, `Overdue`
- **Finding status**: `Open`, `In Remediation`, `Resolved`, `Risk Accepted`

To extend the dataset, add records that conform to `schema.json`. IDs follow the
prefixes `tp-`, `as-`, and `fd-`.
