/**
 * TM System Implementation BRD — business rules for alerts, screening, investigation.
 * Source: TM_System_BRD_Mal Bank_Implementation.docx (2026-06-22).
 */
import brdExtract from "../data/tm_implementation_brd_extract.json";

export interface GoLiveGate {
  id: string;
  name: string;
  requirement: string;
  approver: string;
}

export interface BrdRequirement {
  id: string;
  category: string;
  description: string;
  testRef?: string;
  oscilarRuleIds?: string[];
}

export interface InvestigationRule {
  id: string;
  title: string;
  requirement: string;
  mohsenStep?: number;
  policyRef: string;
}

export interface ScreeningRule {
  id: string;
  title: string;
  requirement: string;
  authority: "Oscilar" | "Vital4" | "Both";
  policyRef: string;
}

export interface AlertRule {
  id: string;
  title: string;
  requirement: string;
  severity?: string;
  policyRef: string;
}

export const TM_BRD_META = {
  version: brdExtract.version,
  date: brdExtract.date,
  title: brdExtract.title,
  owner: "Compliance Department / MLRO",
} as const;

export const TM_GO_LIVE_GATES: GoLiveGate[] = [
  { id: "GATE-1", name: "Design and regulatory alignment approval", requirement: "All mapped mandatory requirements met, evidenced, validated, and approved or formally risk-accepted.", approver: "MLRO + Compliance" },
  { id: "GATE-2", name: "Data integration and reconciliation approval", requirement: "Customer, account, and transaction feeds integrated, reconciled, and signed off by Data Owner / IT.", approver: "Data Owner / IT" },
  { id: "GATE-3", name: "Scenario, rule, and threshold configuration approval", requirement: "Critical scenarios configured, maker-checker approved, thresholds documented with rationale.", approver: "MLRO / Compliance" },
  { id: "GATE-4", name: "Alert and case workflow approval", requirement: "Alert generation, assignment, escalation, and closure workflows tested end-to-end.", approver: "Compliance Operations" },
  { id: "GATE-5", name: "UAT and parallel run approval", requirement: "UAT scenarios passed; parallel/back-testing completed with documented results.", approver: "Compliance + IT" },
  { id: "GATE-6", name: "Operational readiness approval", requirement: "Roles, training, BCP/manual workaround, MI dashboards, and hypercare plan approved.", approver: "MLRO + Senior Management" },
  { id: "GATE-7", name: "Final senior management go-live approval", requirement: "No open critical gaps; hypercare resourced; go-live decision recorded.", approver: "Senior Management / Sponsor" },
];

export const TM_FUNCTIONAL_REQUIREMENTS: BrdRequirement[] = [
  { id: "FR-001", category: "Scenario configuration", description: "Configure AML/CFT/CPF scenarios mapped to typologies with version control and maker-checker approval." },
  { id: "FR-002", category: "Rule engine", description: "Support configurable rules with aggregation, velocity, and relationship-level logic." },
  { id: "FR-003", category: "Threshold management", description: "Risk-based thresholds by segment, product, channel, and geography with MLRO approval for changes." },
  { id: "FR-004", category: "Customer segmentation", description: "Apply monitoring by CRA rating, PEP, non-resident, cash-intensive, and high-risk typologies." },
  { id: "FR-005", category: "Transaction ingestion", description: "Ingest complete transaction narratives from core banking, payments, cards, and digital channels." },
  { id: "FR-006", category: "Processing mode", description: "Support batch, near-real-time, and real-time monitoring per product/channel risk." },
  { id: "FR-007", category: "Alert generation", description: "Generate alerts with de-duplication, prioritisation, assignment, and full audit trail.", oscilarRuleIds: ["OS-TM-001", "OS-TM-003", "OS-TM-012"] },
  { id: "FR-008", category: "Alert workflow", description: "Route alerts through investigator queue with SLA tracking and escalation paths." },
  { id: "FR-009", category: "Case management", description: "Support investigation cases, evidence upload, notes, and disposition with authority matrix." },
  { id: "FR-010", category: "STR/SAR decisioning", description: "Escalate suspicious activity to MLRO with STR/SAR workflow and post-STR monitoring." },
  { id: "FR-011", category: "MI dashboards", description: "Provide alert volumes, ageing, false-positive rates, and scenario performance MI." },
  { id: "FR-012", category: "User management", description: "Role-based access with segregation of duties for config vs investigation vs approval." },
  { id: "FR-013", category: "Audit logging", description: "Immutable audit log for configuration, threshold, alert, and case actions." },
  { id: "FR-014", category: "Search and export", description: "Search/filter/export alerts and cases for QA and regulatory inspection." },
  { id: "FR-015", category: "Configuration management", description: "Environment promotion, change control, and rollback for TM configuration." },
];

