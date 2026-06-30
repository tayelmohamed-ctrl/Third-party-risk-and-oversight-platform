import {
  DEFAULT_PLATFORM_USER_ID,
  PLATFORM_USER_BY_ID,
  canOverride,
  type PlatformUser,
  type PlatformUserId,
} from "../config/platformUsers";

/** @deprecated Use PlatformUserId — kept for imports that referenced DevPersona */
export type DevPersona = PlatformUserId;

const KEY = "cram.platformUser";

const SERVICE = {
  email: "feeds@mal.ae",
  roles: ["ServiceAccount"] as const,
};

export function getPlatformUserId(): PlatformUserId {
  try {
    const v = sessionStorage.getItem(KEY) as PlatformUserId | null;
    if (v && v in PLATFORM_USER_BY_ID) return v;
  } catch {
    /* sessionStorage unavailable */
  }
  return DEFAULT_PLATFORM_USER_ID;
}

export function getPlatformUser(): PlatformUser {
  return PLATFORM_USER_BY_ID[getPlatformUserId()];
}

export function setPlatformUser(id: PlatformUserId): void {
  sessionStorage.setItem(KEY, id);
}

/** @deprecated Use getPlatformUserId */
export function getPersona(): PlatformUserId {
  return getPlatformUserId();
}

/** @deprecated Use setPlatformUser */
export function setPersona(id: PlatformUserId): void {
  setPlatformUser(id);
}

/** Headers for feed/pipeline/dashboard reads (ServiceAccount). */
export function getServiceAuthHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer dev:${SERVICE.email}:${SERVICE.roles.join(",")}`,
    "X-CRAM-User": SERVICE.email,
    "X-CRAM-Roles": SERVICE.roles.join(","),
  };
}

/** Headers for authenticated API calls — uses signed-in platform user. */
export function getAuthHeaders(): Record<string, string> {
  const user = getPlatformUser();
  return {
    Authorization: `Bearer dev:${user.email}:${user.roles.join(",")}`,
    "X-CRAM-User": user.email,
    "X-CRAM-Roles": user.roles.join(","),
  };
}

export function hasOverrideCapability(): boolean {
  return canOverride(getPlatformUser());
}

export function getMlroAuthHeaders(): Record<string, string> {
  const user = PLATFORM_USER_BY_ID.tayel_mohamed;
  return {
    Authorization: `Bearer dev:${user.email}:${user.roles.join(",")}`,
    "X-CRAM-User": user.email,
    "X-CRAM-Roles": user.roles.join(","),
  };
}
