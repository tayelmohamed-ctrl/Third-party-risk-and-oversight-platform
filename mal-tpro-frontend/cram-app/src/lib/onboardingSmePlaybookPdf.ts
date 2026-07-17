/**
 * Global Account — SME / KYB onboarding document playbook (PDF).
 * Content: KYB matrix · Zenus §6.4 · nature-of-business · GA B2B scenarios.
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

export const SME_PLAYBOOK_META = {
  documentId: "MAL-GA-ONB-SME-PLAYBOOK-v1.0",
  title: "SME Onboarding Document Playbook",
  version: "1.0",
  perimeter: "Global Account (US / Zenus) · UAE IBAN / Financing columns noted",
  basis: "SME KYB Matrix July 2026 · Zenus §6.4 · CRAM Entity Appendix B · GA B2B Scenario Pack",
};

function cover(state: PdfState) {
  drawCover(state, {
    eyebrow: "Customer journey playbook · Legal persons / SMEs",
    title: "SME Onboarding",
    title2: "KYB Document Playbook",
    promise: "One complete company pack. Activity-specific extras. Fast when ownership is clear.",
    beforeAfter: [
      "Opaque RFIs, unresolved UBOs, trading firms stuck in limbo.",
      "Knows the company pack; UBO resolved; trading evidence ready; live under fair limits.",
    ],
    meta: [
      ["Document ID", SME_PLAYBOOK_META.documentId],
      ["Perimeter", SME_PLAYBOOK_META.perimeter],
      ["Basis", SME_PLAYBOOK_META.basis],
      ["Audience", "KYB ops · Compliance · Relationship / Product"],
      ["Generated", new Date().toLocaleString()],
    ],
    framing:
      "Transformation: from “another bank that doesn’t get our business” to “we’re onboarded with clear rules.” " +
      "Archetype: Golden Fleece — staged road to activated business account. " +
      "Core loop: legal form + activity → personalised checklist → upload once → substance verified → go live. " +
      "Establishment corridor sets heat; business type sets whether we onboard at all; UBO nationality is an overlay.",
  });
}

function sectionJourney(state: PdfState) {
  state.y = newPage(state);
  heading(state, "1. The journey — six beats to SME activation");
  paragraph(
    state,
    "Get to the checklist fast (no Laying Pipe). One mental model: company → owners → money → activity (avoid Double Mumbo Jumbo).",
    8,
    BRAND.ink,
  );
  journeyStrip(state, [
    { n: "01", label: "Promise", feel: "Theme stated" },
    { n: "02", label: "Company pack", feel: "Save the Cat" },
    { n: "03", label: "Owners clear", feel: "Catalyst" },
    { n: "04", label: "Activity fit", feel: "Debate → trust" },
    { n: "05", label: "Green lane", feel: "Fun & Games" },
    { n: "06", label: "Account live", feel: "Finale" },
  ]);
  callout(
    state,
    "Hard rule (Priority-1)",
    "If beneficial ownership cannot be resolved to natural persons within the RFI window → refuse. No invoices cure an opaque UBO.",
    BRAND.goldSoft,
    BRAND.gold,
  );
  subheading(state, "Engine decision spine (automatic)");
  bulletList(state, [
    "G0 — Establishment / corridor permitted vs Zenus restricted/prohibited",
    "G1 — Entity + UBO + director screening fail-closed",
    "G2 — Legal form + Zenus §6.4 activity gate (prohibited type = decline)",
    "G3 — CRAM score (activity + corridor + structure)",
    "G4 — Targeted KYB/EDD pull for surviving triggers only",
  ]);
}

function sectionDataPoints(state: PdfState) {
  heading(state, "2. Data-points that drive the pack");
  table(
    state,
    ["Data-point", "Why it matters"],
    [
      ["Legal form (LLC, FZE, sole prop, partnership, JSC, branch, trust, NPO…)", "Entity-type documents + legal-form score"],
      ["Establishment country + registered address", "Residence gate + local registry docs + corridor heat"],
      ["Licence activities (exact wording)", "Nature-of-business score + Zenus prohibited screen"],
      ["UBOs ≥25% (name, nationality, residence, %)", "Ownership chart + individual ID/PoA + overlays"],
      ["Directors / authorised signatories", "IDs + resolution to operate the account"],
      ["SoF / SoW (profits, capital, group funding)", "12-month statements / financials / capital trail"],
      ["Expected activity (volumes, corridors, counterparties)", "TM baseline + trade/service extras"],
      ["Substance (office, employees, website, VAT)", "Free-zone / shell filter"],
      ["Product (UAE IBAN / Global Account / Financing)", "Which KYB matrix columns become mandatory"],
    ],
    [88, 94],
  );
}

function sectionBaseline(state: PdfState) {
  heading(state, "3. Universal KYB baseline — Global Account SME");
  paragraph(state, "Customer-facing. Collect in one shot for Green-lane speed.");
  table(
    state,
    ["Section", "Documents"],
    [
      ["Identity & authority", "Signed application · valid trade/commercial licence · incorporation or registry extract · latest MOA/AOA · registered-office proof · signatory ID · board/shareholder resolution if needed"],
      ["Ownership", "UBO declaration + ID per natural-person UBO · ownership chart to natural persons · shareholder register where MOA incomplete"],
      ["Money & tax", "12 months business bank statements · SoF evidence · UBO SoW when High/EDD · FATCA/CRS + W-8BEN-E + TIN/EIN/TRN · Zenus prohibited-category attestation"],
      ["Activity", "Contracts/invoices/website/VAT/business profile · expected volumes, corridors, top counterparties"],
    ],
    [36, 146],
  );
  callout(
    state,
    "Pasteable opener",
    "To open a business Global Account we need company documents, proof of who owns and controls the company (down to real people), 12 months of business bank statements, and a clear description of what the company does and who you pay or receive from. We only ask for extras if your activity or ownership triggers them.",
  );
}

function sectionLegalForm(state: PdfState) {
  state.y = newPage(state);
  heading(state, "4. Extra documents by legal form");
  table(
    state,
    ["Legal form", "Add to baseline"],
    [
      ["LLC / mainland", "Manager appointment + ID; shareholder register if MOA incomplete; local agent agreement if required"],
      ["Free zone (FZE / FZ-LLC)", "FZ licence + incorporation; registry extract/share cert; establishment card or office lease/flexi-desk; FZ mandate/resolution"],
      ["Sole proprietorship", "Owner ID + residency; POA if non-owner operates account"],
      ["Partnership / LLP", "Partnership agreement + partner register; partner IDs; UBO behind corporate partners"],
      ["Civil / professional", "Professional licence + partners’ agreement; partner IDs"],
      ["Private / Public JSC", "Board list + resolution; director IDs; listed → annual report / disclosures"],
      ["Foreign branch", "Parent constitutional docs (attested) + good standing; branch licence; parent chart to UBO"],
      ["Trust / nominee", "Trust deed; IDs for all trust parties — usually High / not standard GA journey"],
      ["NPO / charity", "Registration + ministry authorisation + governance/donor records — acceptance gate; Zenus EDD only"],
      ["Government / embassy", "Establishing instrument + authorised-representative IDs — permitted with EDD"],
    ],
    [42, 140],
  );
}

function sectionActivityGate(state: PdfState) {
  heading(state, "5. Activity gate — Zenus §6.4 & nature of business");
  subheading(state, "Decline at G2 — do not collect a long pack");
  paragraph(
    state,
    "Gaming/casinos/POGO · arms/ammunition · cannabis · shell banks / unlicensed MSBs · third-party payment processors · prepaid access · independent ATMs · offshore banks / correspondent / payable-through / concentration accounts · liquor/convenience/restaurant (Zenus list) · real estate & construction on Zenus rails · trust & asset-management services · IOLTA/notaries/trustees/accountants as listed. Customer message: “This business type is not supported on the Global Account programme.”",
    7.6,
    BRAND.ink,
  );
  subheading(state, "Permitted only with EDD + licence + compliance evidence");
  paragraph(
    state,
    "Regulated MSBs/EMIs/VASPs/PMIs, banks, broker-dealers, crypto exchanges, insurers, NPOs/charities, government/embassy — High floor, senior path. Nested/correspondent remains prohibited.",
    7.6,
    BRAND.ink,
  );
  callout(
    state,
    "Corridor still bites",
    "Low nature-of-business score does not cancel Egypt/Pakistan/UAE-hub corridor EDD. Establishment heat and activity heat stack; programme prohibitions always win.",
    BRAND.panel,
    BRAND.header,
  );
}

function sectionActivityExtras(state: PdfState) {
  heading(state, "6. Extra docs by business activity (customer-clear)");
  table(
    state,
    ["Activity", "Extra documents", "Watch / outcome"],
    [
      ["Goods trading / import-export / re-export", "Sample invoices · contracts · B/L or AWB + customs samples · supplier/buyer list · dual-use/end-use if relevant", "TBML mismatch → decline + SAR path"],
      ["Services / consulting / commissions", "Engagement letters with deliverables · substance evidence · counterparty registry · agency agreement + underlying txn for commissions", "No-substance fees → decline"],
      ["Manufacturing", "Premises evidence · payroll/headcount · supplier invoices matching licence · export docs if exporting", "Ghost payroll / agent misuse"],
      ["E-commerce / marketplace", "Platform payouts · website/catalogue · plausible suppliers · VA extras if crypto", "Circular supplier rings"],
      ["DPMS / jewellery", "DPMS licence if required · supplier KYB · inventory/shipment trail", "High EDD; not always Zenus knock-out"],
      ["Holding / IP / royalties", "Group chart · dividend/capital resolutions · licence + pricing basis", "Mispricing / round-trip"],
      ["Regulated FI / VASP / MSB", "Regulatory licence · AML programme · no nested/correspondent attestation", "Permitted-with-EDD only"],
      ["NPO / charity / CSR", "Ministry registration · programme description · licensed-charity whitelist for counterparties", "TF / conflict-adjacent → STR"],
    ],
    [40, 78, 64],
  );
}

function sectionUbo(state: PdfState) {
  state.y = newPage(state);
  heading(state, "7. UBO / ownership overlays");
  table(
    state,
    ["Trigger", "Extra ask", "Posture"],
    [
      ["Any High / EDD / GA corridor majority", "Full ownership chart + 12m statements + UBO SoW", "Default for most GA SMEs"],
      ["Complex layers / nominees", "Layer-by-layer evidence; resolve nominees to natural persons", "Unresolved → refuse"],
      ["Restricted-country UBO (e.g. LB UBO of PK LLC)", "UBO SoW + remittance trail + senior approval; block that country’s corridors", "High floor Rule 1"],
      ["Foreign PEP UBO / director", "Corroborated SoW + MLRO/senior approval; PEP-neutral customer wording", "High"],
      ["Related-party heavy flows", "Intercompany agreements; auditor-confirmed group structure", "Enhanced monitoring"],
    ],
    [52, 78, 52],
  );
  paragraph(
    state,
    "Each natural-person UBO also needs individual baseline: passport/ID + proof of address in their country of residence (same retail PoA rules).",
    7.8,
    BRAND.ink,
  );
}

function sectionEstablishment(state: PdfState) {
  heading(state, "8. By establishment country");
  table(
    state,
    ["Established in", "Default posture", "Local flavour", "Activity extras still apply"],
    [
      ["Pakistan", "High / EDD", "SECP + trade licence; UBO CNIC/passport + PK PoA", "Trade: invoice+B/L+customs"],
      ["Egypt", "High / EDD", "Commercial register + tax/VAT; EG address", "TBML reconciliation for goods"],
      ["Turkey", "Med / EDD", "Ticaret sicil + vergi; TR address", "Dual-use/end-use if relevant"],
      ["Bangladesh", "Med / Std+", "RJSC + trade licence", "Garment: wage-file / agent licence"],
      ["Indonesia", "Med / Std+", "NIB/OSS + AKTA", "E-commerce plausibility; VA"],
      ["Philippines", "Med / Std+", "SEC + BIR/mayor’s", "Commission linkage; gaming = decline"],
      ["Saudi", "Med / Std+", "CR + licence", "PEP screen; note Zenus RE/construction ban"],
      ["Jordan", "Med–High", "Companies control docs", "Charity whitelist + TF"],
      ["UAE", "Hub / EDD", "Mainland or FZ pack + Ejari/establishment card", "Re-export TBML; substance anti-shell"],
    ],
    [28, 26, 68, 60],
  );
}

function sectionExamples(state: PdfState) {
  heading(state, "9. Worked examples");
  callout(
    state,
    "Egyptian trading LLC — Egyptian UBOs",
    "Licence + commercial register + MOA + Cairo office proof + UBO IDs/PoA + ownership chart + 12m statements + W-8BEN-E/tax + sample invoices + B/L + customs + expected suppliers/countries. Lane: High/EDD amber→green if complete day 0.",
  );
  callout(
    state,
    "UAE FZE — re-export trading",
    "FZ licence + incorporation + establishment card/lease + UBO Emirates ID/passport + Ejari + 12m statements + trade docs + substance (employees/utilities) + Zenus attestation. Decline if no substance / circular invoicing.",
    BRAND.panel,
    BRAND.header,
  );
  callout(
    state,
    "Pakistani IT LLC — German UBO in Germany",
    "Full PK KYB + German UBO passport + German PoA (<90d) + UBO SoW + PK 12m statements + client contracts showing real deliverables. High (PK corridor); German nationality is not a Low shortcut.",
    BRAND.goldSoft,
    BRAND.gold,
  );
  callout(
    state,
    "PH gaming / POGO",
    "Decline at G2. No document pack.",
    [251, 231, 234],
    BRAND.hi,
  );
}

function sectionLanes(state: PdfState) {
  state.y = newPage(state);
  heading(state, "10. Fast / whitelisted SME cycles");
  table(
    state,
    ["Lane", "Entry conditions", "Target", "Feeling"],
    [
      ["Green", "Activity not prohibited · establishment permitted · ≤2 natural UBOs with IDs/PoA · screening clear · full baseline + 12m statements + activity evidence day 0 · no Rule-1 / Foreign PEP", "< 48–72h", "Momentum"],
      ["Amber EDD", "General trading / e-commerce / High corridor · same docs + trade/service extras · analyst reconciliation", "Complete pack → decision ≤72h", "Fair review"],
      ["Red", "Restricted UBO SoW · Foreign PEP · FI/VASP/NPO · incomplete UBO · thin substance · dual-use adjacency", "Senior / MLRO", "Honest stakes"],
    ],
    [22, 88, 36, 36],
  );
  subheading(state, "Soft product controls after activation");
  bulletList(state, [
    "Counterparty screening before first material B2B",
    "Trade-doc reconciliation above thresholds",
    "Block restricted/prohibited corridors",
    "No nested / correspondent / payable-through features",
    "Lower velocity until behaviour matches profile",
  ]);
}

function sectionMatrix(state: PdfState) {
  heading(state, "11. One-page activity → docs matrix");
  table(
    state,
    ["Activity bucket", "Heat", "Zenus gate", "Baseline", "Extras", "Fast?"],
    [
      ["Simple retail / education / medical / food mfg", "Low–Med", "Usually OK", "Full §3", "Light evidence", "Yes*"],
      ["IT / professional services (non-prohibited)", "Med–High", "Watch wording", "Full §3", "Contracts + deliverables", "Yes*"],
      ["Textile / garment mfg", "Med", "OK", "Full §3", "Payroll + suppliers", "Amber"],
      ["General trading / import-export", "High", "OK + EDD", "Full §3", "Invoice + B/L + customs", "Amber"],
      ["E-commerce", "High", "OK + EDD", "Full §3", "Platform + suppliers", "Amber"],
      ["DPMS / jewellery", "High", "High EDD", "Full §3", "DPMS trail", "Amber/Red"],
      ["Holding / IP", "High", "OK + EDD", "Full §3", "Group + pricing", "Amber/Red"],
      ["Crypto / MSB / EMI", "High", "EDD only", "§3 + licence", "AML programme", "Red"],
      ["NPO / charity", "High", "EDD only", "§3 + ministry", "Donor/beneficiary", "Red"],
      ["Gaming / arms / TPPP / prepaid / shell MSB / RE & construction", "Prohib.", "Decline", "—", "—", "No"],
    ],
    [48, 18, 28, 22, 40, 26],
  );
  paragraph(state, "* Corridor may still force EDD (e.g. EG/PK establishment).", 7, BRAND.muted);
}

function sectionClose(state: PdfState) {
  heading(state, "12. Parallel to retail — same logic");
  table(
    state,
    ["Retail driver", "SME equivalent"],
    [
      ["Residence country", "Establishment country"],
      ["Passport + PoA", "Licence + registry + office proof"],
      ["Payslips + statements", "12m business statements + contracts/invoices"],
      ["Nationality overlay", "UBO nationality / SoW overlay"],
      ["Corridor EDD", "Same corridors (EG/PK High, etc.)"],
      ["Green lane = complete retail pack", "Green lane = complete KYB + UBO resolved + activity evidence"],
    ],
    [70, 112],
  );
  heading(state, "13. What not to do");
  bulletList(state, [
    "Do not onboard without natural-person UBOs",
    "Do not collect a 40-document dump for a prohibited activity — decline early",
    "Do not treat foreign UBO nationality as a Low shortcut on a High establishment corridor",
    "Do not skip 12-month statements on Global Account to “move faster”",
    "Do not tip off with “PEP” language — routine verification only",
  ]);
  state.y = ensure(state, 36);
  heading(state, "14. Sign-off");
  paragraph(
    state,
    "I confirm this SME Onboarding Document Playbook aligns with the Mal KYB matrix, Zenus §6.4 and Mal-CRAM-US-01, and is fit for operator use and customer-facing checklists.",
    8,
    BRAND.ink,
  );
  state.doc.setFont("helvetica", "normal");
  state.doc.setFontSize(9);
  state.doc.setTextColor(...BRAND.ink);
  state.doc.text("MLRO / Compliance: __________________________  Date: ______________", state.margin, state.y);
  state.y += 9;
  state.doc.text("KYB / Product: ______________________________  Date: ______________", state.margin, state.y);
}

export async function buildSmeOnboardingPlaybookPdf(): Promise<jsPDF> {
  const state = createState(SME_PLAYBOOK_META.documentId, "SME · Legal persons / KYB");
  cover(state);
  sectionJourney(state);
  sectionDataPoints(state);
  sectionBaseline(state);
  sectionLegalForm(state);
  sectionActivityGate(state);
  sectionActivityExtras(state);
  sectionUbo(state);
  sectionEstablishment(state);
  sectionExamples(state);
  sectionLanes(state);
  sectionMatrix(state);
  sectionClose(state);
  footer(state);
  return state.doc;
}

export async function exportSmeOnboardingPlaybookPdf(): Promise<void> {
  const doc = await buildSmeOnboardingPlaybookPdf();
  doc.save(
    `Mal-GA-SME-Onboarding-Playbook-v${SME_PLAYBOOK_META.version}-${new Date().toISOString().slice(0, 10)}.pdf`,
  );
}
