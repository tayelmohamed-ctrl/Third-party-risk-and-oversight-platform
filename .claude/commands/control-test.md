Guided workflow to test a specific AML/CFT control and record the result on the Mal TPRO platform.

Usage: /control-test [control-id]
Example: /control-test TM-1
Example: /control-test AUD-1

**Context**
- API base: `http://localhost:3001/api`
- Auth headers: `-H "x-user-id: 1" -H "x-user-role: SUPERVISOR" -H "x-user-name: Supervisor"`
- Cadence rules: Critical = 3 months, High = 6 months, Medium/Low = 12 months
- Statuses: OPERATING · PARTIAL · GAP · NOT_IMPLEMENTED
- Only SUPERVISOR, CO, MLRO, ANALYST may record a test result

**Steps**

If no argument provided, run `GET /api/controls` and list all controls that are Overdue or Never tested, so the user can pick one.

Otherwise, for the given control ID:

1. `GET /api/controls` → find the control by ID. Show:
   - ID, domain, requirement, risk tier
   - Current status and freshness (state + days)
   - Last tested date
   - Existing evidence count
   - Expected cadence

2. Print the **testing guidance** for this control:
   - What the control requires (from the `expected` field / `requirement`)
   - What evidence to collect (suggest 2–3 specific evidence types appropriate to the domain)
   - What constitutes OPERATING vs PARTIAL vs GAP

3. Ask the user two questions:
   - "What test result did you find? (OPERATING / PARTIAL / GAP / NOT_IMPLEMENTED)"
   - "What evidence did you collect? (provide name and type, e.g. 'Q2 TM rule review – Internal audit')"

4. Once the user provides answers, execute:
   - `POST /api/controls/[id]/test` with `{ "result": "[status]" }`
     Headers: include `-H "x-user-name: Supervisor"`
   - `POST /api/controls/[id]/evidence` with `{ "name": "[evidence name]", "type": "[evidence type]" }`
   - Confirm both calls succeeded (HTTP 200/201)

5. Run `GET /api/controls` again for this control and confirm the new status, freshness, and evidence count.

6. Print a summary:
   ```
   ✓ Control [ID] updated
     Status:    [old] → [new]
     Tested:    [date]
     Evidence:  [name] ([type])
     Next test: [date based on cadence]
   ```

If the result is GAP or NOT_IMPLEMENTED, suggest which other controls could partially compensate and what remediation steps the MLRO should take.
