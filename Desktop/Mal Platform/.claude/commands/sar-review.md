Review all open cases on the SAR 30-day clock for the Mal TPRO platform.

**Context**
- API base: `http://localhost:3001/api`
- Auth headers: `-H "x-user-id: 1" -H "x-user-role: SUPERVISOR" -H "x-user-name: Supervisor"`
- SAR filing deadline: 30 days from `createdAt`
- Four-eyes rule: a case cannot be SAR-filed until a CO or MLRO (different from the assignee) has approved the disposition
- Priorities: P1 = 4h response SLA, P2 = 24h, P3 = 48h

**Steps**

1. `GET /api/cases` — fetch all cases
2. Filter to cases with status: OPEN, INVESTIGATING, PENDING_QA, or ESCALATED
3. For each, compute:
   - `elapsed` = today − createdAt (in days)
   - `remaining` = 30 − elapsed
   - `urgency`: CRITICAL (≤ 3d), HIGH (4–7d), MEDIUM (8–14d), LOW (> 14d)
4. Sort by `remaining` ascending (most urgent first)
5. `GET /api/cases/queue` — check for any pending four-eyes approvals

**Output — one row per open case, sorted by urgency**

```
══════════════════════════════════════════════
  SAR CLOCK REVIEW  ·  [today's date]
══════════════════════════════════════════════
[CRITICAL cases first, then HIGH, MEDIUM, LOW]

ID       SEV   STATUS         DAYS LEFT   DISPOSITION    FOUR-EYES
-------  ----  -------------  ----------  -------------  ----------
CASE-XX  P1    INVESTIGATING  3d ⚠        SAR proposed   pending ⚠
CASE-YY  P2    OPEN           12d         none yet       —
...

SUMMARY
  Total open: X  |  CRITICAL: X  |  HIGH: X
  Pending four-eyes approval: X
  No active cases on clock: [confirm if true]
══════════════════════════════════════════════
```

Flag ⚠ next to any case that is CRITICAL urgency or missing four-eyes approval.
After the table, suggest the single most important action to take right now.
