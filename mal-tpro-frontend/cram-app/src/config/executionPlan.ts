/**
 * FinCrime AI Operating Model — Leadership Execution Plan (v2) + Task Register v2.
 * Source: fincrime-ai-leadership-execution-plan-v2 · The FinCrime AI Tactical Playbook ·
 * fincrime-ai-task-register-v2 (46 tasks, T01–T46).
 *
 * Perimeter: Mal Global Account (US / FinCEN · MSB & BaaS: Zenus, Rain, SwiftX · corridors
 * US · PK · EG · BD · DE). Coach / owner: Tayel (MLRO).
 *
 * This is the coach's oversight model: every human owner is listed separately with their
 * accountable outcomes, tasks, the report the coach asks for, and the AI agent their
 * feedback fine-tunes (governed via the MRM gate).
 */

export type Phase = "0" | "1" | "2" | "3" | "4" | "Ongoing";
export type Priority = "P0" | "P1" | "P2" | "Ongoing";
export type Line = "1st" | "2nd" | "3rd" | "Support";
export type TaskStatus = "not_started" | "in_progress" | "blocked" | "done";

export interface ExecTask {
  id: string;
  phase: Phase;
  priority: Priority;
  ownerId: string;
  task: string;
  tool: string;
  acceptance: string;
  control: string;
  timeline: string;
}

export interface AgentFeed {
  agentId: string;
  signal: string;
}

export interface Person {
  id: string;
  name: string;
  role: string;
  line: Line;
  interim?: boolean;
  independent?: boolean;
  accountable: string[];
  ownsAgents: string[];
  report: { title: string; cadence: string; asks: string[] };
  feeds: AgentFeed[];
  note?: string;
}

export interface ExecAgent {
  id: string;
  name: string;
  focus: string;
  color: string;
  ownerId: string;
  ownerLabel: string;
  feedback: string;
  gate: string;
}

export const LINE_LABELS: Record<Line, string> = {
  "1st": "1st line · Build & Operate",
  "2nd": "2nd line · Oversight",
  "3rd": "3rd line · Independent",
  Support: "Cross-cutting support",
};

export const PHASE_LABELS: Record<Phase, string> = {
  "0": "Phase 0 · Foundations & independence",
  "1": "Phase 1 · Stand up the pool & rails",
  "2": "Phase 2 · Reporting, sanctions & fine-tune loop",
  "3": "Phase 3 · AI failure modes & competence",
  "4": "Phase 4 · Exit interim & rehearse the exam",
  Ongoing: "Ongoing cadence",
};

export const STATUS_META: Record<TaskStatus, { label: string; pill: string }> = {
  not_started: { label: "Not started", pill: "bg-panel2 text-muted" },
  in_progress: { label: "In progress", pill: "bg-ai/15 text-ai" },
  blocked: { label: "Blocked", pill: "bg-hi/15 text-hi" },
  done: { label: "Done", pill: "bg-low/15 text-low" },
};

export const EXEC_AGENTS: ExecAgent[] = [
  { id: "sayed",  name: "Sayed",  focus: "KYB / CRAM scoring & re-rating", color: "#39B9ED", ownerId: "dinesh", ownerLabel: "Dinesh (Onboarding)", feedback: "CRAM override reasons & sign-off outcomes", gate: "MRM validation" },
  { id: "mohsen", name: "Mohsen", focus: "L1/L2 investigation & narrative drafting", color: "#A953DF", ownerId: "fiu", ownerLabel: "FIU Lead / MLRO (interim)", feedback: "Calibrated pool annotations → golden set", gate: "MRM gate (SR 11-7)" },
  { id: "jana",   name: "Jana",   focus: "Reporting, RFI auto-chase, CTR drafting", color: "#7C6CF7", ownerId: "jason", ownerLabel: "Jason (Dep. MLRO)", feedback: "Filing quality & RFI outcomes", gate: "MRM validation" },
  { id: "vital4", name: "Vital4", focus: "OFAC / list nuance / fuzzy-matching", color: "#2FD8A6", ownerId: "terani", ownerLabel: "Terani (Sanctions)", feedback: "FP / true-match dispositions", gate: "Vendor validation (non-reliance)" },
];

