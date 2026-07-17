/**
 * Global Account onboarding cycle demos — Individual & SME.
 * Driven by playbook content (MAL-GA-ONB-*-PLAYBOOK-v1.0) for executive dashboard viz.
 */

export type OnboardingCycleKind = "individual" | "sme";

export interface OnboardingBeat {
  id: string;
  n: string;
  label: string;
  feel: string;
  detail: string;
  docs: string[];
}

export interface OnboardingLane {
  id: "green" | "amber" | "red";
  label: string;
  target: string;
  entry: string;
}

export interface OnboardingCycleDemo {
  kind: OnboardingCycleKind;
  title: string;
  subtitle: string;
  accent: string;
  promise: string;
  before: string;
  after: string;
  example: string;
  documentId: string;
  beats: OnboardingBeat[];
  lanes: OnboardingLane[];
  gifFrames: string[];
}

export const INDIVIDUAL_ONBOARDING_DEMO: OnboardingCycleDemo = {
  kind: "individual",
  title: "Individual onboarding",
  subtitle: "Natural persons · Global Account",
  accent: "#3DC08B",
  promise: "Clear asks. Risk-based. Fast green lane when the pack is complete.",
  before: "Confused by RFIs, nationality treated as High, abandoned mid-upload.",
  after: "Knows exactly what to upload; account activated under fair monitoring.",
  example: "Hungarian in Egypt — passport + EG visa + EG PoA (<90d) + employer + 3 payslips + 3m statements.",
  documentId: "MAL-GA-ONB-IND-PLAYBOOK-v1.0",
  gifFrames: [
    "Promise",
    "Your pack",
    "Upload once",
    "Why these",
    "Green lane",
    "Account live",
  ],
  beats: [
    {
      id: "promise",
      n: "01",
      label: "Promise",
      feel: "Theme stated",
      detail: "Residence + income drive the pack — nationality alone never sets High.",
      docs: ["Why we ask", "Corridor posture", "What “done” looks like"],
    },
    {
      id: "pack",
      n: "02",
      label: "Your pack",
      feel: "Save the Cat",
      detail: "Personal checklist appears instantly — ID, PoA, income, purpose.",
      docs: ["Passport / national ID", "PoA ≤90 days", "Tax self-cert"],
    },
    {
      id: "upload",
      n: "03",
      label: "Upload once",
      feel: "Catalyst",
      detail: "Pre-request SoF with baseline so High-corridor cases don’t stall on RFIs.",
      docs: ["Employer letter / contract", "3 payslips", "3-month bank statements"],
    },
    {
      id: "trust",
      n: "04",
      label: "Why these",
      feel: "Debate → trust",
      detail: "Five-gate spine: residence → screening → score → targeted EDD only.",
      docs: ["G0–G4 gates", "Screening clear", "Trigger-based extras"],
    },
    {
      id: "green",
      n: "05",
      label: "Green lane",
      feel: "Fun & Games",
      detail: "Complete pack + clean gates → same-day / <48h path. No nationality whitelist.",
      docs: ["Progress meter", "Lane badge", "Soft velocity limits"],
    },
    {
      id: "live",
      n: "06",
      label: "Account live",
      feel: "Finale",
      detail: "Activated under corridor-appropriate monitoring. Transformation visible.",
      docs: ["Activation", "Enhanced monitoring if High", "Ownable “you’re live” state"],
    },
  ],
  lanes: [
    { id: "green", label: "Green", target: "< 24–48h", entry: "Permitted residence · screening clear · full pack day 0" },
    { id: "amber", label: "Amber EDD", target: "≤ 72h", entry: "High corridor (EG/PK/AE hub) · complete pack · SoF check" },
    { id: "red", label: "Red", target: "Senior path", entry: "Foreign PEP · Rule-1 SoW · adverse · prohibited nexus" },
  ],
};

export const SME_ONBOARDING_DEMO: OnboardingCycleDemo = {
  kind: "sme",
  title: "SME onboarding",
  subtitle: "Legal persons · KYB · Global Account",
  accent: "#39B9ED",
  promise: "One complete company pack. Activity-specific extras. Fast when ownership is clear.",
  before: "Opaque RFIs, unresolved UBOs, trading firms stuck in limbo.",
  after: "Knows the company pack; UBO resolved; trading evidence ready; live under fair limits.",
  example: "EG trading LLC — licence + register + MOA + office + UBO pack + 12m statements + invoices + B/L + customs.",
  documentId: "MAL-GA-ONB-SME-PLAYBOOK-v1.0",
  gifFrames: [
    "Promise",
    "Company pack",
    "Owners clear",
    "Activity fit",
    "Green lane",
    "Account live",
  ],
  beats: [
    {
      id: "promise",
      n: "01",
      label: "Promise",
      feel: "Theme stated",
      detail: "Establishment + activity + UBO drive the pack — not a dump of 40 docs for every SME.",
      docs: ["Legal form", "Licence activities", "Expected counterparties"],
    },
    {
      id: "company",
      n: "02",
      label: "Company pack",
      feel: "Save the Cat",
      detail: "KYB core: licence, incorporation, MOA, office, signatory, Zenus attestation.",
      docs: ["Trade licence", "Registry extract", "MOA/AOA", "Office proof", "Signatory ID"],
    },
    {
      id: "owners",
      n: "03",
      label: "Owners clear",
      feel: "Catalyst",
      detail: "UBO to natural persons is Priority-1 — unresolved within RFI window → refuse.",
      docs: ["UBO declaration + IDs", "Ownership chart", "Shareholder register"],
    },
    {
      id: "activity",
      n: "04",
      label: "Activity fit",
      feel: "Debate → trust",
      detail: "Zenus §6.4 gate first. Then activity extras (trade docs, deliverables, substance).",
      docs: ["12m bank statements", "Invoices / contracts", "W-8BEN-E + tax", "Activity evidence"],
    },
    {
      id: "green",
      n: "05",
      label: "Green lane",
      feel: "Fun & Games",
      detail: "≤2 natural UBOs, screening clear, full pack day 0 → <48–72h. No nested/correspondent.",
      docs: ["Lane badge", "Substance check", "Counterparty readiness"],
    },
    {
      id: "live",
      n: "06",
      label: "Account live",
      feel: "Finale",
      detail: "Activated with soft B2B controls until behaviour matches profile.",
      docs: ["Activation", "Trade-doc thresholds", "Corridor blocks"],
    },
  ],
  lanes: [
    { id: "green", label: "Green", target: "< 48–72h", entry: "Activity allowed · ≤2 UBOs · full KYB + 12m statements day 0" },
    { id: "amber", label: "Amber EDD", target: "≤ 72h", entry: "Trading / e-commerce / High corridor · trade extras reconciled" },
    { id: "red", label: "Red", target: "Senior / MLRO", entry: "Rule-1 UBO · Foreign PEP · FI/VASP/NPO · thin substance" },
  ],
};

export const ONBOARDING_CYCLE_DEMOS: OnboardingCycleDemo[] = [
  INDIVIDUAL_ONBOARDING_DEMO,
  SME_ONBOARDING_DEMO,
];

export function getOnboardingCycleDemo(kind: OnboardingCycleKind): OnboardingCycleDemo {
  return kind === "sme" ? SME_ONBOARDING_DEMO : INDIVIDUAL_ONBOARDING_DEMO;
}