export const TM_ALERT_BUSINESS_RULES: AlertRule[] = [
  { id: "ALR-001", title: "Alert prioritisation by risk", requirement: "Prioritise alerts using CRA rating, scenario severity, transaction value, and corridor risk.", severity: "All", policyRef: "TM Policy §1.5 · BRD §I" },
  { id: "ALR-002", title: "De-duplication and aggregation", requirement: "Aggregate related alerts; suppress only where formally configured, approved, and auditable.", policyRef: "BRD Alert Generation §I" },
  { id: "ALR-003", title: "Mandatory scenario coverage", requirement: "Low-risk classification must not suppress mandatory monitoring scenarios (PEP, sanctions, high-risk geography).", policyRef: "BRD §F · OVR-010" },
  { id: "ALR-004", title: "Alert-to-case linkage", requirement: "Every escalated alert links to investigation case with source data snapshot and rule ID.", policyRef: "Oscilar → Mohsen pipeline" },
  { id: "ALR-005", title: "SLA and escalation", requirement: "Critical/high alerts escalate to Mohsen within SLA; breach triggers MLRO notification.", severity: "critical/high", policyRef: "TXN_SCREENING_CASE_MGMT" },
  { id: "ALR-006", title: "TM → CRAM re-rating", requirement: "Closed TM alerts with disposition feed CRAM behaviour gate and may trigger re-rating.", policyRef: "partnerIntegration · behaviourGate" },
];

export const TM_SCREENING_BUSINESS_RULES: ScreeningRule[] = [
  { id: "SCR-001", title: "Real-time payment screening", requirement: "Screen every payment before settlement — domestic, cross-border, card, and merchant flows.", authority: "Oscilar", policyRef: "TXN_SCREENING_PROGRAMME · scope" },
  { id: "SCR-002", title: "Vital4 disposition authority", requirement: "List hits mirror to Vital4; Oscilar never auto-clears sanctions/PEP true matches.", authority: "Both", policyRef: "SCREENING_AUTHORITY" },
  { id: "SCR-003", title: "Sanctions/TFS transaction blocking", requirement: "Block or hold transactions with sanctions/TFS nexus pending Vital4 disposition.", authority: "Both", policyRef: "BRD §24 · TFS-Sanctions Txn" },
  { id: "SCR-004", title: "Corridor-specific rules", requirement: "Apply corridor rules for UAE, GCC, South Asia, EU, and US BaaS payment paths.", authority: "Oscilar", policyRef: "oscilar_rule_library · corridor" },
  { id: "SCR-005", title: "Screening audit trail", requirement: "Record screening decision, list matched, score, and disposition timestamp per transaction.", authority: "Both", policyRef: "FIELD-AUDIT" },
  { id: "SCR-006", title: "Onboarding screening integration", requirement: "Customer onboarding screening (Vital4) linked to TM customer profile and CRA rating.", authority: "Vital4", policyRef: "onboarding orchestrator · Phase 1a" },
];

export const TM_INVESTIGATION_RULES: InvestigationRule[] = [
  { id: "INV-001", title: "Six-step investigation pipeline", requirement: "Mohsen pipeline: evidence → context → behaviour → explanation → narrative → reasoning trace.", mohsenStep: 0, policyRef: "InvestigationHub · 6 steps" },
  { id: "INV-002", title: "Investigation narrative and evidence", requirement: "Document decision rationale, closure reason, and evidence attachments for every case.", mohsenStep: 4, policyRef: "BRD §K Investigation" },
  { id: "INV-003", title: "No tipping-off controls", requirement: "System prompts restrict tipping-off during open investigations.", mohsenStep: 3, policyRef: "BRD §K" },
  { id: "INV-004", title: "STR/SAR escalation", requirement: "Escalate to Jana/MLRO when suspicion confirmed; link STR draft to case evidence.", mohsenStep: 5, policyRef: "BRD §L · filingGuidance" },
  { id: "INV-005", title: "Investigation count scoring", requirement: "≥3 investigations in 12 months → transaction factor score 3; triggers OVR-010 review.", policyRef: "Transaction Investigation matrix" },
  { id: "INV-006", title: "STR count scoring", requirement: "≥1 STR in 12 months → transaction factor score 3; mandatory MLRO review.", policyRef: "Transaction Investigation matrix" },
  { id: "INV-007", title: "Auto-case from TM alert", requirement: "High/critical TM alerts auto-create Mohsen investigation cases.", policyRef: "server/tm/orchestrator" },
  { id: "INV-008", title: "Behaviour gate uplift", requirement: "Turnover >3× expected or inconsistent profile → behaviour override and transaction uplift.", policyRef: "behaviourGate · BEHAVIOUR_TRIGGERS" },
];

export const TM_BRD_REQUIREMENTS = brdExtract.requirements as BrdRequirement[];
