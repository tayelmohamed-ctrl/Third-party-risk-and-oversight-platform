/**
 * Oscilar compliance rule library — aligned to Oscilar_Compliance_Redline.pdf
 * and Mal FinCrime OS partner integration (Phase 0–2).
 *
 * Covers all MAL app users: money transfers + card payments (domestic & cross-border).
 * Transaction screening hits mirror to Vital4; TM alerts feed CRAM re-rating.
 */
export type PaymentChannel = "transfer" | "card" | "both";
export type RuleSeverity = "critical" | "high" | "medium" | "low";
export type RuleStatus = "active" | "tuning" | "shadow";

export interface OscilarTmRule {
  id: string;
  name: string;
  category: string;
  channel: PaymentChannel;
  typology: string;
  description: string;
  trigger: string;
  thresholds: string;
  severity: RuleSeverity;
  action: string;
  cramRef?: string;
  overrideId?: string;
  policyRef?: string;
  status: RuleStatus;
  /** Oscilar workflow / decision step reference */
  workflowStep?: string;
}

export interface ProgrammeSection {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
}

export interface ScoringTier {
  tier: string;
  scoreRange: string;
  sla: string;
  action: string;
  cramLink?: string;
}

export interface WorkflowStep {
  step: number;
  name: string;
  actor: string;
  detail: string;
  outcome?: string;
}

export interface AlertCaseStage {
  stage: string;
  owner: string;
  sla: string;
  outputs: string[];
}

/** Transaction Screening Programme — scope & governance */
export const TXN_SCREENING_PROGRAMME: ProgrammeSection[] = [
  {
    id: "scope",
    title: "Programme scope",
    summary: "Every payment initiated in the MAL app is screened in real time before settlement.",
    bullets: [
      "Domestic AED transfers (P2P, account-to-account, beneficiary payments)",
      "Cross-border remittance (corridor-specific rules: UAE, GCC, South Asia, EU, US BaaS)",
      "Debit & virtual card authorisations (POS, e-commerce, contactless, ATM)",
      "Card refunds, chargebacks, and merchant settlement flows",
      "Applies to Retail, Affluent, HNW, SME, and Corporate segments — tuned by CRA rating",
    ],
  },
  {
    id: "authority",
    title: "Screening authority (locked)",
    summary: "Oscilar evaluates; Vital4 is the sole disposition authority for list hits.",
    bullets: [
      "Oscilar txn screening: real-time payment decision + alert generation",
      "Sanctions / PEP / watchlist hits: ALWAYS mirror → Vital4 case ID (never write CRAM fields directly)",
      "CRAM reads Vital4 disposition only before score / activation",
      "Shufti Pro: identity only — AML fields ignored",
      "Dual region: UAE callbacks + US BaaS partition (FinCEN path)",
    ],
  },
  {
    id: "coverage",
    title: "What investigators verify",
    summary: "Confirm every rail and segment has an active Oscilar workflow deployed.",
    bullets: [
      "All transfer products mapped to Oscilar input schema (amount, corridor, beneficiary, SOF tags)",
      "All card products mapped (MCC, merchant country, 3DS, device, velocity windows)",
      "High / Prohibited CRA customers on enhanced scenario pack (no silent downgrade)",
      "New corridors or products require scenario back-test before production deploy",
      "Monthly rule coverage attestation in Governance open-items register",
    ],
  },
];

