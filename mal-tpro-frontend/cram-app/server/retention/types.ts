import type { RecordClass, RetentionDisposition } from "../../src/config/retentionPolicy";

export type LegalHoldScope = "global" | "customer" | "case" | "filing" | "investigation";

export interface LegalHoldRecord {
  id: string;
  scopeType: LegalHoldScope;
  scopeId: string | null;
  customerId: string | null;
  reason: string;
  matterRef: string | null;
  placedBy: string;
  placedAt: string;
  releasedBy: string | null;
  releasedAt: string | null;
  status: "active" | "released";
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface RetentionRecordSummary {
  recordClass: RecordClass;
  entityType: string;
  entityId: string;
  customerId: string | null;
  customerName: string | null;
  anchorDate: string;
  retentionUntil: string;
  disposition: RetentionDisposition;
  onHold: boolean;
  holdIds: string[];
  policyRef: string;
  immutable: boolean;
}

export interface RetentionStats {
  scanned: number;
  active: number;
  approachingExpiry: number;
  eligibleArchive: number;
  onHold: number;
  activeLegalHolds: number;
  exportRuns: number;
  lastRunAt: string | null;
  byClass: Record<string, { scanned: number; onHold: number; eligibleArchive: number }>;
}

export interface EvidenceExportRunRecord {
  id: string;
  exportRef: string;
  policyId: string;
  scopeType: string;
  scopeId: string | null;
  customerId: string | null;
  recordClasses: string[];
  recordCount: number;
  manifest: unknown;
  requestedBy: string;
  approvedBy: string | null;
  status: string;
  legalHoldChecked: boolean;
  holdBlockedCount: number;
  createdAt: string;
}

export interface CreateLegalHoldInput {
  scopeType: LegalHoldScope;
  scopeId?: string;
  customerId?: string;
  reason: string;
  matterRef?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateExportInput {
  policyId: string;
  scopeType: "customer" | "case" | "global" | "audit_range";
  scopeId?: string;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
}
