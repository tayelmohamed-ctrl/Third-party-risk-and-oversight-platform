# 07 — Build It The Waterworks Way (a non-technical, step-by-step guide)

> You are not "writing software." You are **building a waterworks**. Pure water
> (the law, the methodology, the ISIC activity map, the country lists) flows in
> from the river. Your job is to build the pumps, pipes, meters and taps that
> carry the right amount of risk-pressure to *every* customer, automatically and
> the same way every time — and to keep a tamper-proof logbook of every drop.
>
> You don't need to know how a pump is welded. You need to know **where the water
> should go, how to turn it on, and how to check the water is clean.** Claude
> does the welding. You are the chief engineer who inspects the taps.

---

## The transformation you're building toward
**Before:** the MLRO drowning in spreadsheets — every assessment a little
different, hard to defend, a knot in your stomach before a CBUAE exam.
**After:** you run a living waterworks. A customer goes in; a defensible,
identical-every-time rating comes out, with a receipt that shows exactly which
pipes carried which water and why. You can prove it to an examiner in two hours.

Keep that picture in mind — it's the whole point, and it's how you'll know when
a step is *really* done.

---

## Stage 0 — Turn up at the building site (≈30 min, one time)

**0.1 Get your tools.** Install **Cursor** (cursor.com) — think of it as a smart
workshop with Claude standing next to you. Sign in. When asked which model,
choose a Claude model.

**0.2 Make the site.** Create an empty folder on your computer, e.g.
`cram-waterworks`. Unzip the **build kit** into it so files like `START-HERE.md`,
`AGENTS.md`, `docs/`, `seed/`, `prompts/` sit at the top.

**0.3 Open the site in Cursor.** In Cursor: *File → Open Folder →* pick your
folder. Open the chat panel (the keyboard shortcut is Ctrl+L on Windows, Cmd+L
on Mac). This chat is where you talk to your welder.

**0.4 The one habit that keeps you safe.** After every stage you will say two
things to Claude: *"Show me it works"* and *"Explain that to me like I'm not
technical."* You are inspecting taps, not reading pipes. For a compliance engine,
**never move to the next stage until the water is certified** (the tests are
green). A pretty dashboard over wrong numbers is the one outcome we refuse.

✅ *Small win:* paste the **kickoff prompt** (`prompts/00-KICKOFF.md`) into the
chat. Claude will read your whole kit and reply with a plain-English summary of
how the waterworks should work, plus its plan. Read the summary. If it "gets it,"
you've already done the hardest part — you've handed over the blueprints
correctly. If anything's off, just tell it in plain words.

---

## Stage 1 — Dig the reservoir & lay the foundations (the river arrives)

*This is Phase 1 in `prompts/01-PHASE-PROMPTS.md`.*

**What it is:** before any pumps, you dig the reservoir that holds the river water
(the country list, the 736 professions, the 169 activities, the 830-entry ISIC
activity map, the override rules) and pour the concrete the rest sits on.

**What you do:** paste the **Phase 1** prompt. Let Claude work.

**Say to Claude when it's done:**
- "Show me the river water actually arrived — how many countries, professions and
  ISIC activities are in the reservoir?"
- "Prove the reservoir won't leak — show me the test that confirms the data loaded."

**You'll know it worked when** Claude shows the counts (≈251 countries, 736
professions, 169 + 830 activities, 20 override rules) and a green check that the
data loaded. That's your **first real win** — the river is in the reservoir.

🔒 *Don't worry about:* databases, schemas, migrations. Those are the concrete.
You just confirm the reservoir filled.

---

## Stage 2 — Build the pump house (the heart of everything)

*This is Phase 2 — and it is THE most important stage. This is the part you
"came for."*

**What it is:** the pump takes one customer's details and produces exactly the
right risk-pressure — the score and the rating. It must give the **same pressure
every time** and never let a low reading quietly cancel out a danger (a sanctions
hit, a foreign PEP). That "no quiet cancelling" rule is called **non-dilution**,
and it's the safety valve that protects you.

**What you do:** paste the **Phase 2** prompt. This builds the pump *and* a wall
of tests called **golden vectors** — known customers with known correct answers,
like calibration weights for a scale.

**Say to Claude when it's done:**
- "Run all the golden tests and show me they're green."
- "Take one example — a customer who scores Low on the maths but is a Foreign PEP
  — and walk me through, in plain English, why the answer is High."
- "Show me the receipt the pump prints for that customer." (every score, which
  pipes fired, the final rating.)

**You'll know it worked when** every golden test is green and the PEP example
comes out **High, not Low**. If you see that, your pump respects the law. This is
the moment the whole thing becomes real — savour it.

🚿 *Why we test the pump before building anything pretty:* a waterworks that
delivers the wrong pressure is worse than no waterworks. We certify the water
first, then build the taps.

---

## Stage 3 — Run pipes to every leg of the city (activities & countries)

*This is Phase 3 — where your ISIC map and country model come alive.*

**What it is:** every customer's *business activity* and *country* must get the
right flow. This stage connects:
- the **ISIC activity map** — type in "casino," "money remittance," "lawyer,"
  "grocery store," and the system finds the official activity and its risk, then
  checks a list of **typology rules** (gambling, arms, gold, crypto…) that can
  turn the pressure up;
- the **country model** — each country's risk blended from FATF, Basel, sanctions
  and safe-haven lists, with the "firm override" that can flag a country as
  prohibited.

