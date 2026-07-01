export type SourceCheckStatus = "ok" | "changed" | "error" | "baseline";

export interface SourceCheckResult {
  sourceId: string;
  name: string;
  url: string;
  status: SourceCheckStatus;
  checkedAt: string;
  channel: "rss-primary" | "email-rss" | "drive-version" | "http-backup";
  contentHash?: string;
  previousHash?: string;
  httpStatus?: number;
  error?: string;
  regulationIds: string[];
  detail?: string;
}

export interface RegulatoryMonitorRun {
  id: string;
  at: string;
  agent: "sayed";
  trigger: "scheduled" | "manual";
  sourcesChecked: number;
  changed: number;
  errors: number;
  notifications?: { slack: boolean; email: boolean };
  results: SourceCheckResult[];
}
