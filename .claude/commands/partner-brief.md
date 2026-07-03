Generate a full compliance brief for a specific third-party partner on the Mal TPRO platform.

Usage: /partner-brief [partner-id]
Example: /partner-brief swiftx

**Known partners and their corridors** (from AGENTS_BASE in the frontend):
- `swiftx`   — SwiftX DLT Pay       — Pakistan — Critical tier
- `thunes`   — Thunes               — Bangladesh, Philippines — High tier  
- `gulf`     — Gulf Remit FZ        — United Arab Emirates — High tier
- `nile`     — Nile Payments        — Egypt — Medium tier
- `pearl`    — Pearl Payout         — Philippines — Medium tier
- `aktifpay` — AktifPay             — Turkey — High tier
- `doku`     — Doku Wallet          — Indonesia — High tier
- `zenus`    — Zenus Bank           — United States — Critical tier (Banking partner)
- `rain`     — Signify Holdings (Rain) — United States — Critical tier (Card & settlement)

**Steps**

If no argument provided, list the known partners above and ask which one.

Otherwise, for the given partner ID:

1. Identify the partner's jurisdiction(s) from the list above
2. `GET /api/typologies` → filter to the partner's jurisdiction(s). List all typologies with their red flags and defences.
3. `GET /api/controls` → for each typology's `defence` control IDs, show the control's current status and freshness
4. `GET /api/cases` → filter to any cases linked to the partner's jurisdiction (check `typologyId` jurisdiction match). List open cases.
5. `GET /api/reg-changes` → identify any reg changes relevant to the partner's jurisdiction or corridor

**Output**

```
══════════════════════════════════════════════
  PARTNER BRIEF:  [Partner Name]  ·  [date]
  Jurisdiction: [jur]  |  Tier: [tier]  |  Licence: [licence]
══════════════════════════════════════════════

RISK TYPOLOGIES FOR THIS CORRIDOR  ([N] total)
  [id]  [name]  [[cat]]  [[type]]
        Red flags: [flags]
        Controls: [control IDs and their current status]

CONTROL COVERAGE
  ID      Name                  Status           Freshness
  ------  --------------------  ---------------  ---------
  TM-1    Transaction monitoring  OPERATING      Current
  ...

OPEN CASES IN THIS CORRIDOR
  [case IDs, severity, status, days on clock]
  — None if clean

REGULATORY CHANGES AFFECTING THIS CORRIDOR
  [change ID, title, task status]
  — None if clean

HEADLINE RISK ASSESSMENT
  [2–3 sentences: is this partner's corridor well-controlled, what are the top open risks]
══════════════════════════════════════════════
```
