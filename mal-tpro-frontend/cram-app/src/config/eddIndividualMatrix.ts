/**
 * EDD — Individual capture matrix.
 * Per-case Enhanced Due Diligence information/document pack for NATURAL PERSONS,
 * driven by the CRAM rating and the golden-thread EDD triggers (see engine/goldenThread.ts).
 *
 * Requirement model:
 *   baseline    — collected for every individual (CDD floor)
 *   edd         — required whenever EDD fires (final rating High or Prohibited)
 *   conditional — required only when a specific trigger is active (PEP, RCA, adverse, etc.)
 *
 * Perimeter basis: Global Account (US) = FinCEN CDD Rule; Mal Bank (UAE) = CBUAE Art. 15(14).
 * Geography note (US §7.1): geography is funds-flow — capture source-of-wealth / source-of-funds
 * countries + corridor; residence / nationality are recorded but not scored.
 */

export type EddReq = "baseline" | "edd" | "conditional";
export type EddTrigger =
  | "pep_any"
  | "pep_domestic_io"
  | "pep_enhanced"
  | "rca"
  | "sanctions_potential"
  | "adverse"
  | "behaviour";
export type EddSection = "identity" | "geography" | "sow_sof" | "pep_rca" | "screening" | "activity" | "approvals";

export interface EddMatrixRow {
  id: string;
  section: EddSection;
  /** What to collect / ask for. */
  item: string;
  req: EddReq;
  triggers?: EddTrigger[];
  policyRef: string;
}

export interface EddProfile {
  id: string;
  name: string;
  hint: string;
  badge: string;
  rating: "Low" | "Medium" | "High" | "Prohibited";
  pepTier: "None" | "Domestic" | "Foreign" | "IO";
  isRca: boolean;
  sanctionsPotential: boolean;
  adverse: boolean;
  behaviourFlag: boolean;
}

export const EDD_SECTION_LABELS: Record<EddSection, string> = {
  identity: "Identity & baseline CDD",
  geography: "Geography / funds-flow",
  sow_sof: "Source of wealth & funds (documentary)",
  pep_rca: "PEP & RCA",
  screening: "Screening & adverse media",
  activity: "Expected activity & purpose",
  approvals: "Approvals & monitoring",
};

export const EDD_TRIGGER_LABELS: Record<EddTrigger, string> = {
  pep_any: "PEP",
  pep_domestic_io: "Domestic / IO PEP",
  pep_enhanced: "PEP — enhanced measures",
  rca: "RCA (relative / associate)",
  sanctions_potential: "Potential sanctions match",
  adverse: "Adverse media",
  behaviour: "Expected-vs-actual flag",
};

export const MAL_EDD_GUIDELINES = {
  documentTitle: "EDD — Individual Capture Checklist",
  confidentiality: "CONFIDENTIAL — FOR INTERNAL AML/CFT USE ONLY",
  preparedBy: "Sayed · Mal FinCrime OS",
  modelVersion: "CRAM-2026-05",
  policyBasis: [
    "Mal CDD Policy 1.3 · Enhanced Due Diligence Policy 1.3 (EDD)",
    "Global Account (US): FinCEN CDD Rule · 31 CFR 1010.520 (foreign PEP EDD + SAR review)",
    "Mal Bank (UAE): CBUAE Rulebook · AML-CFT Law · Cabinet Decision 10/2019 · Art. 15(14)",
    "FATF Recommendation 12 — PEPs, family members & close associates (RCA)",
    "CRAM golden thread — inherent rating drives CDD/EDD, approval & monitoring",
  ],
  footerNotice:
    "Generated from live CRAM scoring; must not be relied upon without MLRO / compliance review. "
    + "Collect originals or certified copies and retain for 5 years minimum (CDD Policy retention).",
};

