export type CaseStatus =
  | "open"
  | "assigned"
  | "investigating"
  | "pending_mlro"
  | "closed";

export type CaseDisposition =
  | "no_action"
  | "escalate"
  | "sar_recommended"
  | "closed_fp";

export type CaseSource = "tm_alert" | "screening" | "manual" | "onboarding";

export type InvestigationCaseRecord = {
  id: string;
  caseNumber: string;
  title: string;
  customerId: string;
  customerName: string;
  status: CaseStatus;
  priority: string;
  severity: string;
  source: CaseSource;
  tmAlertId: string | null;
  screeningCaseId: string | null;
  onboardingCaseId: string | null;
  assignedTo: string | null;
  typologyId: string | null;
  ruleId: string | null;
  ruleName: string | null;
  craRating: string | null;
  slaDueAt: string | null;
  disposition: CaseDisposition | null;
  dispositionNotes: string | null;
  disposedBy: string | null;
  disposedAt: string | null;
  pipelineStep: number;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  evidence?: CaseEvidenceRecord[];
};

export type CaseEvidenceRecord = {
  id: string;
  caseId: string;
  kind: string;
  label: string;
  detail: string | null;
  payload: Record<string, unknown> | null;
  createdBy: string;
  createdAt: string;
};

export type CreateCaseInput = {
  title: string;
  customerId: string;
  customerName: string;
  source: CaseSource;
  severity?: string;
  priority?: string;
  tmAlertId?: string;
  screeningCaseId?: string;
  onboardingCaseId?: string;
  ruleId?: string;
  ruleName?: string;
  typologyId?: string;
  craRating?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
};

export type UpdateCaseInput = {
  status?: CaseStatus;
  assignedTo?: string | null;
  pipelineStep?: number;
  summary?: string | null;
  priority?: string;
};

export type DispositionInput = {
  disposition: CaseDisposition;
  notes?: string;
};

export type AddEvidenceInput = {
  kind: string;
  label: string;
  detail?: string;
  payload?: Record<string, unknown>;
};