**What you do:** paste the **Phase 3** prompt.

**Say to Claude when it's done:**
- "Type in 'casino' — show me it finds the right activity and rates it High, and
  tell me which rule made it High."
- "Show me a prohibited activity comes out as PROHIBITED, not just High."
- "Show me the activity tests (the GV-30s) are green."

**You'll know it worked when** vague descriptions ("money services," "gold
trader") land on the right activity and risk, and prohibited ones stop the line.
Now water reaches every leg of the city, correctly.

---

## Stage 4 — Install valves, meters and the tamper-proof logbook

*This is Phase 4 — the control room behind the walls.*

**What it is:** the parts that make it a real system, not just a calculator:
- **valves** = the workflow (prepare → review → approve), so no one approves
  their own work;
- **the intake gate** = screening (sanctions/PEP/adverse-media) that can slam a
  hard stop shut before anything else;
- **the logbook** = an **append-only** record — you can write a new line, never
  erase an old one (this is what an examiner trusts);
- **the meter room** = the doorway (API) your product/engineering team plugs the
  bank's onboarding and core systems into;
- **the change-control desk** = two-person sign-off (maker-checker) for any tweak
  to weights or lists, with the hard-stop rules **welded shut** so no one can
  switch them off.

**What you do:** paste the **Phase 4** prompt.

**Say to Claude when it's done:**
- "Show me that someone can't approve their own assessment."
- "Show me that trying to switch off a hard-stop rule is refused and logged."
- "Show me the logbook can't be edited or deleted."

**You'll know it worked when** those three refusals all happen. Your waterworks
now has safety interlocks an inspector will respect.

---

## Stage 5 — Open the taps: your MLRO control panel

*This is Phase 5 — the screen you and your team actually use.*

**What it is:** the dashboard. Start an assessment, see the live rating, read the
plain-English **"why"** (which pipes carried which water), approve High cases,
apply a manual override **with a reason**, manage the lists, watch the
risk-distribution dials, and press one button for the **CBUAE exam pack**.

**What you do:** paste the **Phase 5** prompt. Then *use it* like a customer would.

**Say to Claude:**
- "Let me score a pretend customer end to end and show me the explanation screen."
- "Make the 'why this rating' panel readable by a non-technical reviewer."
- "Add the one-click examination pack export."

**You'll know it worked when** you can run a customer yourself, understand the
answer without help, and export the exam pack. This is the **payoff** — the
"after" you pictured at the start, now on screen and ownable.

---

## Stage 6 — Pressure-test, then let the city drink

*This is Phase 6 — inspection and go-live.*

**What it is:** before real customers flow through, you test every joint:
- run the **12 mandatory test cases** with zero faults;
- **UAT** — you (MLRO) and two officers sign that it behaves correctly;
- **parallel run** — score real customers both the old way and the new way and
  confirm they match (target: less than 0.1% difference);
- **try to break the hard stops** (a friendly attack) and confirm they hold;
- **make your governance decisions** (next section) and only then promote the
  model from *draft* to *frozen*.

**What you do:** paste the **Phase 6** prompt and work through the checklist with
Claude and your team.

**You'll know it's ready when** the inspection pack is complete and your open
items are decided. Then you open the taps for real.

---

## The decisions only YOU (the MLRO) can make
The system is built to *ask* you these, not guess. They're listed in
`docs/05-OPEN-ITEMS-REGISTER.md`. The big one, in waterworks terms:

> **Which pressure standard does the city adopt?** Your two source models drew the
> Medium/High line in slightly different places (a score of 2.10 is "Medium" under
> one and "High" under the other). The tool keeps this as a setting and records
> which standard produced each rating — but **you must ratify the standard** before
> go-live. Until you do, the waterworks runs in *draft*. (Sensible defaults are
> suggested there for your review — nothing is pre-decided for you.)

Deciding these is not a delay; it's the moment you put your name on the water.

---

## How to "vibe-code" without being technical (your phrasebook)
- **Describe the outcome, not the plumbing.** "When I type a casino, it should
  come out High and tell me why" beats any technical instruction.
- **One station at a time.** Finish and verify a stage before the next. Resist
  "build it all."
- **Always ask to see it.** "Show me the tests are green." "Walk me through one
  example in plain English." "Show me the receipt."
- **If a word confuses you, say so.** "Explain that like I run compliance, not
  code." Claude will.
- **Trust the green, question the grey.** Green tests = certified water. No tests
  = unproven water; ask for them.
- **If something feels wrong, it probably is — say it plainly.** "That customer
  should be High, not Medium — check the non-dilution rule." You know the
  business truth; that's your real expertise.
- **Save your work often.** Ask Claude to "save my progress" (commit) at the end
  of each stage, so you can always step back.

## If a tool won't install
Some banks restrict which software libraries a computer may download. If Claude
says an install was blocked, that's a **network setting**, not a mistake in the
build — ask whoever manages your Cursor/network to allow it, rather than working
around it.

---

### The map on one line
**River (law + methodology + ISIC + country lists) → Reservoir (Stage 1) → Pump
house (Stage 2) → Pipes to every leg (Stage 3) → Valves, meters & logbook
(Stage 4) → Taps & control panel (Stage 5) → Inspection & go-live (Stage 6).**
Water in, certified pressure out, a receipt for every drop.
