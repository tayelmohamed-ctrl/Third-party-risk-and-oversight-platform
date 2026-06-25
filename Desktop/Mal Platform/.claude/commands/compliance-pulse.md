Pull a live compliance health dashboard for the Mal TPRO platform.

**Context**
- API base: `http://localhost:3001/api`
- Auth headers on every request: `-H "x-user-id: 1" -H "x-user-role: SUPERVISOR" -H "x-user-name: Supervisor"`
- Covered corridors: Pakistan, Egypt, Bangladesh, Turkey, Indonesia, Philippines, United Arab Emirates, United States

**Steps — run all curl calls in parallel, then synthesise**

1. `GET /api/controls` — parse JSON array. Compute:
   - Count by `status`: OPERATING / PARTIAL / GAP / NOT_IMPLEMENTED
   - For each control with `freshness.state` of "Overdue", note its `id`, `risk`, and `freshness.days`
   - List up to 5 most overdue controls (most negative `freshness.days` first)

2. `GET /api/cases` — parse JSON array. Compute:
   - Count by `status`: OPEN / INVESTIGATING / PENDING_QA / SAR_FILED / CLOSED_NO_SAR / ESCALATED
   - Count by `sev`: P1 / P2 / P3 among open cases
   - SAR clock: for each case with status OPEN, INVESTIGATING, or PENDING_QA, compute days elapsed = (today − createdAt) and days remaining = 30 − elapsed. Flag any with ≤ 5 days remaining.

3. `GET /api/cases/sars` — count filed SARs

4. `GET /api/reg-changes/summary` — extract open task count and overdue task count

5. `GET /api/typologies` — group by `jur`, confirm all 8 covered corridors have typologies

**Output format**

Print exactly this structure (fill in values, omit sections with nothing to report):

```
══════════════════════════════════════════════
  MAL COMPLIANCE PULSE  ·  [today's date]
══════════════════════════════════════════════
⚠ WARNINGS  [only if P1 open OR SAR clock ≤ 5d]
  • [describe each critical item]

CONTROLS   Operating: X  Partial: X  Gap: X  Not implemented: X
           Overdue (Critical): X  Overdue (High): X
           Top overdue: [ID – N days, ...]

CASES      Open: X  Investigating: X  Pending QA: X  SAR Filed: X (cumulative)
           P1 open: X  P2 open: X
           SAR clock tight (≤5d): [case IDs or "none"]

REG-CHANGE Open tasks: X  Overdue: X

CORRIDORS  [list jur: N typologies for each of the 8 corridors]
══════════════════════════════════════════════
```

If any ⚠ WARNING exists, say so prominently at the top. Be concise — no prose, only the structured output.
