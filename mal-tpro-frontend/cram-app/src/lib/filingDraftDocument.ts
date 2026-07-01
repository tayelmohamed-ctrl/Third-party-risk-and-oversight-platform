import { getFiuDestination, type FiuDestination, type FiuDestinationId } from "../config/fiuRegistry";
import { POST_STR_ACTIONS, STR_FILING_SLA } from "../config/cbuaeReportingGuidance";

export type FilingSectionGroup =
  | "cover"
  | "introduction"
  | "narrative"
  | "transactions"
  | "investigation"
  | "compliance"
  | "mlro"
  | "fincen"
  | "ctr";

export interface FilingSection {
  id: string;
  label: string;
  group: FilingSectionGroup;
  value: string;
  required?: boolean;
  multiline?: boolean;
  guidance?: string;
  placeholder?: string;
  reportTypes?: FilingReportType[];
  fiuIds?: FiuDestinationId[];
}

export type FilingReportType = "STR" | "SAR" | "SAR_US" | "CTR_US";

export interface FilingDraftDocument {
  version: 2;
  templateId: string;
  reportType: FilingReportType;
  fiu: FiuDestination;
  sections: FilingSection[];
  renderedText: string;
  checklist?: string[];
  agent: "jana";
  generatedAt: string;
  lastEditedAt?: string;
  caseNumber?: string;
  dispositionNotes?: string;
  complexInvestigation?: boolean;
  expeditedFiling?: boolean;
  defensiveFilingDenied?: boolean;
}

export interface LegacyFilingDraftBody {
  templateId: string;
  renderedText: string;
  placeholders?: Record<string, string>;
  checklist?: string[];
  agent: "jana";
  generatedAt: string;
  caseNumber?: string;
  dispositionNotes?: string;
  version?: number;
}

export const SECTION_GROUP_LABELS: Record<FilingSectionGroup, string> = {
  cover: "Report cover · goAML mandatory fields (CBUAE §3.4)",
  introduction: "Introduction · purpose, red flags, prior reports (CBUAE §3.2)",
  narrative: "Body · Who / What / When / Where / Why / How (CBUAE §3.3 · FFIEC App L)",
  transactions: "Transactions · chronological schedule & counterparties (Annex 1)",
  investigation: "Investigation · alert, TM rule, disposition (Thematic Review §2.5)",
  compliance: "Conclusion · SLA · post-STR · retain/exit (CBUAE §6.2)",
  mlro: "MLRO · maker-checker · no tipping-off (CBUAE §5)",
  fincen: "FinCEN · Part IV · supporting docs (FFIEC App L)",
  ctr: "FinCEN Form 104 · Currency Transaction Report (31 CFR 1010.311)",
};

export function reportTypeForFiu(fiuId: FiuDestinationId, hasExecutedTxn: boolean): FilingReportType {
  if (fiuId === "US") return "SAR_US";
  return hasExecutedTxn ? "STR" : "SAR";
}

export function templateIdForReport(reportType: FilingReportType): string {
  if (reportType === "SAR_US") return "RPT-SAR-US-001";
  if (reportType === "SAR") return "RPT-SAR-UAE-001";
  return "RPT-STR-UAE-001";
}

export function filingTypeForReport(reportType: FilingReportType): "str_uae" | "sar_uae" | "sar_us" | "ctr_us" {
  if (reportType === "CTR_US") return "ctr_us";
  if (reportType === "SAR_US") return "sar_us";
  if (reportType === "SAR") return "sar_uae";
  return "str_uae";
}

function section(
  id: string,
  label: string,
  group: FilingSectionGroup,
  value: string,
  opts?: Partial<FilingSection>,
): FilingSection {
  return { id, label, group, value, multiline: true, ...opts };
}

