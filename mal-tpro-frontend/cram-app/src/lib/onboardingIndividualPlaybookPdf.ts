/**
 * Global Account — Individual onboarding document playbook (PDF).
 * Content: CRAM-US / EDD matrix / GA corridor packs.
 * Experience craft: Golden Fleece journey (entertaining-platform-design).
 */
import type { jsPDF } from "jspdf";
import {
  BRAND,
  bulletList,
  callout,
  createState,
  drawCover,
  ensure,
  footer,
  heading,
  journeyStrip,
  newPage,
  paragraph,
  subheading,
  table,
  type PdfState,
} from "./onboardingPdfShared";

export const INDIVIDUAL_PLAYBOOK_META = {
  documentId: "MAL-GA-ONB-IND-PLAYBOOK-v1.0",
  title: "Individual Onboarding Document Playbook",
  version: "1.0",
  perimeter: "Global Account (US / Zenus)",
  basis: "Mal-CRAM-US-01 FREEZE-03 · EDD Individual Matrix · Five-gate spine · GA Self/C2C Scenario Pack",
};

function cover(state: PdfState) {
  drawCover(state, {
    eyebrow: "Customer journey playbook · Natural persons",
    title: "Individual Onboarding",
    title2: "Document Playbook",
    promise: "Clear asks. Risk-based. Fast green lane when the pack is complete.",
    beforeAfter: [
      "Confused by RFIs, nationality treated as High, abandoned mid-upload.",
      "Knows exactly what to upload; account activated under fair monitoring.",
    ],
    meta: [
      ["Document ID", INDIVIDUAL_PLAYBOOK_META.documentId],
      ["Perimeter", INDIVIDUAL_PLAYBOOK_META.perimeter],
      ["Basis", INDIVIDUAL_PLAYBOOK_META.basis],
      ["Audience", "Onboarding ops · Compliance · Customer success"],
      ["Generated", new Date().toLocaleString()],
    ],
    framing:
      "Transformation: from “I don’t know what you want from me” to “I’m banking globally with dignity.” " +
      "Archetype: Golden Fleece — a staged road to the prize (activated account). " +
      "Core loop: show the personal checklist → upload once → see progress → go live. " +
      "Nationality alone never sets the pack; residence + income + triggers do.",
  });
}

function sectionJourney(state: PdfState) {
  state.y = newPage(state);
  heading(state, "1. The journey — six beats to activation");
  paragraph(
    state,
    "Hide the compliance lecture inside a clear path (Pope in the Pool). Seed the six things we need early so each upload feels like a win (Six Things That Need Fixing).",
    8,
    BRAND.ink,
  );
  journeyStrip(state, [
    { n: "01", label: "Promise", feel: "Theme stated" },
    { n: "02", label: "Your pack", feel: "Save the Cat" },
    { n: "03", label: "Upload once", feel: "Catalyst" },
    { n: "04", label: "Why these", feel: "Debate → trust" },
    { n: "05", label: "Green lane", feel: "Fun & Games" },
    { n: "06", label: "Account live", feel: "Finale" },
  ]);
  callout(
    state,
    "Stasis = Death (honest)",
    "Without a clear pack, High-corridor customers stall on endless RFIs and leave for lighter competitors. Clarity is the competitive control — not weaker AML.",
    BRAND.goldSoft,
    BRAND.gold,
  );
  subheading(state, "Engine decision spine (automatic)");
  bulletList(state, [
    "G0 — Residence permitted vs Zenus restricted/prohibited list",
    "G1 — Screening fail-closed (sanctions / PEP / adverse)",
    "G2 — Prohibited use of personal account",
    "G3 — CRAM score + corridor floors",
    "G4 — Targeted EDD pull: only incremental docs for surviving triggers",
  ]);
}

function sectionBaseline(state: PdfState) {
  heading(state, "2. Universal baseline — every permitted individual");
  paragraph(
    state,
    "Customer-facing language. Ask for these every time before any nationality overlay.",
  );
  table(
    state,
    ["#", "Document", "Customer wording"],
    [
      ["1", "Passport or national ID", "Clear photo of a valid government ID — all corners visible, not expired."],
      ["2", "Proof of address", "One document in YOUR name, issued in the last 3 months, showing your current home address."],
      ["3", "Tax self-cert", "Where you are tax resident + TIN if you have one (CRS / FATCA)."],
      ["4", "Contact", "Phone and email you control."],
      ["5", "Purpose & volume", "Why you need the account and expected monthly activity."],
    ],
    [8, 38, 136],
  );
  callout(
    state,
    "Proof of address — pasteable",
    "Please upload one document that shows your full name and current home address, issued in the last 3 months. Best options: utility bill (electricity, water, gas) or bank statement. App screenshots are OK only if issuer, name, address and date are clear. Edited files are rejected.",
  );
}

