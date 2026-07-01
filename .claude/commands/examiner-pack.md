Compile an examiner-ready compliance summary for the Mal TPRO platform.

This is a read-only synthesis — it does not modify any data.

**Context**
- API base: `http://localhost:3001/api`
- Auth headers: `-H "x-user-id: 1" -H "x-user-role: SUPERVISOR" -H "x-user-name: Supervisor"`
- Entity: Mal Money, Inc. — US MSB registered with FinCEN; BaaS programme manager (Zenus/Rain)

**Steps — run all in parallel**

1. `GET /api/controls` — full control register with status, evidence, freshness
2. `GET /api/cases` — all cases
3. `GET /api/cases/sars` — SAR register
4. `GET /api/reg-changes` — regulatory change register
5. `GET /api/audit` — last 20 audit log entries (include `?limit=20` if supported)

**Output — structured examiner summary**

```
══════════════════════════════════════════════════════════════════
  MAL MONEY, INC. — COMPLIANCE PROGRAMME SUMMARY
  Prepared: [date]  |  Classification: Internal — Examiner Use
══════════════════════════════════════════════════════════════════

1. PROGRAMME HEALTH (weighted-average control score)
   Overall: [score]%  |  Operating: X  Partial: X  Gap: X  Not impl: X
   By domain: [list domains with highest gap counts]

2. CONTROL REGISTER HIGHLIGHTS
   [Table: ID | Risk | Domain | Status | Last Tested | Evidence items | Freshness]
   [Show Critical and Gap/Not-implemented controls first]

3. EVIDENCE INDEX
   [Table: Control ID | Evidence name | Type | Date added]

4. CASE MANAGEMENT
   Total cases: X  |  Open: X  Investigating: X  Pending QA: X  Closed: X
   P1 open: X  |  SAR filed (cumulative): X

5. SAR REGISTER
   [Table: SAR ID | Case ID | Subject (pseudonym) | Typology | Filed date]
   [If no SARs: "No SARs filed to date"]

6. REGULATORY CHANGE REGISTER
   [Table: Change ID | Source | Title | Impact | Task status]
   Open tasks: X  |  Overdue: X

7. COVERED CORRIDORS & TYPOLOGIES
   [List: Jurisdiction | Typology count | Highest-risk typology]

8. AUDIT TRAIL
   Last 10 audit entries: [ID | Actor | Action | Target | Timestamp]
   Audit chain integrity: [run GET /api/audit/verify and report result]

9. OPEN ITEMS FOR EXAMINER ATTENTION
   [Bullet list of any Gaps, overdue controls, open P1 cases, overdue SAR clocks]
   [If nothing: "No material open items identified at this time."]
══════════════════════════════════════════════════════════════════
```

After printing, offer to export any section as a formatted table or CSV by calling the relevant endpoint again.