/** The capture matrix. Order defines display order within each section. */
export const EDD_INDIVIDUAL_MATRIX: EddMatrixRow[] = [
  // Identity & baseline CDD
  { id: "app",     section: "identity", req: "baseline", item: "Signed / e-signed account-opening application", policyRef: "CDD 1.3 §4.1" },
  { id: "id",      section: "identity", req: "baseline", item: "Government photo ID (passport / national ID) — verified via Shufti", policyRef: "CDD 1.3 · IDV" },
  { id: "dob",     section: "identity", req: "baseline", item: "Full legal name, date & place of birth, all nationalities", policyRef: "CDD 1.3 §4.2" },
  { id: "addr",    section: "identity", req: "baseline", item: "Proof of residential address (utility / bank statement / tenancy, ≤3 months)", policyRef: "CDD 1.3" },
  { id: "tax",     section: "identity", req: "baseline", item: "Tax residency & TIN self-certification", policyRef: "CRS / FATCA" },
  { id: "contact", section: "identity", req: "baseline", item: "Contact details + specimen signature", policyRef: "CDD 1.3" },

  // Geography / funds-flow
  { id: "sow-ctry", section: "geography", req: "baseline", item: "Source-of-wealth country and source-of-funds country (funds-flow, US §7.1)", policyRef: "CRAM §7.1" },
  { id: "corridor", section: "geography", req: "baseline", item: "Expected corridors, counterparties and jurisdictions", policyRef: "CRAM §7.1 · corridor" },
  { id: "residence", section: "geography", req: "baseline", item: "Residence / nationality recorded (not scored under US funds-flow model)", policyRef: "CRAM §7.1" },

  // Source of wealth & funds — documentary (EDD)
  { id: "e_sow",  section: "sow_sof", req: "edd", item: "Source of WEALTH corroborated with documentary evidence (employment/salary, business ownership, asset sale, inheritance, investments)", policyRef: "EDD 1.3 · goldenThread e_sow" },
  { id: "e_sof",  section: "sow_sof", req: "edd", item: "Source of FUNDS for the opening deposit (recent statements / payslips / sale or transfer contract)", policyRef: "EDD 1.3" },
  { id: "e_nw",   section: "sow_sof", req: "edd", item: "Net-worth / income substantiation proportionate to expected activity", policyRef: "EDD 1.3" },

  // PEP & RCA
  { id: "e_pep",    section: "pep_rca", req: "conditional", triggers: ["pep_any"], item: "PEP declaration + category (Foreign / Domestic / IO), position and tenure", policyRef: "goldenThread e_pep · FATF R.12" },
  { id: "e_pep_id", section: "pep_rca", req: "conditional", triggers: ["pep_domestic_io"], item: "Confirm PEP identification & enhanced monitoring (FinCEN CDD Rule / CBUAE Art. 15(14) Second)", policyRef: "goldenThread e_pep_id" },
  { id: "e_pep2",   section: "pep_rca", req: "conditional", triggers: ["pep_enhanced", "rca"], item: "Screen close associates / family and establish their ultimate source of wealth", policyRef: "goldenThread e_pep2 · FATF R.12" },
  { id: "e_rca",    section: "pep_rca", req: "conditional", triggers: ["rca"], item: "Record PEP relationship (relative / close associate) and the principal PEP's inherited tier", policyRef: "ScoreInput.pepRelationship · OVR-008/016" },

  // Screening & adverse media
  { id: "scr",     section: "screening", req: "baseline", item: "Vital4 screening record — sanctions / PEP / watchlist / adverse media", policyRef: "Vital4 · sole authority" },
  { id: "e_adv",   section: "screening", req: "conditional", triggers: ["adverse"], item: "Adverse-media assessment & disposition memo (materiality, recency, resolution)", policyRef: "goldenThread OVR-009" },
  { id: "e_scr",   section: "screening", req: "conditional", triggers: ["sanctions_potential"], item: "Escalate partial screening match to sanctions team; hold pending disposition (4h SLA)", policyRef: "goldenThread e_scr" },

  // Expected activity & purpose
  { id: "purpose", section: "activity", req: "baseline", item: "Purpose of account and expected monthly activity band", policyRef: "CDD 1.3 §12.5" },
  { id: "e_eva",   section: "activity", req: "conditional", triggers: ["behaviour"], item: "Expected-vs-actual review + KYC refresh; assess whether an STR is warranted", policyRef: "goldenThread e_eva · §12.6" },

  // Approvals & monitoring
  { id: "e_approval", section: "approvals", req: "edd", item: "Senior management / MLRO approval to establish the relationship (Foreign PEP → CO/MLRO sign-off)", policyRef: "goldenThread e_approval" },
  { id: "e_mon",      section: "approvals", req: "edd", item: "Enhanced ongoing monitoring configured at reduced thresholds", policyRef: "goldenThread e_mon" },
  { id: "e_review",   section: "approvals", req: "edd", item: "Review cadence set (High = annual) with next-review date", policyRef: "CRAM review cadence" },
];

export const EDD_DEMO_PROFILES: EddProfile[] = [
  { id: "edd-low",    name: "Retail — clean",           hint: "Egypt resident, funds from Zenus, non-PEP — baseline CDD, no EDD.",         badge: "Low",  rating: "Low",  pepTier: "None",    isRca: false, sanctionsPotential: false, adverse: false, behaviourFlag: false },
  { id: "edd-fpep",   name: "Foreign PEP",              hint: "Egypt resident, Foreign PEP — full EDD + PEP package.",                      badge: "High", rating: "High", pepTier: "Foreign", isRca: false, sanctionsPotential: false, adverse: false, behaviourFlag: false },
  { id: "edd-rca",    name: "RCA of Foreign PEP",       hint: "Close relative of a Foreign PEP — inherits Foreign tier; EDD + associates.", badge: "High", rating: "High", pepTier: "Foreign", isRca: true,  sanctionsPotential: false, adverse: false, behaviourFlag: false },
  { id: "edd-adverse", name: "High-risk + adverse media", hint: "High rating with an adverse-media true match — EDD + adverse pack.",       badge: "High", rating: "High", pepTier: "None",    isRca: false, sanctionsPotential: false, adverse: true,  behaviourFlag: false },
];

export function eddRequiredFor(p: EddProfile): boolean {
  return p.rating === "High" || p.rating === "Prohibited";
}

export function triggerActive(t: EddTrigger, p: EddProfile): boolean {
  switch (t) {
    case "pep_any": return p.pepTier !== "None";
    case "pep_domestic_io": return p.pepTier === "Domestic" || p.pepTier === "IO";
    case "pep_enhanced": return p.pepTier === "Foreign" || p.isRca || ((p.pepTier === "Domestic" || p.pepTier === "IO") && eddRequiredFor(p));
    case "rca": return p.isRca;
    case "sanctions_potential": return p.sanctionsPotential;
    case "adverse": return p.adverse;
    case "behaviour": return p.behaviourFlag;
  }
}

export interface EddResolvedRow extends EddMatrixRow {
  applies: boolean;
  reason: string;
}

/** Resolve the per-case pack: which rows apply and why. */
export function resolveEddPack(p: EddProfile): EddResolvedRow[] {
  return EDD_INDIVIDUAL_MATRIX.map((row) => {
    if (row.req === "baseline") return { ...row, applies: true, reason: "Baseline CDD" };
    if (row.req === "edd") return { ...row, applies: eddRequiredFor(p), reason: "EDD — High rating" };
    const hit = (row.triggers ?? []).find((t) => triggerActive(t, p));
    return { ...row, applies: !!hit, reason: hit ? EDD_TRIGGER_LABELS[hit] : "" };
  });
}