function filterSections(sections: FilingSection[], reportType: FilingReportType, fiuId: FiuDestinationId): FilingSection[] {
  return sections.filter((s) => {
    if (s.reportTypes && !s.reportTypes.includes(reportType)) return false;
    if (s.fiuIds && !s.fiuIds.includes(fiuId)) return false;
    return true;
  });
}

export function buildDefaultSections(input: {
  caseNumber: string;
  customerName: string;
  customerId: string;
  title: string;
  summary?: string | null;
  ruleId?: string | null;
  ruleName?: string | null;
  craRating?: string | null;
  dispositionNotes?: string;
  evidenceLines?: string[];
  metadata?: Record<string, unknown>;
  fiuId: FiuDestinationId;
  reportType: FilingReportType;
  alertDate?: string;
}): FilingSection[] {
  const meta = input.metadata ?? {};
  const amount = meta.amount != null ? String(meta.amount) : "";
  const currency = String(meta.currency ?? (input.fiuId === "US" ? "USD" : "AED"));
  const channel = String(meta.channel ?? "—");
  const alertDate = input.alertDate ?? new Date().toISOString().slice(0, 10);
  const isUs = input.fiuId === "US";
  const isStr = input.reportType === "STR";
  const ruleLabel = input.ruleName ?? input.ruleId ?? "—";

  const findings = [
    input.summary,
    input.dispositionNotes,
    input.evidenceLines?.length ? `Evidence:\n${input.evidenceLines.join("\n")}` : "",
  ].filter(Boolean).join("\n\n");

  const all: FilingSection[] = [
    section("summaryOneLine", "Description / summary of report*", "cover", input.title, {
      required: true,
      guidance: "CBUAE §3.4 · goAML Report Cover mandatory",
    }),
    section("internalReportNumber", "Internal STR/SAR number", "cover", input.caseNumber, { required: true }),
    section("reportingBranch", "Reporting entity branch", "cover", "UAE HQ — Mal Bank PJSC"),
    section("rfrCodes", "Reason for reporting (RFR)*", "cover", "", {
      required: true,
      placeholder: "goAML RFR catalogue — must match actual suspicion",
    }),
    section("actionTaken", "Action taken by reporting entity*", "cover",
      input.dispositionNotes ?? "Case escalated; enhanced review pending MLRO filing.", { required: true }),
    section("incidentLocation", "Location of incident*", "cover",
      String(meta.licenseRegion ?? (isUs ? "United States" : "United Arab Emirates")), { required: !isUs }),

    section("introduction", "Introduction — purpose & violation", "introduction",
      `Report suspected ${isStr ? "transaction(s)" : "activity"} involving ${input.customerName}. ${input.title}.`, { required: true }),
    section("redFlagsSummary", "Red flags & suspicious patterns", "introduction",
      ruleLabel !== "—" ? `TM rule: ${ruleLabel}. ${input.title}.` : "Document red flags.", { required: true }),
    section("priorReports", "Linked prior STR/SAR", "introduction", "None — verify filing register."),
    section("sanctionsGeoFlag", "Sanctions / high-risk country nexus", "introduction", "None identified — verify NAMLCFTC/UNSC."),

    section("customerName", "Subject legal name*", "narrative", input.customerName, { required: true }),
    section("customerId", "Customer / CIF ID*", "narrative", input.customerId, { required: true }),
    section("identificationNumbers", "IDs (passport, EID, trade licence)*", "narrative", "", {
      required: true, guidance: "Annex 1: complete identifying details required",
    }),
    section("whoNarrative", "WHO — parties & roles*", "narrative",
      `${input.customerName} — document conductor vs beneficiary per leg.`, { required: true }),
    section("uboDirectors", "UBO / directors / signatories", "narrative", "From CDD / corporate structure file."),
    section("partyRelationships", "Relationships among parties", "narrative", "Document relationships between subject and counterparties."),
    section("nationality", "Nationality / incorporation", "narrative", ""),
    section("address", "Address(es)*", "narrative", "", { required: true }),
    section("declaredActivity", "Occupation / business activity*", "narrative", "", { required: true }),
    section("craRating", "CRA rating at filing", "narrative", input.craRating ?? "Reclassify high-risk post-STR §6.2"),
    section("accountNumbers", "Account number(s)*", "narrative", "", { required: true }),

    section("whatInstruments", "WHAT — instruments*", "narrative", `Channel: ${channel}. Products: payment account / transfer.`, { required: true }),
    section("whenTimeline", "WHEN — timeline*", "narrative", `90-day review. Case ${input.caseNumber}.`, { required: true }),
    section("firstObservedDate", "Date first observed*", "narrative", alertDate, { required: true }),
    section("reviewPeriod", "Review period*", "narrative", "90 days", { required: true }),
    section("whereNarrative", "WHERE — locations*", "narrative", String(meta.licenseRegion ?? "UAE"), { required: true }),
    section("foreignJurisdictions", "Foreign jurisdictions & LFIs in chain", "narrative", "", {
      required: isStr, reportTypes: ["STR", "SAR_US"],
    }),
    section("whySuspicious", "WHY — suspicion basis*", "narrative", findings || input.title, { required: true }),
    section("expectedVsObserved", "Expected vs observed for this customer*", "narrative", "", {
      required: true, guidance: "Annex 1: explain why unusual for THIS customer",
    }),
    section("howModusOperandi", "HOW — modus operandi*", "narrative",
      ruleLabel !== "—" ? `Pattern: ${ruleLabel}. Dates, amounts, destinations, beneficiaries.` : "", { required: true }),

    section("transactionTable", "Chronological transactions (date·amount·party)*", "transactions",
      isStr && amount ? `[Date] · ${amount} ${currency} · ${channel} · Rule ${input.ruleId ?? "—"}` :
        isStr ? "Each txn: date, amount, originator, beneficiary — NOT aggregates only." : "N/A if pure SAR.",
      { required: isStr, reportTypes: ["STR"] }),
    section("counterpartyAnalysis", "Counterparty analysis*", "transactions",
      "Name, bank, account, jurisdiction per counterparty.", { required: isStr, reportTypes: ["STR", "SAR_US"] }),
    section("fundsOrigin", "Source of funds*", "transactions", "", { required: true }),
    section("fundsDestination", "Destination / beneficiary of funds*", "transactions", "", { required: true }),
    section("screeningResults", "Subject screening (Vital4)*", "transactions", "Sanctions · PEP · Adverse — attach disposition.", { required: true }),
    section("counterpartyScreening", "Counterparty screening*", "transactions", "Thematic Review §2.5: screen counterparties.", { required: true }),

    section("tmRuleTriggered", "TM rule / scenario*", "investigation", `${input.ruleId ?? "—"} · ${ruleLabel}`, { required: true }),
    section("alertGeneratedDate", "Alert date*", "investigation", alertDate, { required: true }),
    section("investigationSummary", "Investigation summary (Mohsen)*", "investigation", findings || "6-step pipeline complete.", { required: true }),
    section("dispositionRationale", "Disposition rationale (not generic)*", "investigation",
      input.dispositionNotes ?? "Genuine suspicion — not defensive filing.", { required: true }),

    section("conclusionActions", "Conclusion — mitigating steps*", "compliance",
      "Enhanced monitoring · restrictions · exit assessment · watchlist.", { required: true }),
    section("sowSof", "SoW / SoF summary*", "compliance", "", { required: true }),
    section("totalValue", "Total suspected value", "compliance", amount ? `${amount} ${currency}` : ""),
    section("relatedAccountsReview", "Related accounts reviewed (§6.2)*", "compliance",
      "Identify and review all related accounts/relationships.", { required: true }),
    section("retainExitRationale", "Retain vs exit rationale*", "compliance",
      "High-risk reclass + SM decision documented.", { required: true }),
    section("postStrActions", "Post-STR actions*", "compliance", POST_STR_ACTIONS.map((a) => `□ ${a}`).join("\n"), { required: true }),
    section("attachments", "Attachments checklist", "compliance",
      "□ KYC □ IDs □ Investigation pack □ Vital4 □ Txn receipts □ Maker-checker"),
    section("slaTiming", "Filing SLA*", "compliance", isUs
      ? "30 calendar days from detection (BSA)."
      : `${STR_FILING_SLA.standardBusinessDaysFromAlert} business days / ${STR_FILING_SLA.expeditedHoursFromDecision}h expedited / complex 15+30 days.`, { required: true }),
    section("businessDaysJustification", "Days from alert — justification", "compliance", "", { fiuIds: ["UAE"] }),
    section("noTippingOff", "No tipping-off*", "compliance",
      "Confirmed: no disclosure to customer (Art. 25 AML-CFT Law).", { required: true }),

    section("mlroName", "MLRO / BSA Officer*", "mlro", "Walid El-Sheikha", { required: true }),
    section("mlroEmail", "MLRO email*", "mlro", "walid.elsheikha@mal.ae", { required: true }),
    section("mlroPhone", "MLRO phone*", "mlro", "+971-4-000-0000", { required: true }),
    section("checkerName", "Independent checker*", "mlro", "", { required: true }),
    section("mlroDeclaration", "MLRO declaration*", "mlro",
      "Good faith · Who/What/When/Where/Why/How · RFR accurate · NOT defensive · no tipping-off.", { required: true }),

    section("fincenActivityTypes", "FinCEN activity types (Part II)*", "fincen", "", { required: true, fiuIds: ["US"] }),
    section("supportingDocsPartV", "Part V supporting docs description", "fincen",
      "Docs retained 5 years; Excel ≤1MB for bulk txns only.", { fiuIds: ["US"] }),
    section("lawEnforcementContact", "Law enforcement contacts", "fincen", "None unless written hold request.", { fiuIds: ["US"] }),
  ];

  return filterSections(all, input.reportType, input.fiuId);
}