/** Transaction Screening Scoring Model */
export const TXN_SCREENING_SCORING: { intro: string; dimensions: ProgrammeSection[]; tiers: ScoringTier[] } = {
  intro: "Oscilar Alert Scoring v2.1 combines payment attributes, customer CRA, device/behaviour signals, and counterparty intelligence. Scores route alerts to the correct SLA queue and CRAM feed severity.",
  dimensions: [
    {
      id: "customer",
      title: "Customer context",
      summary: "CRA rating and KYC freshness weight the alert.",
      bullets: [
        "CRA Low / Medium / High / Prohibited — threshold multipliers",
        "PEP / adverse / sanctions disposition from Vital4 (not Shufti)",
        "Expected activity band vs observed (Policy §12.6)",
        "Account age, dormancy flag, prior STR/SAR (OVR-010)",
      ],
    },
    {
      id: "payment",
      title: "Payment attributes",
      summary: "Amount, corridor, and instrument drive inherent alert score.",
      bullets: [
        "Amount vs declared income / expected monthly band",
        "Corridor risk (high-risk jurisdiction adjacency)",
        "Round-amount clustering (layering typology)",
        "New beneficiary / new merchant / first-time counterparty",
        "Card: MCC risk, cross-border card, CNP vs CP, 3DS outcome",
      ],
    },
    {
      id: "network",
      title: "Network & device",
      summary: "Shared infrastructure and mule patterns elevate score.",
      bullets: [
        "Device fingerprint reuse across customers",
        "Beneficiary fan-in / fan-out (funnel accounts)",
        "Pass-through ratio within 24–48h",
        "VPN / proxy / emulator flags (digital assurance)",
      ],
    },
  ],
  tiers: [
    { tier: "Critical", scoreRange: "90–100", sla: "Immediate", action: "Block / hold settlement · MLRO alert · Vital4 mirror if list-adjacent", cramLink: "Feed → re-rate · OVR-001 path" },
    { tier: "High", scoreRange: "70–89", sla: "Same day", action: "Step-up auth or hold · Mohsen case prep · Enhanced monitoring", cramLink: "TRANSACTION_ANOMALY feed" },
    { tier: "Medium", scoreRange: "40–69", sla: "48 hours", action: "Alert queue · analyst disposition · false-positive learning", cramLink: "Behaviour flag · OVR-020 review if profile deviation" },
    { tier: "Low", scoreRange: "0–39", sla: "7 days batch", action: "Log · auto-close if whitelisted pattern · tune threshold", cramLink: "No re-rate unless pattern repeat" },
  ],
};

/** Transaction Screening Workflow */
export const TXN_SCREENING_WORKFLOW: WorkflowStep[] = [
  { step: 1, name: "Payment initiated", actor: "MAL app / Core banking", detail: "Transfer or card auth payload sent to Oscilar decision workflow with customerId, amount, corridor, beneficiary/MCC, device.", outcome: "Continue" },
  { step: 2, name: "Real-time rules & ML", actor: "Oscilar", detail: "Rule library + anomaly models evaluate. Alert score computed. List screening sub-flow runs.", outcome: "Allow | Step-up | Hold | Block" },
  { step: 3, name: "List hit mirror", actor: "CRAM orchestrator", detail: "If sanctions/PEP/watchlist signal: create Vital4 case via mirror API. Link oscilarAlertId ↔ vital4CaseId in case_links.", outcome: "Pending Vital4 disposition" },
  { step: 4, name: "Settlement gate", actor: "Core banking", detail: "Allow only if Oscilar decision = allow AND no pending Vital4 true-match hold.", outcome: "Settled or rejected" },
  { step: 5, name: "Post-txn monitoring", actor: "Oscilar batch", detail: "Rolling windows re-evaluate velocity, pass-through, corridor drift. Batch alerts feed same case queue.", outcome: "TM alert if threshold breach" },
  { step: 6, name: "CRAM feed", actor: "Mal FinCrime OS", detail: "High/Critical alerts → POST /api/v1/crr/events (transaction-monitoring). Queue worker calls reRate() → OVR-020 / OVR-010 as applicable.", outcome: "Updated CRA + MLRO alert" },
  { step: 7, name: "Investigation", actor: "Mohsen → Investigator", detail: "Case prepared (6-step pipeline). Disposition syncs bi-directionally with Oscilar case (Phase 4).", outcome: "Close | Escalate | SAR" },
];

/** Alert & Case Management */
export const TXN_SCREENING_CASE_MGMT: AlertCaseStage[] = [
  { stage: "Alert raised", owner: "Oscilar", sla: "Real-time", outputs: ["Alert ID", "Scenario ID", "Score tier", "Payment ref"] },
  { stage: "Entity grouping", owner: "Oscilar", sla: "Automatic", outputs: ["Grouped by customer / beneficiary / device cluster"] },
  { stage: "Triage L1", owner: "Analyst", sla: "4h (potential) · 48h (pending)", outputs: ["Quick disposition", "Whitelist candidate", "Escalate to L2"] },
  { stage: "Investigation L2", owner: "Mohsen prepares", sla: "Per case SLA", outputs: ["Evidence pack", "Behaviour narrative", "CRAM ref linkage"] },
  { stage: "MLRO decision", owner: "MLRO", sla: "Before SAR deadline", outputs: ["Approve SAR", "Close non-risk", "Request EDD"] },
  { stage: "Vital4 disposition", owner: "Analyst (screening queue)", sla: "4h potential match", outputs: ["clear | false_positive | true_match", "Mirrors to onboarding if linked"] },
  { stage: "SAR / STR / CTR", owner: "Jana drafts", sla: "Regulatory", outputs: ["goAML (UAE)", "FinCEN SAR (US BaaS)", "FinCEN CTR Form 104 (US cash ≥ $10k)"] },
];