function sectionPoA(state: PdfState) {
  heading(state, "3. Proof of address by residence country");
  paragraph(
    state,
    "Residence drives the corridor and which local documents we accept. Nationality does not change the PoA list.",
  );
  table(
    state,
    ["Residence", "Corridor", "Accept one (name-matched, ≤90 days)", "Local ID notes"],
    [
      ["Egypt", "High · EDD", "Electricity / water / gas; bank statement; mobile postpaid; rental + bill", "National ID or passport"],
      ["Pakistan", "High · EDD", "Electricity / gas; bank statement; mobile postpaid; rental + bill", "CNIC / NICOP or passport"],
      ["Turkey", "Med · EDD", "Elektrik / doğalgaz / su; bank statement; rental + bill", "TC Kimlik or passport"],
      ["Bangladesh", "Med · Std+", "Electricity / gas; bank statement; mobile postpaid", "NID or passport"],
      ["Indonesia", "Med · Std+", "PLN / PDAM; bank statement", "KTP or passport"],
      ["Philippines", "Med · Std+", "Meralco / water; bank statement", "PhilID or passport"],
      ["Saudi Arabia", "Med · Std+", "Utility; bank statement; Iqama address + bill", "National ID / Iqama + passport"],
      ["Jordan", "Med–High", "Electricity / water; bank statement; rental + bill", "National ID or passport"],
      ["UAE", "Hub · EDD", "Ejari + DEWA/SEWA/etc. or bank statement; tenure history if asked", "Emirates ID + passport + visa"],
    ],
    [28, 22, 88, 44],
  );
}

function sectionIncome(state: PdfState) {
  state.y = newPage(state);
  heading(state, "4. Proof of income — by how they earn");
  paragraph(
    state,
    "Majority of GA corridors are EDD or Standard+. Pre-request income docs with ID + PoA to cut RFI waits (Promise of the Premise = one complete upload).",
  );
  table(
    state,
    ["Segment", "Ask for (all that apply)", "Customer wording"],
    [
      ["Salaried", "Employer letter or contract + last 3 payslips + 3 months bank statements showing salary", "Show us your job and the salary landing in your account."],
      ["Freelancer", "Platform statements / invoices (3–6 months) + payout / bank statements + key contracts", "Show platform earnings and where payouts arrive."],
      ["Self-employed", "Trade licence + 3–6 months business bank statements + tax return if available", "Show the business is real and the money matches."],
      ["Student / sponsored", "Enrolment + sponsor letter/ID + sponsor support evidence + own statements", "Who supports you, and how?"],
      ["Investments / inheritance", "Brokerage / sale contract / estate letter + proceeds into their account", "Only when this is how wealth was built."],
    ],
    [28, 82, 72],
  );
  callout(
    state,
    "SoF vs SoW — simple",
    "Source of funds = where the next money into this account comes from. Source of wealth = how overall wealth was built. For a normal salaried customer, employer letter + 3 payslips + 3-month statements usually covers both.",
    BRAND.panel,
    BRAND.header,
  );
}

function sectionOverlays(state: PdfState) {
  heading(state, "5. Nationality overlays — only when triggered");
  table(
    state,
    ["Situation", "Extra documents", "Outcome posture"],
    [
      ["Clean third-country national on permitted High/Med corridor (e.g. Hungarian in Egypt)", "Passport + residence/work visa + local PoA + income pack — no “nationality pack”", "Corridor drives EDD; passport does not lower the floor"],
      ["Restricted nationality, no money nexus to that country", "Visa + tenure + strong local SoF + confirm no corridor to restricted country", "High / enhanced screening; onboardable if clean"],
      ["Restricted-country SoW (Rule 1)", "Documentary SoW + remittance trail out of that country + senior approval", "High floor; hold/decline if unevidenced"],
      ["Prohibited nexus (e.g. Iran funds/corridor)", "None curative", "Block / decline — documents do not cure"],
      ["Foreign PEP / RCA / adverse media", "PEP declaration + corroborated SoW + senior/MLRO approval", "High; PEP-neutral wording to customer"],
    ],
    [48, 78, 56],
  );
}

function sectionExample(state: PdfState) {
  heading(state, "6. Worked example — Hungarian living in Egypt (salaried)");
  callout(
    state,
    "Copy to customer",
    "To open your Global Account please upload clear photos/PDFs (not edited):\n" +
      "1) Hungarian passport (photo page).\n" +
      "2) Egyptian residence/work visa AND one Egyptian proof of address in your name from the last 3 months (utility bill or bank statement).\n" +
      "3) Employer letter or contract, last 3 payslips, and last 3 months bank statements showing salary credits.\n" +
      "4) Tax residency/TIN form and a short note on expected monthly use.\n" +
      "Once complete and screening clears, we aim to activate quickly under enhanced monitoring for the Egypt corridor. We only ask for more if something is missing or unclear.",
    BRAND.accentSoft,
    BRAND.accent,
  );
  paragraph(
    state,
    "Engine path: Residence EG → High corridor → EDD mandatory · Nationality HU → no High floor alone · SoF EG salary → standard EDD pack. Onboardable, monitored — not blocked.",
    7.8,
    BRAND.ink,
  );
}

