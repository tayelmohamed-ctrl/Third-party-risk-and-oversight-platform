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
| `controls.json`       | Control library / control assessments                 |
| `cases.json`          | Oversight cases (incidents, issues, investigations)   |
| `reg-changes.json`    | Regulatory change tracking                            |

> `controls.json`, `cases.json`, and `reg-changes.json` are served by the mock
> API (`server/`) at `http://localhost:3001/api/<resource>` and are also imported
> by the frontend as the seeded offline fallback.

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
- **Control status**: `Implemented`, `Partially Implemented`, `Not Implemented`, `Not Applicable`
- **Control effectiveness**: `Effective`, `Needs Improvement`, `Ineffective`, `Not Tested`
- **Case type**: `Incident`, `Issue`, `Investigation`, `Exception`, `Due Diligence`
- **Case status**: `Open`, `In Progress`, `Pending Review`, `Closed`
- **Reg-change status**: `Horizon`, `Assessing`, `Impact Identified`, `Implementing`, `Complete`

To extend the dataset, add records that conform to `schema.json`. IDs follow the
prefixes `tp-`, `as-`, `fd-`, `ctrl-`, `case-`, and `reg-`.
