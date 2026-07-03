Generate a risk typology brief for a specific country or corridor on the Mal TPRO platform.

Usage: /typology-brief [country]
Example: /typology-brief Turkey
Example: /typology-brief "United States"

**Covered jurisdictions**: Pakistan, Egypt, Bangladesh, Turkey, Indonesia, Philippines, United Arab Emirates, United States, Malaysia, Morocco, Singapore

**Steps**

If no argument provided, list covered jurisdictions and ask which one.

Otherwise:

1. `GET /api/typologies` → filter to the named jurisdiction (case-insensitive match). If no match, suggest the closest jurisdiction name.
2. `GET /api/controls` → for each typology's `defence` array, look up the control's current `status` and `freshness`
3. Read the THREAT_ATLAS jurProfile for the jurisdiction from the frontend source at:
   `mal-tpro-frontend/src/Mal_ThirdParty_Risk_Oversight_Platform.jsx`
   Search for `"jur":"[jurisdiction]"` in the `jurProfiles` array.

**Output**

```
══════════════════════════════════════════════
  TYPOLOGY BRIEF:  [Jurisdiction]  ·  [date]
══════════════════════════════════════════════

REGULATORY PROFILE
  Supervisor:  [reg]
  FIU:         [fiu]
  Framework:   [fw]
  FATF body:   [body]
  FATF status: [fatf]
  STR/SAR:     [thr]
  Retention:   [ret]

RISK TYPOLOGIES  ([N] total)
─────────────────────────────────────────────
[For each typology:]
  [ID]  [name]  [[cat] · [type]]
  Description: [desc]
  Red flags:   [flags]
  Cross-border: [yes/no]  [xbName if yes]
  Defences:    [controlId: STATUS · freshness, ...]

CONTROL GAPS FOR THIS CORRIDOR
  [List any defence controls with status GAP or NOT_IMPLEMENTED]
  — None if all controls operating

CROSS-BORDER NETWORKS
  [List any crossborder entries that include this jurisdiction]

HEADLINE ASSESSMENT
  [2–3 sentences: overall risk level, top threat, biggest control gap]
══════════════════════════════════════════════
```
