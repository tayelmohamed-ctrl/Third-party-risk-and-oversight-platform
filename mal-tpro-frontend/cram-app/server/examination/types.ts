import type { ExaminationStatus } from "../../src/config/ffiecExaminationMatrix";

export interface ExaminationItemRecord {
  id: string;
  domainId: string;
  domainName: string;
  procedure: string;
  ffiecRef: string;
  status: ExaminationStatus;
  owner: string | null;
  evidenceRoute: string | null;
  evidenceType: string | null;
  notes: string | null;
  autoScore: number | null;
  lastReviewedAt: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExaminationReadiness {
  score: number;
  total: number;
  ready: number;
  inProgress: number;
  gaps: number;
  notStarted: number;
  completionPct: number;
  readinessScore: number;
  domains: { domainId: string; domainName: string; ready: number; total: number; pct: number }[];
}

export interface UpdateExaminationInput {
  status?: ExaminationStatus;
  notes?: string;
  owner?: string;
  lastReviewedAt?: string;
}
