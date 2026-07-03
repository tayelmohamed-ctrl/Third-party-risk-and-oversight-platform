# 25 — Sayed regulatory source monitor (production)

Sayed runs an automated **weekly** regulatory watch for both Mal license paths (UAE community bank + US MSB BaaS under Zenus).

## Detection tiers

| Tier | Channel | Sources |
|------|---------|---------|
| **1 — Primary** | RSS feed fingerprint | CBUAE circulars RSS, FinCEN news RSS |
| **1b — Primary** | Drive version / ETag | Zenus BaaS compliance addendum |
| **2 — Backup** | HTTP content hash | CBUAE rulebook, FIU, FATF, OFAC, FFIEC, etc. |

RSS and Drive run first. HTTP hash confirms page-level changes if RSS does not cover a source.

## Notifications (when `changed > 0`)

| Channel | Config | Recipient |
|---------|--------|-----------|
| **Slack** | `SLACK_WEBHOOK_URL` | Compliance channel (mentions run ID) |
| **Email** | `RESEND_API_KEY` + `REG_ALERT_EMAIL_TO` | **Walid Elsheikha** (`walid.elsheikha@mal.ae` default) |
| **In-app** | Signal Feeds + Regulatory Management | All compliance users |
| **Audit** | PostgreSQL append-only | `regulatory.alert_sent` |

If Slack/email are not configured, alerts are logged to server console and audit trail.

## Environment variables

```bash
REG_RSS_CBUAE=          # CBUAE circulars RSS (primary)
REG_RSS_FINCEN=         # FinCEN news RSS (primary)
REG_ALERT_EMAIL_TO=walid.elsheikha@mal.ae
REG_ALERT_EMAIL_FROM=compliance@mal.ae
SLACK_WEBHOOK_URL=      # Slack incoming webhook
RESEND_API_KEY=         # Resend.com for transactional email
ZENUS_ADDENDUM_VERSION=2026-Q2-v1.3   # Bump when partner updates addendum
ZENUS_ADDENDUM_DRIVE_FILE_ID=         # Optional Google Drive file ID for ETag polling
```

## Schedule

| Mode | Cron |
|------|------|
| Production | Monday 05:00 UTC (~09:00 UAE) |
| Demo | Every 6 hours |

## EWRA regulatory pack

Board-approved **methodology** and **Q2 2026 snapshot** are rendered in-app from `src/data/ewra_regulatory_pack.json` — regulator-ready narrative covering:

## Corridor EWRA themes

Corridor-specific enterprise themes (UAE → PK, EG, TR, ID, BD, PH) live under **Regulatory Management → Corridor EWRA**, owned by **Sayed**. Data file: `src/data/corridor_ewra_themes.json`. Intake guide: `docs/26-CORRIDOR-EWRA-WORKFLOW.md`.

- Inherent risk scoring (customer, product, geography, channel)
- Control effectiveness (Strong / Partial / Weak)
- 3×3 matrix interpretation and dual-license treatment
- MLRO certification (Walid Elsheikha)

View: **Regulatory Management → Risk heat map** or **CRAM Workspace** (full pack below matrix).

Authoritative signed PDFs remain in Google Drive evidence folder 03.

## API

```bash
GET  /api/v1/crr/regulatory/monitor
POST /api/v1/crr/regulatory/monitor/run   # requires config_propose
```
