export type CtrStatus = "pending" | "draft_created" | "filed" | "exempt";

export interface CtrObligationRecord {
  id: string;
  customerId: string;
  customerName: string;
  transactionDate: string;
  cashIn: number | null;
  cashOut: number | null;
  aggregateUsd: number;
  currency: string;
  channel: string | null;
  accountNumber: string | null;
  tin: string | null;
  branchLocation: string | null;
  aggregated: boolean;
  aggregationNote: string | null;
  status: CtrStatus;
  filingDraftId: string | null;
  tmAlertId: string | null;
  licenseRegion: string;
  dueAt: string;
  filedAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterCtrInput {
  customerId: string;
  customerName: string;
  transactionDate: string;
  cashIn?: number;
  cashOut?: number;
  aggregateUsd: number;
  currency?: string;
  channel?: string;
  accountNumber?: string;
  tin?: string;
  branchLocation?: string;
  aggregated?: boolean;
  aggregationNote?: string;
  tmAlertId?: string;
  licenseRegion?: string;
  dueAt: Date;
  metadata?: Record<string, unknown>;
}

export interface TmCtrCandidate {
  tmAlertId: string;
  customerId: string;
  customerName: string;
  amount: number;
  currency: string;
  channel?: string;
  licenseRegion: string;
  ruleId?: string;
  ruleName?: string;
  at: string;
}
