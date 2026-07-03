/**
 * Record retention & evidence export policy — CBUAE §4.6 · FinCEN 31 CFR 1010.430 · Mal policy.
 * Records are never hard-deleted; scheduler marks eligibility for archive/export only.
 */

export type RecordClass =
  | "cram_assessment"
  | "filing_draft"
  | "filing_submission"
  | "investigation_case"
  | "case_evidence"
  | "ctr_obligation"
  | "screening_case"
  | "training_record"
  | "audit_log"
  | "exam_pack";

export type RetentionDisposition = "active" | "approaching_expiry" | "eligible_archive" | "on_hold";

export interface RetentionClassPolicy {
  class: RecordClass;
  label: string;
  retentionYears: number;
  /** Anchor date field semantics */
  anchor: "created" | "submitted" | "filed" | "disposed" | "completed";
  policyRef: string;
  jurisdictions: ("UAE" | "US" | "GROUP")[];
  /** Immutable — no purge even after retention period */
  immutable: boolean;
}

export const RETENTION_CLASS_POLICIES: RetentionClassPolicy[] = [
  {
    class: "filing_submission",
    label: "STR/SAR/CTR FIU submission receipts",
    retentionYears: 5,
    anchor: "submitted",
    policyRef: "CBUAE Notice 3354/2022 §4.6 · FinCEN 31 CFR 1010.430",
    jurisdictions: ["UAE", "US"],
    immutable: true,
  },
  {
    class: "filing_draft",
    label: "STR/SAR/CTR draft filings (incl. withdrawn)",
    retentionYears: 5,
    anchor: "created",
    policyRef: "CBUAE §4.6 · Mal Records Management Policy §7",
    jurisdictions: ["UAE", "US", "GROUP"],
    immutable: true,
  },
  {
    class: "ctr_obligation",
    label: "CTR obligation register (Form 104)",
    retentionYears: 5,
    anchor: "filed",
    policyRef: "31 CFR 1010.311 · 31 CFR 1010.430",
    jurisdictions: ["US"],
    immutable: true,
  },
  {
    class: "investigation_case",
    label: "Investigation cases & dispositions",
    retentionYears: 5,
    anchor: "disposed",
    policyRef: "CBUAE §4.6 · FFIEC BSA/AML Manual · Recordkeeping",
    jurisdictions: ["UAE", "US", "GROUP"],
    immutable: true,
  },
  {
    class: "case_evidence",
    label: "Investigation evidence attachments",
    retentionYears: 5,
    anchor: "created",
    policyRef: "CBUAE §4.6 · Mal Investigation SOP",
    jurisdictions: ["UAE", "US", "GROUP"],
    immutable: true,
  },
  {
    class: "cram_assessment",
    label: "CRAM risk assessments (immutable scored records)",
    retentionYears: 5,
    anchor: "created",
    policyRef: "BRD NFR-003 · CBUAE AML Rulebook",
    jurisdictions: ["UAE", "US", "GROUP"],
    immutable: true,
  },
  {
    class: "screening_case",
    label: "Screening disposition records",
    retentionYears: 5,
    anchor: "created",
    policyRef: "CBUAE §4.6 · OFAC recordkeeping",
    jurisdictions: ["UAE", "US", "GROUP"],
    immutable: true,
  },
  {
    class: "training_record",
    label: "AML training completion register",
    retentionYears: 5,
    anchor: "completed",
    policyRef: "FFIEC BSA/AML Manual · Training · CBUAE HR policy",
    jurisdictions: ["GROUP"],
    immutable: true,
  },
  {
    class: "audit_log",
    label: "Append-only audit trail",
    retentionYears: 7,
    anchor: "created",
    policyRef: "Mal Audit Policy · SR 11-7 evidence retention",
    jurisdictions: ["GROUP"],
    immutable: true,
  },
  {
    class: "exam_pack",
    label: "CBUAE examination pack runs",
    retentionYears: 7,
    anchor: "created",
    policyRef: "CBUAE examination readiness · RPT-008",
    jurisdictions: ["UAE", "GROUP"],
    immutable: true,
  },
];