export function composeRenderedText(
  doc: Pick<FilingDraftDocument, "reportType" | "fiu" | "sections" | "caseNumber" | "complexInvestigation" | "expeditedFiling">,
): string {
  const group = (g: FilingSectionGroup) =>
    doc.sections.filter((s) => s.group === g).map((s) => `${s.label}:\n${s.value}`).join("\n\n");

  return [
    "═══════════════════════════════════════════════════════════════",
    "  MAL FINCRIME OS · CONFIDENTIAL · STR/SAR FILING DRAFT",
    "  CBUAE 3354/2022 · Thematic Review Jan 2023 · FFIEC App L",
    "═══════════════════════════════════════════════════════════════",
    `Ref: ${doc.caseNumber ?? ""} · Type: ${doc.reportType}${doc.complexInvestigation ? " · COMPLEX" : ""}${doc.expeditedFiling ? " · EXPEDITED" : ""}`,
    `FIU: ${doc.fiu.label} · ${doc.fiu.system}`,
    `Contact: ${doc.fiu.contactEmail} · ${doc.fiu.contactPhone} · ${doc.fiu.portalUrl}`,
    "",
    "── COVER (goAML §3.4) ──", group("cover"),
    "", "── INTRODUCTION (§3.2) ──", group("introduction"),
    "", "── BODY — Who/What/When/Where/Why/How (§3.3 · FFIEC App L) ──", group("narrative"),
    "", "── TRANSACTIONS ──", group("transactions"),
    "", "── INVESTIGATION (Thematic §2.5) ──", group("investigation"),
    "", "── CONCLUSION & POST-STR (§6.2) ──", group("compliance"),
    doc.fiu.id === "US" ? `\n── FINCEN ──\n${group("fincen")}` : "",
    "", "── MLRO ──", group("mlro"),
    "", doc.fiu.filingInstructions,
    "", "Prepared by Jana · MLRO review required · Not auto-submitted.",
  ].filter(Boolean).join("\n");
}

