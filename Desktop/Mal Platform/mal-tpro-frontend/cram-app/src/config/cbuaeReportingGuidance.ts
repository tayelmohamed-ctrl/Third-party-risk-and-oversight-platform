/**
 * CBUAE STR/SAR reporting guidance — machine-readable summary.
 * Sources:
 * - Guidance for Licensed Financial Institutions on Suspicious Transaction Reporting
 *   (CBUAE Notice 3354/2022, 16 Aug 2022)
 * - Suspicious Activity and Transaction Reporting Thematic Review (Jan 2023)
 */
export const CBUAE_STR_GUIDANCE = {
  notice: "CBUAE Notice 3354/2022",
  thematicReview: "Supervisory Authority Thematic Review — STR Framework (Jan 2023)",
  legalBasis: [
    "Federal Decree-Law No. (20) of 2018 AML-CFT Law (as amended)",
    "Cabinet Decision No. (10) of 2019 AML-CFT Decision",
    "Cabinet Decision No. (74) of 2020 Terrorism Lists",
  ],
  filingSystem: "goAML",
  noMinimumThreshold: true,
  attemptedTransactionsMustBeReported: true,
} as const;

/** Primary and supplementary goAML report types (Guidance §3.2). */
export const GOAML_REPORT_TYPES = [
  { code: "STR", label: "Suspicious Transaction Report", use: "Suspicious transactions related to ML/TF/illegal orgs" },
  { code: "SAR", label: "Suspicious Activity Report", use: "Non-transaction suspicion OR attempted/non-executed transactions" },
  { code: "AIF", label: "Additional Information File (no transactions)", use: "Supplement to prior STR/SAR when FIU requests via Message Board" },
  { code: "AIFT", label: "Additional Information File (with transactions)", use: "Supplement with transactional detail" },
  { code: "RFI", label: "Request for Information (no transactions)", use: "FIU broadcast RFI to multiple LFIs" },
  { code: "RFIT", label: "Request for Information (with transactions)", use: "FIU RFI including transactions" },
  { code: "HRC", label: "High Risk Country Transaction Report", use: "Transactions linked to NAMLCFTC high-risk countries" },
  { code: "HRCA", label: "High Risk Country Activity Report", use: "Activities linked to high-risk countries" },
] as const;

/** Filing timelines (Guidance §4.6–4.7; Thematic Review §2.5). */
export const STR_FILING_SLA = {
  standardBusinessDaysFromAlert: 35,
  expeditedHoursFromDecision: 24,
  complexInitialBusinessDays: 15,
  complexFollowUpBusinessDays: 30,
  recordRetentionYears: 5,
} as const;

/** Investigative narrative must answer (Guidance §3.3). */
export const NARRATIVE_FRAMEWORK = ["Who", "What", "When", "Where", "Why", "How (modus operandi)"] as const;

/** goAML Report Cover mandatory fields (Guidance §3.4). */
export const GOAML_MANDATORY_COVER = [
  "Report Type",
  "Description/Summary of Report",
  "Reason for Reporting (RFR)",
  "Action Taken by Reporting Entity",
  "Location of Incident (STR/SAR)",
  "MLRO details (registration)",
] as const;

/** Post-STR immediate actions (Guidance §6.2; Thematic Review §2.6). */
export const POST_STR_ACTIONS = [
  "Follow FIU instructions if issued",
  "Identify all related/associated accounts and relationships",
  "Reclassify customer as high-risk immediately",
  "Implement risk-based EDD and enhanced monitoring",
  "Add subject to internal watchlist if retaining or exiting",
  "Document retain vs exit rationale with senior management approval",
  "No tipping-off",
] as const;

/** Insufficient narrative pitfalls (Annex 1). */
export const INSUFFICIENT_NARRATIVE_CHECKS = [
  "Subject identifying details complete (name, occupation, address, IDs, accounts)",
  "Specific transaction dates and amounts — not aggregates only",
  "Counterparty names, banks, account numbers, jurisdictions",
  "Why activity is suspicious for this customer (expected vs observed)",
  "Relationship between parties explained",
  "Red flags / TM rule or scenario cited",
  "Not a defensive filing without genuine suspicion",
] as const;
