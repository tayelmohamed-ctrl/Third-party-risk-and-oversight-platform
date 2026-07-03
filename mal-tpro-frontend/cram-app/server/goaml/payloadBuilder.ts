import type { FilingDraftDocument } from "../../src/lib/filingDraftDocument";

export interface GoamlPayload {
  schemaVersion: "1.0";
  system: "goAML";
  reportType: "STR" | "SAR";
  reportingEntityId: string;
  internalReference: string;
  cover: {
    summary: string;
    rfrCodes: string;
    actionTaken: string;
    incidentLocation: string;
    reportingBranch: string;
  };
  subject: {
    customerId: string;
    customerName: string;
    identificationNumbers: string;
    address: string;
    declaredActivity: string;
    accountNumbers: string;
  };
  narrative: {
    introduction: string;
    who: string;
    what: string;
    when: string;
    where: string;
    why: string;
    how: string;
  };
  transactions?: string;
  mlro: {
    name: string;
    email: string;
    phone: string;
  };
  renderedNarrative: string;
}

export interface GoamlSubmitResult {
  ok: boolean;
  fiuReference: string;
  status: "accepted" | "rejected" | "pending";
  message: string;
  submittedAt: string;
  mode: "mock" | "live";
  rawResponse?: unknown;
}

function sectionValue(doc: FilingDraftDocument, id: string): string {
  return doc.sections.find((s) => s.id === id)?.value ?? "";
}

export function buildGoamlPayload(doc: FilingDraftDocument, draftId: string): GoamlPayload {
  const reportType = doc.reportType === "SAR" ? "SAR" : "STR";
  return {
    schemaVersion: "1.0",
    system: "goAML",
    reportType,
    reportingEntityId: process.env.GOAML_ENTITY_ID ?? "MAL-BANK-AE",
    internalReference: doc.caseNumber ?? draftId,
    cover: {
      summary: sectionValue(doc, "summaryOneLine"),
      rfrCodes: sectionValue(doc, "rfrCodes"),
      actionTaken: sectionValue(doc, "actionTaken"),
      incidentLocation: sectionValue(doc, "incidentLocation"),
      reportingBranch: sectionValue(doc, "reportingBranch"),
    },
    subject: {
      customerId: sectionValue(doc, "customerId"),
      customerName: sectionValue(doc, "customerName"),
      identificationNumbers: sectionValue(doc, "identificationNumbers"),
      address: sectionValue(doc, "address"),
      declaredActivity: sectionValue(doc, "declaredActivity"),
      accountNumbers: sectionValue(doc, "accountNumbers"),
    },
    narrative: {
      introduction: sectionValue(doc, "introduction"),
      who: sectionValue(doc, "whoNarrative"),
      what: sectionValue(doc, "whatInstruments"),
      when: sectionValue(doc, "whenTimeline"),
      where: sectionValue(doc, "whereNarrative"),
      why: sectionValue(doc, "whySuspicious"),
      how: sectionValue(doc, "howModusOperandi"),
    },
    transactions: reportType === "STR" ? sectionValue(doc, "transactionTable") : undefined,
    mlro: {
      name: sectionValue(doc, "mlroName"),
      email: sectionValue(doc, "mlroEmail"),
      phone: sectionValue(doc, "mlroPhone"),
    },
    renderedNarrative: doc.renderedText,
  };
}

export interface FincenPayload {
  schemaVersion: "1.0";
  system: "FinCEN";
  form: "SAR-111";
  internalReference: string;
  activityTypes: string;
  narrative: string;
  subject: { customerId: string; customerName: string };
  mlro: { name: string; email: string };
  renderedNarrative: string;
}

export interface FincenCtrPayload {
  schemaVersion: "1.0";
  system: "FinCEN";
  form: "104";
  internalReference: string;
  transactionDate: string;
  subject: {
    customerId: string;
    customerName: string;
    taxId: string;
  };
  amounts: {
    cashIn: string;
    cashOut: string;
    aggregateUsd: string;
  };
  accountNumber: string;
  branchLocation: string;
  aggregated: boolean;
  aggregationNote: string;
  transactionDetail: string;
  mlro: { name: string; email: string; phone: string };
  renderedNarrative: string;
}

export function buildFincenPayload(doc: FilingDraftDocument, draftId: string): FincenPayload {
  return {
    schemaVersion: "1.0",
    system: "FinCEN",
    form: "SAR-111",
    internalReference: doc.caseNumber ?? draftId,
    activityTypes: sectionValue(doc, "fincenActivityTypes"),
    narrative: sectionValue(doc, "whySuspicious"),
    subject: {
      customerId: sectionValue(doc, "customerId"),
      customerName: sectionValue(doc, "customerName"),
    },
    mlro: {
      name: sectionValue(doc, "mlroName"),
      email: sectionValue(doc, "mlroEmail"),
    },
    renderedNarrative: doc.renderedText,
  };
}

export function buildFincenCtrPayload(doc: FilingDraftDocument, draftId: string): FincenCtrPayload {
  return {
    schemaVersion: "1.0",
    system: "FinCEN",
    form: "104",
    internalReference: sectionValue(doc, "reportRef") || doc.caseNumber || draftId,
    transactionDate: sectionValue(doc, "txnDate"),
    subject: {
      customerId: sectionValue(doc, "customerId"),
      customerName: sectionValue(doc, "customerName"),
      taxId: sectionValue(doc, "taxId"),
    },
    amounts: {
      cashIn: sectionValue(doc, "cashIn"),
      cashOut: sectionValue(doc, "cashOut"),
      aggregateUsd: sectionValue(doc, "aggregateUsd"),
    },
    accountNumber: sectionValue(doc, "accountNumber"),
    branchLocation: sectionValue(doc, "branchLocation"),
    aggregated: sectionValue(doc, "aggregatedFlag").toLowerCase() === "yes",
    aggregationNote: sectionValue(doc, "aggregationNote"),
    transactionDetail: sectionValue(doc, "transactionDetail"),
    mlro: {
      name: sectionValue(doc, "mlroName"),
      email: sectionValue(doc, "mlroEmail"),
      phone: sectionValue(doc, "mlroPhone"),
    },
    renderedNarrative: doc.renderedText,
  };
}
