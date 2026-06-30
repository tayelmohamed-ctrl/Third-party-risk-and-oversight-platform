export type Role =
  | "Analyst"
  | "Reviewer"
  | "MLRO"
  | "ConfigMaker"
  | "ConfigChecker"
  | "ServiceAccount";

export type Capability =
  | "score"
  | "review"
  | "approve_high"
  | "override"
  | "config_propose"
  | "config_approve"
  | "read_audit"
  | "read_mi"
  | "scheduler_run"
  | "ingest_events"
  | "manage_identity";

const MATRIX: Record<Role, Capability[]> = {
  Analyst: ["score", "read_mi", "ingest_events"],
  Reviewer: ["score", "review", "read_audit", "read_mi", "ingest_events"],
  MLRO: ["score", "review", "approve_high", "override", "config_approve", "read_audit", "read_mi", "scheduler_run", "ingest_events", "manage_identity"],
  ConfigMaker: ["config_propose", "read_mi"],
  ConfigChecker: ["config_approve", "read_audit", "read_mi"],
  ServiceAccount: ["score", "ingest_events", "scheduler_run"],
};

export function hasCapability(roles: Role[], cap: Capability): boolean {
  return roles.some((r) => MATRIX[r]?.includes(cap));
}

export function requireCapability(roles: Role[], cap: Capability): void {
  if (!hasCapability(roles, cap)) {
    const err = new Error(`forbidden: requires ${cap}`);
    (err as Error & { status: number }).status = 403;
    throw err;
  }
}

/** Route → minimum capability */
export const ROUTE_CAPS: Record<string, Capability> = {
  "POST /api/v1/crr/events": "ingest_events",
  "POST /api/v1/crr/assessments": "score",
  "POST /api/v1/crr/scheduler/run": "scheduler_run",
  "GET /api/v1/crr/audit": "read_audit",
  "GET /api/v1/crr/mlro/alerts": "read_audit",
  "POST /api/v1/crr/identity/mappings": "manage_identity",
  "GET /api/v1/crr/identity/mappings": "manage_identity",
};

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  roles: Role[];
}