function sectionLanes(state: PdfState) {
  state.y = newPage(state);
  heading(state, "7. Whitelisted / fast cycles — complete pack, not nationality");
  paragraph(
    state,
    "There is no nationality whitelist. Fast track = document-complete + clean gates. Soft product limits after activation protect the programme without humiliating the customer.",
  );
  table(
    state,
    ["Lane", "Entry conditions", "Target", "Feeling to engineer"],
    [
      ["Green", "Permitted residence · screening clear · no PEP/adverse · SoF = residence · full pack day 0", "< 24–48h", "Momentum — “I’m almost there”"],
      ["Amber EDD", "High corridor (EG/PK/AE hub) · same pack · analyst SoF coherence check", "≤ 72h if complete", "Fair review — not a black hole"],
      ["Red", "Foreign PEP · Rule-1 SoW · adverse · incomplete/incoherent income · prohibited nexus", "Senior path", "Honest stakes — no false speed promise"],
    ],
    [22, 78, 28, 54],
  );
  subheading(state, "Soft controls after activation (not nationality bans)");
  bulletList(state, [
    "Lower monthly velocity on High corridors until behaviour proves clean",
    "Block restricted/prohibited corridors at product level",
    "Licensed VASP / charity whitelist for relevant payments",
    "Same-name Confirmation of Payee on self-transfers",
  ]);
}

function sectionCheat(state: PdfState) {
  heading(state, "8. Operator cheat sheet — residence × pack");
  table(
    state,
    ["Lives in", "Default posture", "Always ask", "Usually ask", "Nationality only adds"],
    [
      ["Egypt", "High / EDD", "Passport or EG ID; EG PoA <90d", "Employer + 3 payslips + 3m statements", "Visa if foreign; SY/IR nexus check"],
      ["Pakistan", "High / EDD", "Passport or CNIC; PK PoA <90d", "Employer + 3 payslips + salary statements", "Visa if foreign; AF/IR overlays"],
      ["Turkey", "Med / EDD", "Passport or TC ID; TR PoA <90d", "Employer letter/payslips + salary statement", "Visa if foreign"],
      ["Bangladesh", "Med / Std+", "NID/passport; BD PoA <90d", "Employer + payslips + statements", "—"],
      ["UAE", "Hub / EDD", "Passport + Emirates ID + Ejari/utility", "Employer payslip; stronger if LB SoW / PK onward", "Visa + tenure"],
      ["Saudi", "Med / Std+", "Passport/Iqama; SA PoA", "SoW if large; PEP screen mandatory", "YE etc. if SoW nexus"],
      ["Jordan", "Med–High", "Passport/JO ID; JO PoA", "Stronger SoW; charity controls", "PEP package if hit"],
    ],
    [24, 24, 48, 52, 34],
  );
}

function sectionDont(state: PdfState) {
  heading(state, "9. What not to do");
  bulletList(state, [
    "Do not invent a different 15-document list per nationality",
    "Do not skip SoF on EG/PK to win speed — pre-ask it up front instead",
    "Do not treat EU/US passports as a Low shortcut on a High residence corridor",
    "Do not promise Green-lane speed on Red-lane triggers",
    "Do not tip off customers with the word “PEP” — frame as routine verification",
  ]);
  state.y = ensure(state, 36);
  heading(state, "10. Sign-off");
  paragraph(
    state,
    "I confirm this Individual Onboarding Document Playbook aligns with Mal-CRAM-US-01 and is fit for operator use and customer-facing checklists.",
    8,
    BRAND.ink,
  );
  state.doc.setFont("helvetica", "normal");
  state.doc.setFontSize(9);
  state.doc.setTextColor(...BRAND.ink);
  state.doc.text("MLRO / Compliance: __________________________  Date: ______________", state.margin, state.y);
  state.y += 9;
  state.doc.text("Onboarding Product: _________________________  Date: ______________", state.margin, state.y);
}

export async function buildIndividualOnboardingPlaybookPdf(): Promise<jsPDF> {
  const state = createState(
    INDIVIDUAL_PLAYBOOK_META.documentId,
    "Individual · Natural persons",
  );
  cover(state);
  sectionJourney(state);
  sectionBaseline(state);
  sectionPoA(state);
  sectionIncome(state);
  sectionOverlays(state);
  sectionExample(state);
  sectionLanes(state);
  sectionCheat(state);
  sectionDont(state);
  footer(state);
  return state.doc;
}

export async function exportIndividualOnboardingPlaybookPdf(): Promise<void> {
  const doc = await buildIndividualOnboardingPlaybookPdf();
  doc.save(
    `Mal-GA-Individual-Onboarding-Playbook-v${INDIVIDUAL_PLAYBOOK_META.version}-${new Date().toISOString().slice(0, 10)}.pdf`,
  );
}
