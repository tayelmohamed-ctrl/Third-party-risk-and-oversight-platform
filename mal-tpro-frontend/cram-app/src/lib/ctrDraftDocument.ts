import { getFiuDestination } from "../config/fiuRegistry";
import { CTR_FILING_SLA } from "../config/fincenCtrGuidance";
import type { FilingDraftDocument, FilingSection, FilingSectionGroup } from "./filingDraftDocument";

export type { FilingDraftDocument };

function section(
  id: string,
  label: string,
  group: FilingSectionGroup,
  value: string,
  opts?: Partial<FilingSection>,
): FilingSection {
  return { id, label, group, value, multiline: opts?.multiline ?? true, ...opts };
}

function fmtUsd(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function buildCtrDocument(input: {
  obligationId: string;
  customerId: string;
  customerName: string;
  transactionDate: string;
  cashIn?: number;
  cashOut?: number;
  aggregateUsd: number;
  accountNumber?: string;
  tin?: string;
  branchLocation?: string;
  channel?: string;
  aggregated?: boolean;
  aggregationNote?: string;
  tmRuleId?: string;
  tmRuleName?: string;
  generatedAt?: string;
}): FilingDraftDocument {
  const fiu = getFiuDestination("US");
  const ref = `CTR-${input.obligationId.slice(-8).toUpperCase()}`;
  const txnDate = input.transactionDate.slice(0, 10);
  const cashIn = input.cashIn ?? 0;
  const cashOut = input.cashOut ?? 0;

  const sections: FilingSection[] = [
    section("reportRef", "Internal CTR reference", "ctr", ref, { required: true }),
    section("txnDate", "Transaction date (Form 104)", "ctr", txnDate, { required: true }),
    section("customerName", "Person / entity conducting transaction", "ctr", input.customerName, { required: true }),
    section("customerId", "Internal customer ID", "ctr", input.customerId),
    section("taxId", "TIN / EIN / SSN (Form 104 Item 22)", "ctr", input.tin ?? "TBD — obtain from CIP record", { required: true }),
    section("cashIn", "Cash in (USD)", "ctr", `$${fmtUsd(cashIn)}`, { required: true }),
    section("cashOut", "Cash out (USD)", "ctr", `$${fmtUsd(cashOut)}`, { required: true }),
    section("aggregateUsd", "Aggregate cash (USD)", "ctr", `$${fmtUsd(input.aggregateUsd)}`, { required: true }),
    section("accountNumber", "Account number", "ctr", input.accountNumber ?? "TBD — account lookup", { required: true }),
    section("branchLocation", "Branch / location of transaction", "ctr", input.branchLocation ?? "Mal US BaaS · Zenus sponsor programme", { required: true }),
    section("channel", "Transaction channel", "ctr", input.channel ?? "cash"),
    section("aggregatedFlag", "Multiple transactions aggregated? (Yes/No)", "ctr", input.aggregated ? "Yes" : "No", { multiline: false }),
    section("aggregationNote", "Aggregation explanation (if multiple txns same business day)", "ctr", input.aggregationNote ?? (input.aggregated ? "TBD — list all transactions in business day" : "Single transaction — no aggregation")),
    section("transactionDetail", "Transaction detail (type, instrument, counterparty if any)", "ctr",
      [
        input.tmRuleName ? `TM rule: ${input.tmRuleName} (${input.tmRuleId ?? "—"})` : "",
        `Cash transaction on ${txnDate} exceeded FinCEN CTR threshold ($${fmtUsd(CTR_FILING_SLA.thresholdUsd)}).`,
        `Channel: ${input.channel ?? "cash"}.`,
      ].filter(Boolean).join("\n"),
    ),
    section("mlroName", "BSA Compliance Officer / MLRO name", "ctr", "Tayel Mohamed", { required: true }),
    section("mlroEmail", "BSA officer email", "ctr", "mlro@mal.ae", { required: true }),
    section("mlroPhone", "BSA officer phone", "ctr", "+971-4-000-0000"),
    section("filingDeadline", "Filing deadline (15 calendar days)", "ctr", `Due within ${CTR_FILING_SLA.deadlineDays} days of ${txnDate} per ${CTR_FILING_SLA.policyRef}`),
  ];

  const renderedText = [
    "MAL FINCRIME OS — CURRENCY TRANSACTION REPORT (CTR) DRAFT",
    "Form: FinCEN 104 · BSA E-File · US BaaS programme",
    `Ref: ${ref} · Customer: ${input.customerName} (${input.customerId})`,
    `Transaction date: ${txnDate} · Aggregate: $${fmtUsd(input.aggregateUsd)}`,
    "",
    ...sections.map((s) => `── ${s.label} ──\n${s.value}`),
    "",
    CTR_FILING_SLA.policyRef,
    "Prepared by Jana · BSA officer review required · Not auto-submitted.",
  ].join("\n");

  return {
    version: 2,
    templateId: "RPT-CTR-US-001",
    reportType: "CTR_US",
    fiu,
    sections,
    renderedText,
    checklist: [
      "Transaction date and amounts complete (Form 104)",
      "TIN/EIN for person conducting transaction",
      "Account number and branch location",
      "Aggregation documented if multiple same-day cash txns",
      `File within ${CTR_FILING_SLA.deadlineDays} calendar days (31 CFR 1010.311)`,
      "Maker-checker before BSA E-File submission",
    ],
    agent: "jana",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    caseNumber: ref,
    defensiveFilingDenied: undefined,
  };
}