function defaultChecklist(reportType: FilingReportType, fiuId: FiuDestinationId): string[] {
  const base = [
    "Introduction → Body → Conclusion structure (CBUAE §3.2)",
    "Who/What/When/Where/Why/How complete (§3.3 · FFIEC App L)",
    "Specific dates & amounts — not aggregates (Annex 1)",
    "Counterparty analysis with banks/accounts/jurisdictions (Thematic §2.5)",
    "Expected vs observed — genuine suspicion, not defensive (§3.3.1)",
    "Post-STR: related accounts, high-risk reclass, EDD (§6.2)",
    "No tipping-off (§5) · Maker-checker before filing",
  ];
  if (fiuId === "US") base.push("FinCEN Part IV/V complete");
  if (reportType === "STR") base.push("Transaction tab — chronological schedule");
  return base;
}

export function buildFilingDocument(input: {
  templateId: string;
  reportType: FilingReportType;
  fiuId: FiuDestinationId;
  caseNumber: string;
  customerName: string;
  customerId: string;
  title: string;
  summary?: string | null;
  ruleId?: string | null;
  ruleName?: string | null;
  craRating?: string | null;
  dispositionNotes?: string;
  evidenceLines?: string[];
  metadata?: Record<string, unknown>;
  checklist?: string[];
  generatedAt?: string;
  alertDate?: string;
}): FilingDraftDocument {
  const fiu = getFiuDestination(input.fiuId);
  const sections = buildDefaultSections({ ...input, fiuId: input.fiuId, reportType: input.reportType });
  const base: FilingDraftDocument = {
    version: 2,
    templateId: input.templateId,
    reportType: input.reportType,
    fiu,
    sections,
    renderedText: "",
    checklist: input.checklist ?? defaultChecklist(input.reportType, input.fiuId),
    agent: "jana",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    caseNumber: input.caseNumber,
    dispositionNotes: input.dispositionNotes,
    defensiveFilingDenied: true,
  };
  base.renderedText = composeRenderedText(base);
  return base;
}