export const EXEC_PEOPLE: Person[] = [
  {
    id: "tayel", name: "Tayel", role: "MLRO — The Head Coach", line: "2nd",
    accountable: [
      "Design, policy, risk appetite, exam posture (non-delegable)",
      "Interim 2LOD monitoring + QA — time-boxed, hard sunset required",
    ],
    ownsAgents: [],
    report: { title: "Weekly Command Review", cadence: "Weekly", asks: [
      "Phase / task burn-down vs the 28-week timeline",
      "Open P0s and any Critical-risk movement (R1–R7)",
      "Sunset-trigger tracking — EDD volume / QA hire / Phase 4",
      "Exam-readiness posture",
    ] },
    feeds: [],
    note: "Sets risk appetite for every agent; owns the system, not a single agent.",
  },
  {
    id: "dinesh", name: "Dinesh", role: "Onboarding & Customer Risk", line: "1st",
    accountable: [
      "Onboarding & customer-risk sign-off (signs the disposition)",
      "Fail-closed pre-funding sanctions/PEP gate across the BaaS rails",
      "Pre-request SoF/SoW at onboarding for EDD-likely customers",
    ],
    ownsAgents: ["sayed"],
    report: { title: "Onboarding & CRR Report", cadence: "Weekly", asks: [
      "Onboarding throughput & cycle time",
      "Pre-funding gate — blocks + fail-closed evidence",
      "SoW/SoF pre-request coverage on EDD-likely cases",
      "CRAM override rate & reasons (feeds Sayed calibration)",
    ] },
    feeds: [{ agentId: "sayed", signal: "Override reasons & sign-off outcomes → CRAM scoring calibration" }],
  },
  {
    id: "terani", name: "Terani", role: "Sanctions & Screening", line: "1st",
    accountable: [
      "Sanctions & screening adjudication (owns Vital4)",
      "Blocking/rejection reporting · OFAC 50%-rule · ~10-day reporting",
      "List-update SLA + batch re-screening",
    ],
    ownsAgents: ["vital4"],
    report: { title: "Screening & Sanctions Report", cadence: "Weekly", asks: [
      "Alert volume, false-positive rate, true-match dispositions",
      "Blocking / reporting SLA adherence",
      "List-update latency & batch re-screen runs",
      "Fuzzy-match tuning candidates (Vital4)",
    ] },
    feeds: [{ agentId: "vital4", signal: "FP / true-match dispositions → fuzzy-match threshold tuning" }],
  },
  {
    id: "jason", name: "Jason", role: "Deputy MLRO — Reporting", line: "1st",
    accountable: [
      "SAR/CTR/STR filing operations (filing decision stays human)",
      "SAR write-back with immutable, timestamped provenance",
      "314(a) handling · after-action debriefs · exam pack",
    ],
    ownsAgents: ["jana"],
    report: { title: "Reporting & Filing Report", cadence: "Weekly", asks: [
      "SARs / CTRs filed, in-flight, overdue",
      "RFI auto-chase performance (Jana)",
      "SAR-firewall / channel-restriction integrity",
      "Exam-pack assembly status",
    ] },
    feeds: [{ agentId: "jana", signal: "Filing quality & RFI outcomes → narrative / template tuning" }],
  },
  {
    id: "fiu", name: "FIU Lead", role: "Investigations — (MLRO interim)", line: "1st", interim: true,
    accountable: [
      "Case disposition, EDD, escalate-or-file — signs dispositions (pool cannot)",
      "Mohsen loop: annotation → senior calibration → inter-rater agreement",
      "Pool risk-tiering, certification & weekly ops review",
    ],
    ownsAgents: ["mohsen"],
    report: { title: "Investigations & Mohsen-Loop Report", cadence: "Weekly", asks: [
      "Dispositions signed; escalate-or-file counts",
      "Inter-rater agreement & calibration metrics",
      "Golden-set contributions staged for the MRM gate",
      "Corridor cycle time & SLA breaches",
    ] },
    feeds: [{ agentId: "mohsen", signal: "Calibrated annotations → golden set → MRM gate → fine-tune" }],
    note: "Accountable owner interim held by Tayel until named; legal-consequence calls never sit with a junior.",
  },
  {
    id: "cip", name: "Corridor Pool (CIP)", role: "L1 gatherers · US / PK / EG / BD / DE", line: "1st",
    accountable: [
      "L1 evidence gathering, corridor context, local-language adverse media",
      "Structured case-narrative drafts + annotation / labelling for Mohsen",
      "Augments — never replaces — the accountable decision",
    ],
    ownsAgents: [],
    report: { title: "Corridor Pod Report", cadence: "Weekly · per pod", asks: [
      "Cases worked & annotation volume per corridor",
      "Annotation quality (post-calibration acceptance rate)",
      "Corridor-specific typology signals surfaced",
      "Access / conduct exceptions (VDI logs)",
    ] },
    feeds: [{ agentId: "mohsen", signal: "L1 annotations — never straight to model; via calibration + MRM gate" }],
    note: "Contractors treated as both vendor and channel: DDQ, COI screen, VDI least-privilege, SAR firewall.",
  },
  {
    id: "david", name: "David", role: "Chief of Product — Build", line: "1st",
    accountable: [
      "Platform / agent build (1st line, outside the MLRO)",
      "Secure VDI (no local download) + SAR firewall + full access logging",
    ],
    ownsAgents: [],
    report: { title: "Build & Platform Report", cadence: "Bi-weekly", asks: [
      "VDI / SAR-firewall delivery status",
      "Agent build & orchestration readiness",
      "Model / LLM control hooks exposed to MRM & Agent Ops",
    ] },
    feeds: [],
    note: "Independence: Product builds; it does not approve dispositions or validate models.",
  },
  {
    id: "walid", name: "Walid", role: "Chief of Compliance — Oversight", line: "2nd",
    accountable: [
      "Independence backstop during the interim",
      "Board MI",
      "Walid / Tayel boundary — reg mgmt, board MI, config approval",
    ],
    ownsAgents: [],
    report: { title: "Compliance Oversight & Board MI", cadence: "Monthly / board", asks: [
      "Independence-boundary adherence",
      "Board MI pack",
      "Escalations arising from the interim arrangement",
    ] },
    feeds: [],
  },
  {
    id: "mrm", name: "MRM / Validator", role: "Independent Model Validation", line: "2nd", independent: true,
    accountable: [
      "Independent validation of CRAM, agents & every Mohsen fine-tune",
      "MRM validation gate on EVERY fine-tune (a fine-tune is a model change — SR 11-7)",
      "Model inventory + vendor-model non-reliance · monthly model-risk review",
    ],
    ownsAgents: [],
    report: { title: "Model Risk & Validation Report", cadence: "Monthly + per fine-tune", asks: [
      "Validation sign-offs issued / blocked",
      "Drift & performance vs baseline (Sayed / Mohsen / Jana / CRAM)",
      "Vendor-model non-reliance status",
      "Fine-tune gate queue",
    ] },
    feeds: [{ agentId: "mohsen", signal: "VALIDATION GATE — no fine-tune ships without independent sign-off" }],
    note: "Independent of build AND the MLRO — never folded in. The referee.",
  },
  {
    id: "aiops", name: "AI Agent Ops", role: "Agent tuning & fine-tune pipeline", line: "1st",
    accountable: [
      "Agent tuning, thresholds, fine-tune pipeline ops",
      "LLM controls: prompt / version control, drift & hallucination monitoring",
      "Slack channel config (onboarding / sanctions / SAR / RFI)",
    ],
    ownsAgents: [],
    report: { title: "Agent Ops Report", cadence: "Weekly", asks: [
      "Pipeline runs & post-deploy monitoring",
      "Drift / hallucination alerts",
      "Prompt / version-control changelog",
      "Threshold-change requests (routed to the MRM gate)",
    ] },
    feeds: [{ agentId: "all", signal: "Runs the fine-tune pipeline for Sayed / Mohsen / Jana — under the MRM gate" }],
  },
  {
    id: "qa", name: "QA (MLRO interim)", role: "Quality Assurance", line: "2nd", interim: true,
    accountable: [
      "QA sampling + calibration cadence · golden-set build & contamination checks",
      "End-to-end trace tests · automation-bias monitoring",
      "Retention / legal-hold for agent AND contractor decision logs",
    ],
    ownsAgents: [],
    report: { title: "QA & Automation-Bias Report", cadence: "Weekly", asks: [
      "QA sample pass rate",
      "Automation-bias override rates — agents AND pool",
      "Trace-test evidence (alert → filing, no gaps)",
      "Golden-set integrity",
    ] },
    feeds: [{ agentId: "all", signal: "QA findings → calibration & golden-set corrections" }],
    note: "Interim under the MLRO — insert a thin junior/contract reviewer; sunsets with the governance clock.",
  },
  {
    id: "legal", name: "Legal / Privacy", role: "Cross-border data & contracts", line: "Support",
    accountable: [
      "Cross-border PII / GLBA / localization legal sign-off (P0 — potential showstopper)",
      "Contractor contracts with AML flow-downs, audit-rights, termination triggers",
    ],
    ownsAgents: [],
    report: { title: "Legal / Privacy Clearance", cadence: "Milestone", asks: [
      "Cross-border PII opinion status (go-live blocker)",
      "Contract flow-down completeness",
      "Data-transfer / localization posture",
    ] },
    feeds: [],
  },
  {
    id: "advisory", name: "Advisory & Reg Change", role: "Training & regulatory change", line: "Support",
    accountable: [
      "Corridor-typology training curriculum (laundering cycle, MSB/TBML/structuring, red flags, fraud models)",
      "Reg-change monitoring across corridors",
    ],
    ownsAgents: [],
    report: { title: "Training & Reg-Change Report", cadence: "Monthly", asks: [
      "Curriculum & per-corridor module status",
      "Certification pass rates",
      "Reg-change items impacting the corridors",
    ] },
    feeds: [],
  },
  {
    id: "audit", name: "Internal Audit", role: "3rd line — Independent", line: "3rd", independent: true,
    accountable: [
      "Independent testing / audit dry-run vs the framework",
      "Reports directly to the Board — this line never moves",
    ],
    ownsAgents: [],
    report: { title: "Independent Audit (to Board)", cadence: "Per engagement", asks: [
      "Dry-run findings vs the framework",
      "Critical-gap list",
      "Independence attestation",
    ] },
    feeds: [],
    note: "The one line that must NOT move in the interim. Never folded into the MLRO.",
  },
];

