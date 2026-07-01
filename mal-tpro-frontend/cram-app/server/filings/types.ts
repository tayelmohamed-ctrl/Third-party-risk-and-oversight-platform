import type { FilingDraftDocument } from "../../src/lib/filingDraftDocument";

export type FilingStatus = "draft" | "pending_review" | "mlro_approved" | "submitted";

export type FilingType = "str_uae" | "sar_uae" | "sar_us" | "ctr_us" | "aif" | "other";

/** Structured v2 document (preferred) or legacy v1 flat render */
export type FilingDraftBody = FilingDraftDocument | {
  templateId: string;
  renderedText: string;
  placeholders?: Record<string, string>;
  checklist?: string[];
  agent: "jana";
  generatedAt: string;
  caseNumber?: string;
  dispositionNotes?: string;
  version?: number;
};

export type FilingDraftRecord = {
  id: string;
  caseId: string | null;
  filingType: FilingType;
  templateId: string | null;
  status: FilingStatus;
  customerId: string;
  customerName: string;
  title: string | null;
  body: FilingDraftBody | null;
  createdBy: string;
  checkerBy: string | null;
  mlroBy: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateFilingDraftInput = {
  caseId: string;
  filingType?: FilingType;
  templateId?: string;
  dispositionNotes?: string;
};

export type UpdateFilingDraftInput = {
  status?: FilingStatus;
  checkerBy?: string | null;
  mlroBy?: string | null;
  title?: string;
  body?: FilingDraftBody;
  filingType?: FilingType;
  templateId?: string;
};