function mergeExistingSections(doc: FilingDraftDocument, rebuilt: FilingDraftDocument): FilingDraftDocument {
  const merged = Object.fromEntries(doc.sections.map((s) => [s.id, s.value]));
  rebuilt.sections = rebuilt.sections.map((s) => ({ ...s, value: merged[s.id] ?? s.value }));
  rebuilt.defensiveFilingDenied = doc.defensiveFilingDenied ?? true;
  rebuilt.complexInvestigation = doc.complexInvestigation;
  rebuilt.expeditedFiling = doc.expeditedFiling;
  rebuilt.lastEditedAt = doc.lastEditedAt;
  rebuilt.renderedText = composeRenderedText(rebuilt);
  return rebuilt;
}

export function normalizeDraftBody(raw: LegacyFilingDraftBody | FilingDraftDocument | null): FilingDraftDocument | null {
  if (!raw) return null;
  if ("version" in raw && raw.version === 2 && "sections" in raw) {
    const doc = raw as FilingDraftDocument;
    if (doc.reportType === "CTR_US") return doc;
    if (doc.sections.length < 35) {
      return mergeExistingSections(doc, buildFilingDocument({
        templateId: doc.templateId,
        reportType: doc.reportType,
        fiuId: doc.fiu.id,
        caseNumber: doc.caseNumber ?? "—",
        customerName: doc.sections.find((s) => s.id === "customerName")?.value ?? "—",
        customerId: doc.sections.find((s) => s.id === "customerId")?.value ?? "—",
        title: doc.sections.find((s) => s.id === "summaryOneLine")?.value ?? "Draft",
        summary: doc.sections.find((s) => s.id === "whySuspicious")?.value,
        dispositionNotes: doc.dispositionNotes,
        checklist: doc.checklist,
        generatedAt: doc.generatedAt,
      }));
    }
    return doc;
  }
  const legacy = raw as LegacyFilingDraftBody;
  const ph = legacy.placeholders ?? {};
  const fiuId = (ph.incidentLocation === "US" || legacy.templateId.includes("US")) ? "US" : "UAE";
  const hasTxn = Boolean(ph.amount && ph.amount !== "TBD");
  return buildFilingDocument({
    templateId: legacy.templateId,
    reportType: reportTypeForFiu(fiuId, hasTxn),
    fiuId,
    caseNumber: legacy.caseNumber ?? ph.reportRef ?? "—",
    customerName: ph.customerName ?? "—",
    customerId: ph.customerId ?? "—",
    title: ph.summaryOneLine ?? "STR/SAR draft",
    summary: ph.investigationFindings,
    ruleId: ph.oscilarRuleId,
    dispositionNotes: legacy.dispositionNotes,
    checklist: legacy.checklist,
    generatedAt: legacy.generatedAt,
  });
}