export const EXEC_TASKS: ExecTask[] = [
  { id: "T01", phase: "0", priority: "P0", ownerId: "tayel", task: "Resolve validator independence: name ONE independent validator; remove the David/Walid overlap", tool: "Notion", acceptance: "Independent validator documented; no build/approve conflict; board-noted", control: "GOV-2, GOV-3, AUD-1", timeline: "Wk 0-2" },
  { id: "T02", phase: "0", priority: "P0", ownerId: "tayel", task: "Preserve independent internal audit (3rd line) fully separate from the MLRO — this line must not move", tool: "Notion", acceptance: "Audit independence documented & board-noted", control: "AUD-1", timeline: "Wk 0-2" },
  { id: "T03", phase: "0", priority: "P0", ownerId: "tayel", task: "Name the accountable FIU owner OR formally document Tayel as interim owner of dispositions", tool: "Recruitment / HR", acceptance: "Accountable owner named / documented", control: "EDD-1", timeline: "Wk 0-4" },
  { id: "T04", phase: "0", priority: "P0", ownerId: "tayel", task: "Document the interim MLRO 2LOD+QA arrangement WITH a hard sunset trigger + compensating controls", tool: "Notion", acceptance: "Interim + sunset date + compensating controls written & board-noted", control: "GOV-2, GOV-3", timeline: "Wk 0-3" },
  { id: "T05", phase: "0", priority: "P0", ownerId: "legal", task: "Legal sign-off on cross-border PII: US-customer data accessed by PK/EG/BD/DE contractors", tool: "Legal / Privacy", acceptance: "Written legal opinion on data-transfer / GLBA / localization", control: "REC-1", timeline: "Wk 0-4" },
  { id: "T06", phase: "0", priority: "P0", ownerId: "tayel", task: "Design the SAR firewall + least-privilege access model for the pool", tool: "VDI / Secure Access", acceptance: "Design approved; SAR content walled off from pool", control: "SAR-2", timeline: "Wk 1-4" },
  { id: "T07", phase: "0", priority: "P0", ownerId: "tayel", task: "Lead the independence conversation with David (frame as protection, not distrust)", tool: "Meeting / Comms", acceptance: "Alignment reached; Product bought in", control: "—", timeline: "Wk 0-2" },
  { id: "T08", phase: "0", priority: "P0", ownerId: "walid", task: "Agree & document the Walid/Tayel boundary (reg mgmt, board MI, config approval)", tool: "Notion", acceptance: "Written boundary signed by both", control: "GOV-1, GOV-2", timeline: "Wk 1-3" },
  { id: "T09", phase: "0", priority: "P1", ownerId: "tayel", task: "Circulate a one-page 'why' to Walid, David and the team; over-communicate the model", tool: "Slack", acceptance: "One-pager circulated & reinforced", control: "—", timeline: "Wk 0-4" },
  { id: "T10", phase: "1", priority: "P0", ownerId: "tayel", task: "Contractor due diligence: vetting, background + conflict-of-interest screening framework", tool: "Contract / DDQ", acceptance: "DDQ + COI screen run per contractor", control: "TPO-1, TPO-3", timeline: "Wk 3-7" },
  { id: "T11", phase: "1", priority: "P0", ownerId: "legal", task: "Contractor contracts: confidentiality, data-protection, audit-rights, AML flow-downs, termination triggers", tool: "Contract / DDQ", acceptance: "Signed contracts with all flow-downs", control: "TPO-2", timeline: "Wk 3-8" },
  { id: "T12", phase: "1", priority: "P0", ownerId: "david", task: "Stand up secure VDI (no local download) with SAR firewall + full access logging", tool: "VDI / Secure Access", acceptance: "VDI live; no downloads; access logged; SAR walled", control: "SAR-2, REC-1", timeline: "Wk 4-9" },
  { id: "T13", phase: "1", priority: "P1", ownerId: "fiu", task: "Risk-tier contractors; ongoing conduct & performance monitoring", tool: "Contract / DDQ", acceptance: "Tier assigned; monitoring cadence live", control: "TPO-3", timeline: "Wk 5-9" },
  { id: "T14", phase: "1", priority: "P1", ownerId: "advisory", task: "Corridor-typology training curriculum (laundering cycle, MSB/remittance/TBML/structuring, red flags, fraud models) + corridor modules", tool: "Notion", acceptance: "Curriculum built incl. per-corridor module", control: "TRN-1", timeline: "Wk 3-8" },
  { id: "T15", phase: "1", priority: "P1", ownerId: "fiu", task: "Certification gate: no pool member touches a live case before certified", tool: "Notion", acceptance: "Certification recorded per member", control: "TRN-1", timeline: "Wk 6-10" },
  { id: "T16", phase: "1", priority: "P1", ownerId: "fiu", task: "Standard investigation playbook + Mohsen annotation standard", tool: "Notion", acceptance: "Playbook + annotation standard published", control: "—", timeline: "Wk 4-9" },
  { id: "T17", phase: "1", priority: "P1", ownerId: "tayel", task: "Stand up corridor pods (US / PK / EG / BD / DE), remote & contractual", tool: "Recruitment / HR", acceptance: "Pods staffed per corridor", control: "—", timeline: "Wk 3-10" },
  { id: "T18", phase: "1", priority: "P1", ownerId: "mrm", task: "Build the model inventory: Sayed, Mohsen, Jana, CRAM + vendor models", tool: "Notion", acceptance: "Complete inventory + tiers", control: "TPO-2, RA-2", timeline: "Wk 4-8" },
  { id: "T19", phase: "1", priority: "P1", ownerId: "aiops", task: "Define LLM controls: prompt/version control, drift & hallucination monitoring", tool: "Orchestration", acceptance: "Controls live; drift alerts firing", control: "SR 11-7", timeline: "Wk 5-10" },
  { id: "T20", phase: "1", priority: "P1", ownerId: "mrm", task: "Document vendor-model non-reliance (Sumsub, ShuftiPro, Oscilar, Vital4)", tool: "Notion", acceptance: "Non-reliance statement + vendor validation", control: "TPO-2", timeline: "Wk 5-9" },
  { id: "T21", phase: "1", priority: "P1", ownerId: "qa", task: "Build Notion system-of-record: golden set, rulebooks, model cards, org chart", tool: "Notion", acceptance: "All governance artifacts housed", control: "—", timeline: "Wk 3-10" },
  { id: "T22", phase: "2", priority: "P0", ownerId: "jason", task: "Move SAR content OUT of Slack; restrict #aml-sar-approvals to need-to-know", tool: "Slack", acceptance: "Channel restricted; no SAR content in Slack", control: "SAR-2", timeline: "Wk 8-10" },
  { id: "T23", phase: "2", priority: "P0", ownerId: "jason", task: "SAR approval write-back to the case system with immutable, timestamped provenance", tool: "Case Mgmt System", acceptance: "Every approval logged in case system", control: "SAR-3, TM-4", timeline: "Wk 8-12" },
  { id: "T24", phase: "2", priority: "P0", ownerId: "dinesh", task: "Confirm fail-closed pre-funding sanctions/PEP gate across the BaaS rails", tool: "Sumsub", acceptance: "Screening blocks pre-funding; fails closed", control: "TM-2, DOB-2", timeline: "Wk 8-12" },
  { id: "T25", phase: "2", priority: "P0", ownerId: "mrm", task: "MRM validation gate on EVERY Mohsen fine-tune (a fine-tune is a model change)", tool: "Mohsen (fine-tune)", acceptance: "No fine-tune ships without independent sign-off", control: "SR 11-7", timeline: "Wk 10-16" },
  { id: "T26", phase: "2", priority: "P1", ownerId: "fiu", task: "Mohsen loop: annotation → senior calibration → inter-rater agreement checks", tool: "Mohsen (fine-tune)", acceptance: "Calibration + inter-rater metric per batch", control: "—", timeline: "Wk 9-14" },
  { id: "T27", phase: "2", priority: "P1", ownerId: "qa", task: "Build the golden set for Mohsen investigations", tool: "Notion", acceptance: "Golden set live; contamination-checked", control: "—", timeline: "Wk 9-13" },
  { id: "T28", phase: "2", priority: "P1", ownerId: "aiops", task: "Fine-tune pipeline ops + production monitoring", tool: "Orchestration", acceptance: "Pipeline runs; post-deploy monitoring live", control: "SR 11-7", timeline: "Wk 11-16" },
  { id: "T29", phase: "2", priority: "P1", ownerId: "dinesh", task: "Pre-request SoF/SoW at onboarding for EDD-likely customers (cut corridor RFI waits)", tool: "Sayed", acceptance: "Pre-request rule live", control: "EDD-2", timeline: "Wk 8-14" },
  { id: "T30", phase: "2", priority: "P1", ownerId: "terani", task: "Stand up blocking/rejection reporting, OFAC 50%-rule, ~10-day reporting", tool: "Vital4", acceptance: "Workflow live; owner named; SLA set", control: "SANC-3", timeline: "Wk 9-14" },
  { id: "T31", phase: "2", priority: "P1", ownerId: "terani", task: "List-update SLA + batch re-screening", tool: "Vital4", acceptance: "SLA documented; batch re-screen runs", control: "SANC-2", timeline: "Wk 9-13" },
  { id: "T32", phase: "2", priority: "P1", ownerId: "qa", task: "End-to-end trace test: one SAR + one sanctions hit, alert to filing, no gaps", tool: "Case Mgmt System", acceptance: "Two clean traces evidenced", control: "TM-4", timeline: "Wk 13-16" },
  { id: "T33", phase: "2", priority: "P1", ownerId: "aiops", task: "Configure Slack channels (onboarding/sanctions/SAR/RFI) with access control", tool: "Slack", acceptance: "4 channels live, routed, access-controlled", control: "—", timeline: "Wk 4-8" },
  { id: "T34", phase: "2", priority: "P1", ownerId: "jason", task: "Jana RFI automation: trigger #aml-rfi-chasing on SLA breach / doc receipt", tool: "Jana", acceptance: "Auto-updates firing", control: "—", timeline: "Wk 6-10" },
  { id: "T35", phase: "3", priority: "P1", ownerId: "qa", task: "Automation-bias monitoring: override rates on agents AND pool recommendations", tool: "Model-Risk Dashboard", acceptance: "Override metric live; high agreement flagged", control: "—", timeline: "Wk 14-18" },
  { id: "T36", phase: "3", priority: "P1", ownerId: "qa", task: "Ongoing pool calibration + QA sampling cadence", tool: "Notion", acceptance: "Sampling running; calibration logged", control: "—", timeline: "Wk 14-ongoing" },
  { id: "T37", phase: "3", priority: "P1", ownerId: "tayel", task: "Board-approved AI + outsourcing risk appetite", tool: "Notion", acceptance: "Board approval minuted", control: "GOV-1", timeline: "Wk 14-22" },
  { id: "T38", phase: "3", priority: "P2", ownerId: "qa", task: "Retention schedule + legal hold for agent AND contractor decision logs", tool: "Case Mgmt System", acceptance: "Schedule set; legal hold tested", control: "REC-1, REC-2", timeline: "Wk 16-20" },
  { id: "T39", phase: "3", priority: "P2", ownerId: "fiu", task: "314(a) handling workflow", tool: "Case Mgmt System", acceptance: "Workflow documented + tested", control: "SAR-4", timeline: "Wk 16-20" },
  { id: "T40", phase: "4", priority: "P0", ownerId: "tayel", task: "EXECUTE THE GOVERNANCE SUNSET: stand up an independent QA / 2LOD function separate from the MLRO", tool: "Recruitment / HR", acceptance: "Independent QA/2LOD live; MLRO exits QA role", control: "GOV-3, AUD-1", timeline: "Wk 20-26" },
  { id: "T41", phase: "4", priority: "P1", ownerId: "audit", task: "Independent testing / audit dry-run vs the framework", tool: "Notion", acceptance: "Dry-run report produced", control: "AUD-1, AUD-2", timeline: "Wk 20-24" },
  { id: "T42", phase: "4", priority: "P1", ownerId: "tayel", task: "Close critical gaps found in the dry-run", tool: "Notion", acceptance: "Zero unresolved critical gaps", control: "AUD-3", timeline: "Wk 22-26" },
  { id: "T43", phase: "4", priority: "P1", ownerId: "jason", task: "Assemble & cold-walk the exam pack", tool: "Jana", acceptance: "Exam pack walked end-to-end", control: "—", timeline: "Wk 22-28" },
  { id: "T44", phase: "Ongoing", priority: "Ongoing", ownerId: "fiu", task: "Weekly ops review: utilisation, cycle time by corridor/scenario, SLA breaches", tool: "Model-Risk Dashboard", acceptance: "Weekly review running", control: "ESC-1", timeline: "Ongoing" },
  { id: "T45", phase: "Ongoing", priority: "Ongoing", ownerId: "mrm", task: "Monthly model-risk & QA review", tool: "Notion", acceptance: "Monthly review minuted", control: "AUD-3", timeline: "Ongoing" },
  { id: "T46", phase: "Ongoing", priority: "Ongoing", ownerId: "jason", task: "After-action debrief on every filed SAR and every SLA miss", tool: "Notion", acceptance: "Debrief logged each event", control: "—", timeline: "Ongoing" },
];

export function tasksForOwner(ownerId: string): ExecTask[] {
  return EXEC_TASKS.filter((t) => t.ownerId === ownerId);
}

export function personById(id: string): Person | undefined {
  return EXEC_PEOPLE.find((p) => p.id === id);
}
