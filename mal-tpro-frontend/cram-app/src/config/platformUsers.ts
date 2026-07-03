/**
 * Platform user catalogue — dev personas and production IdP mapping reference.
 * Roles map to server/auth/rbac.ts capability matrix.
 */
export type PlatformUserId = "tayel_mohamed" | "walid_elsheikha" | "david_henry";

export type PlatformRole =
  | "Analyst"
  | "Reviewer"
  | "MLRO"
  | "ConfigMaker"
  | "ConfigChecker"
  | "ServiceAccount";

export interface PlatformUser {
  id: PlatformUserId;
  name: string;
  title: string;
  email: string;
  initials: string;
  roles: PlatformRole[];
  focusAreas: string[];
}

export const PLATFORM_USERS: PlatformUser[] = [
  {
    id: "tayel_mohamed",
    name: "Tayel Mohamed",
    title: "Head of Financial Crimes",
    email: "tayel.mohamed@mal.ae",
    initials: "TM",
    roles: ["MLRO", "Reviewer"],
    focusAreas: [
      "Investigations & Mohsen hub",
      "STR/SAR filing approval (Jana)",
      "Transaction monitoring & screening disposition",
      "MLRO overrides & high-risk approvals",
    ],
  },
  {
    id: "walid_elsheikha",
    name: "Walid Elsheikha",
    title: "Head of Compliance",
    email: "walid.elsheikha@mal.ae",
    initials: "WE",
    roles: ["MLRO", "ConfigChecker"],
    focusAreas: [
      "Regulatory management & CBUAE obligations",
      "Model validation sign-off & governance",
      "Board / MLRO MI and exam packs",
      "CRAM config approval (maker-checker)",
    ],
  },
  {
    id: "david_henry",
    name: "David Henry",
    title: "Chief of Product",
    email: "david.henry@mal.ae",
    initials: "DH",
    roles: ["Reviewer", "ConfigMaker"],
    focusAreas: [
      "CRAM model & risk test bench (read/propose)",
      "ISIC activity register & product risk",
      "Model validation outcomes (read)",
      "Screening review — no MLRO override",
    ],
  },
];

export const DEFAULT_PLATFORM_USER_ID: PlatformUserId = "tayel_mohamed";

export const PLATFORM_USER_BY_ID: Record<PlatformUserId, PlatformUser> = Object.fromEntries(
  PLATFORM_USERS.map((u) => [u.id, u]),
) as Record<PlatformUserId, PlatformUser>;

export function getPlatformUser(id: PlatformUserId): PlatformUser {
  return PLATFORM_USER_BY_ID[id];
}

export function hasRole(user: PlatformUser, role: PlatformRole): boolean {
  return user.roles.includes(role);
}

/** MLRO role — manual overrides, high-risk approvals, identity admin. */
export function canOverride(user: PlatformUser): boolean {
  return hasRole(user, "MLRO");
}

export function canApproveConfig(user: PlatformUser): boolean {
  return hasRole(user, "ConfigChecker") || hasRole(user, "MLRO");
}

export function canProposeConfig(user: PlatformUser): boolean {
  return hasRole(user, "ConfigMaker") || hasRole(user, "ConfigChecker") || hasRole(user, "MLRO");
}