export type ExportCapability = "review" | "read_audit" | "approve_high";

export interface ExportPolicy {
  id: string;
  label: string;
  recordClasses: RecordClass[];
  requiredCapability: ExportCapability;
  mlroApprovalRequired: boolean;
  legalHoldCheck: boolean;
  maxRecords: number;
  policyRef: string;
  description: string;
}

/** Governed export policies — all exports are manifest-only (no silent bulk download). */
export const EVIDENCE_EXPORT_POLICIES: ExportPolicy[] = [
  {
    id: "EXP-CUSTOMER-PACK",
    label: "Customer evidence pack",
    recordClasses: [
      "cram_assessment",
      "filing_draft",
      "filing_submission",
      "investigation_case",
      "case_evidence",
      "ctr_obligation",
      "screening_case",
    ],
    requiredCapability: "approve_high",
    mlroApprovalRequired: true,
    legalHoldCheck: true,
    maxRecords: 500,
    policyRef: "Mal Evidence Export Policy §3.1 · MLRO-only",
    description: "Full customer AML evidence bundle for exam / legal request",
  },
  {
    id: "EXP-FILING-RECEIPTS",
    label: "Regulatory filing receipts",
    recordClasses: ["filing_submission", "filing_draft", "ctr_obligation"],
    requiredCapability: "review",
    mlroApprovalRequired: false,
    legalHoldCheck: true,
    maxRecords: 200,
    policyRef: "Mal Evidence Export Policy §3.2",
    description: "STR/SAR/CTR drafts and FIU submission receipts",
  },
  {
    id: "EXP-CASE-EVIDENCE",
    label: "Investigation case pack",
    recordClasses: ["investigation_case", "case_evidence"],
    requiredCapability: "review",
    mlroApprovalRequired: false,
    legalHoldCheck: true,
    maxRecords: 100,
    policyRef: "Mal Evidence Export Policy §3.3",
    description: "Single-case evidence for internal review or counsel",
  },
  {
    id: "EXP-AUDIT-SLICE",
    label: "Audit log extract",
    recordClasses: ["audit_log"],
    requiredCapability: "read_audit",
    mlroApprovalRequired: false,
    legalHoldCheck: false,
    maxRecords: 5000,
    policyRef: "Mal Audit Policy · read_audit capability",
    description: "Time-bounded audit trail extract for compliance / audit",
  },
  {
    id: "EXP-EXAM-PACK",
    label: "Examination pack manifest",
    recordClasses: ["exam_pack", "cram_assessment"],
    requiredCapability: "approve_high",
    mlroApprovalRequired: false,
    legalHoldCheck: false,
    maxRecords: 50,
    policyRef: "RPT-008 · CBUAE examination export",
    description: "Exam pack run metadata linked to CRAM sample",
  },
];

export const RETENTION_APPROACHING_DAYS = 90;

export const RETENTION_SCHEDULER_CRON = "0 4 * * *";

export function policyForClass(recordClass: RecordClass): RetentionClassPolicy | undefined {
  return RETENTION_CLASS_POLICIES.find((p) => p.class === recordClass);
}

export function exportPolicyById(id: string): ExportPolicy | undefined {
  return EVIDENCE_EXPORT_POLICIES.find((p) => p.id === id);
}

export function retentionUntil(anchorDate: Date, years: number): Date {
  const d = new Date(anchorDate);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

export function computeDisposition(
  retentionEnd: Date,
  onHold: boolean,
  asOf: Date = new Date(),
): RetentionDisposition {
  if (onHold) return "on_hold";
  const msLeft = retentionEnd.getTime() - asOf.getTime();
  if (msLeft <= 0) return "eligible_archive";
  if (msLeft <= RETENTION_APPROACHING_DAYS * 24 * 60 * 60 * 1000) return "approaching_expiry";
  return "active";
}
