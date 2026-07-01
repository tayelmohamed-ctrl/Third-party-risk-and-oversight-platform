import type { Role } from "./rbac";

/** Default IdP group → CRAM role mapping (Azure AD / Okta style). */
export const DEFAULT_GROUP_MAP: Record<string, Role> = {
  "cram-analyst": "Analyst",
  "cram-reviewer": "Reviewer",
  "cram-mlro": "MLRO",
  "cram-config-maker": "ConfigMaker",
  "cram-config-checker": "ConfigChecker",
  "cram-service": "ServiceAccount",
  // Direct role names (some IdPs emit CRAM roles as groups)
  Analyst: "Analyst",
  Reviewer: "Reviewer",
  MLRO: "MLRO",
  ConfigMaker: "ConfigMaker",
  ConfigChecker: "ConfigChecker",
  ServiceAccount: "ServiceAccount",
};

function parseGroupMapEnv(): Record<string, Role> {
  const raw = process.env.OIDC_GROUP_MAP;
  if (!raw) return DEFAULT_GROUP_MAP;
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    const map: Record<string, Role> = { ...DEFAULT_GROUP_MAP };
    for (const [group, role] of Object.entries(parsed)) {
      if (isValidRole(role)) map[group] = role;
    }
    return map;
  } catch {
    return DEFAULT_GROUP_MAP;
  }
}

const VALID: Role[] = ["Analyst", "Reviewer", "MLRO", "ConfigMaker", "ConfigChecker", "ServiceAccount"];

function isValidRole(r: string): r is Role {
  return VALID.includes(r as Role);
}

let cachedMap: Record<string, Role> | null = null;

export function getGroupMap(): Record<string, Role> {
  if (!cachedMap) cachedMap = parseGroupMapEnv();
  return cachedMap;
}

/** Map IdP groups/roles claim values to CRAM roles. */
export function mapGroupsToRoles(groups: unknown): Role[] {
  const map = getGroupMap();
  const raw = Array.isArray(groups) ? groups : groups != null ? [groups] : [];
  const roles = new Set<Role>();

  for (const g of raw) {
    const key = String(g);
    if (isValidRole(key)) {
      roles.add(key);
      continue;
    }
    const mapped = map[key];
    if (mapped) roles.add(mapped);
  }

  return [...roles];
}

export function roleClaimName(): string {
  return process.env.OIDC_ROLE_CLAIM ?? "groups";
}

export function extractGroupsFromPayload(payload: Record<string, unknown>): unknown {
  const claim = roleClaimName();
  if (claim in payload) return payload[claim];
  if ("roles" in payload) return payload.roles;
  if ("groups" in payload) return payload.groups;
  return [];
}