export function applyReportTypeChange(doc: FilingDraftDocument, reportType: FilingReportType): FilingDraftDocument {
  const values = Object.fromEntries(doc.sections.map((s) => [s.id, s.value]));
  const sections = buildDefaultSections({
    caseNumber: doc.caseNumber ?? "—",
    customerName: values.customerName ?? "—",
    customerId: values.customerId ?? "—",
    title: values.summaryOneLine ?? "Draft",
    summary: values.whySuspicious,
    ruleId: values.tmRuleTriggered?.split("·")[0]?.trim(),
    craRating: values.craRating,
    dispositionNotes: doc.dispositionNotes,
    metadata: { licenseRegion: doc.fiu.id === "US" ? "US" : "UAE" },
    fiuId: doc.fiu.id,
    reportType,
    alertDate: values.alertGeneratedDate,
  }).map((s) => ({ ...s, value: values[s.id] ?? s.value }));
  const next = { ...doc, reportType, templateId: templateIdForReport(reportType), sections, lastEditedAt: new Date().toISOString() };
  next.renderedText = composeRenderedText(next);
  return next;
}

export function applyFiuChange(doc: FilingDraftDocument, fiuId: FiuDestinationId, hasExecutedTxn: boolean): FilingDraftDocument {
  return applyReportTypeChange({ ...doc, fiu: getFiuDestination(fiuId) }, reportTypeForFiu(fiuId, hasExecutedTxn));
}

export function updateSection(doc: FilingDraftDocument, sectionId: string, value: string): FilingDraftDocument {
  const next = { ...doc, sections: doc.sections.map((s) => (s.id === sectionId ? { ...s, value } : s)), lastEditedAt: new Date().toISOString() };
  next.renderedText = composeRenderedText(next);
  return next;
}

export function updateFiuContact(
  doc: FilingDraftDocument,
  patch: Partial<Pick<FiuDestination, "contactName" | "contactEmail" | "contactPhone" | "contactTitle" | "portalUrl">>,
): FilingDraftDocument {
  const next = { ...doc, fiu: { ...doc.fiu, ...patch }, lastEditedAt: new Date().toISOString() };
  next.renderedText = composeRenderedText(next);
  return next;
}

export function updateDraftFlags(
  doc: FilingDraftDocument,
  flags: Partial<Pick<FilingDraftDocument, "complexInvestigation" | "expeditedFiling" | "defensiveFilingDenied">>,
): FilingDraftDocument {
  const next = { ...doc, ...flags, lastEditedAt: new Date().toISOString() };
  next.renderedText = composeRenderedText(next);
  return next;
}

export function renderTemplateBody(templateBody: string, placeholders: Record<string, string>): string {
  return templateBody.replace(/\{\{(\w+)\}\}/g, (_, key: string) => placeholders[key] ?? `{{${key}}}`);
}