export const OSCILAR_RULE_CATEGORIES = [
  "Structuring & smurfing",
  "Layering & pass-through",
  "Velocity & volume anomalies",
  "Cross-border & corridor risk",
  "Sanctions & TF evasion",
  "Card & merchant fraud",
  "Mule & funnel accounts",
  "Dormancy & profile deviation",
  "Crypto / VA off-ramp",
  "PEP & enhanced monitoring",
] as const;

export type OscilarRuleCategory = (typeof OSCILAR_RULE_CATEGORIES)[number];

/**
 * Five-gate onboarding decision spine (Self-Transfer & C2C Scenario Pack §0.1 / CRAM §0).
 * The AI never scores first — it runs the gates in order and stops at the first that produces an
 * outcome, so only the documents surviving gates trigger are requested ("quick EDD").
 */
export interface DecisionGate { id: string; name: string; checks: string; failCondition: string; }
export const FIVE_GATE_SPINE: DecisionGate[] = [
  { id: "G0", name: "Residence & corridor hard-stops", checks: "Country of residence + active corridor vs the Zenus restricted/prohibited list", failCondition: "Residence in a restricted/prohibited country → permanent hard block. Corridor to/from restricted/prohibited → reject." },
  { id: "G1", name: "Screening (fail-closed)", checks: "Sanctions/OFAC, 50%-rule, PEP, adverse media — before any score", failCondition: "Confirmed SDN / 50%-owned / prohibited-jurisdiction nexus → Prohibited/Block; no score computed." },
  { id: "G2", name: "Prohibited type / structure", checks: "(Entities) business type; UBO; lawful purpose", failCondition: "N/A for individual self/C2C flows except unlicensed-MSB / hawala use of a personal account → decline + escalate." },
  { id: "G3", name: "Score + floors", checks: "Weighted CRAM score → Low/Medium/High, then floors", failCondition: "Foreign PEP, restricted-country SoW/SoF (Rule 1), high-corridor concentration → High floor." },
  { id: "G4", name: "Targeted EDD pull", checks: "Only the incremental documents each surviving trigger requires", failCondition: "Missing baseline KYC → block activation (no default-to-Low). Missing EDD after 72h RFI → hold/decline." },
];

/** Alert-triage priority SLAs (Self-Transfer & C2C Scenario Pack §4). */
export const ALERT_TRIAGE_SLA = [
  { priority: "P1", target: "≤ 4h", scope: "Critical alert · potential sanctions match" },
  { priority: "P2", target: "≤ 24h", scope: "High alert" },
  { priority: "P3", target: "≤ 48h", scope: "Medium alert · pending screening" },
] as const;
export const RESCREEN_CADENCE = "Watchlist hit → SDN delta re-screen ≤24h, other lists ≤48h, re-score on hit. High / PEP / Rule-1 relationships get a ≤12-month review (≤6-month on the hottest UAE→PK route).";

/** Always-on handling — anti-tipping-off + victim-aware exit (Self-Transfer & C2C Scenario Pack §5.3–5.4). */
export const TM_HANDLING_PRINCIPLES = {
  antiTippingOff: [
    "Never state that a customer triggered a sanctions match, PEP flag, mule/synthetic review, or that a SAR is being considered.",
    "Never use the word 'PEP' to the customer — every request is framed as routine verification.",
    "SAR records are access-restricted and retained 5 years.",
  ],
  victimAwareExit: [
    "Where a segment is targeted as mules (migrant workers, students, retirees, remote workers), the risk is third-party abuse of the account — the control is behaviour-based monitoring + EDD, never denial of service by nationality or occupation (residency-primary / non-discrimination / UDAAP).",
    "Confirmed coerced mule → victim-aware exit (educate / exit), not punitive; still assess and file a SAR.",
    "Anti-tipping-off applies throughout the exit.",
  ],
} as const;
