import {
  DEFAULT_PLATFORM_USER_ID,
  PLATFORM_USER_BY_ID,
  canOverride,
  type PlatformUser,
  type PlatformUserId,
} from "../config/platformUsers";

export type DevPersona = PlatformUserId;
export type AuthMode = "dev" | "oidc";

export interface PublicAuthConfig {
  mode: AuthMode;
  allowDevFallback?: boolean;
  oidc?: {
    authority: string;
    clientId: string;
    redirectUri: string;
    scopes: string;
  } | null;
}

const PERSONA_KEY = "cram.platformUser";
const OIDC_TOKEN_KEY = "cram.oidc.accessToken";

const SERVICE = {
  email: "feeds@mal.ae",
  roles: ["ServiceAccount"] as const,
};

let cachedConfig: PublicAuthConfig | null = null;

export function getCachedAuthConfig(): PublicAuthConfig | null {
  return cachedConfig;
}

export function setCachedAuthConfig(cfg: PublicAuthConfig): void {
  cachedConfig = cfg;
}

export function isOidcMode(): boolean {
  if (cachedConfig) return cachedConfig.mode === "oidc";
  return import.meta.env.VITE_AUTH_MODE === "oidc";
}

export function getOidcAccessToken(): string | null {
  try {
    return sessionStorage.getItem(OIDC_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setOidcAccessToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(OIDC_TOKEN_KEY, token);
    else sessionStorage.removeItem(OIDC_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function clearOidcSession(): void {
  setOidcAccessToken(null);
}

export function getPlatformUserId(): PlatformUserId {
  try {
    const v = sessionStorage.getItem(PERSONA_KEY) as PlatformUserId | null;
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
  sessionStorage.setItem(PERSONA_KEY, id);
}

export function getPersona(): PlatformUserId {
  return getPlatformUserId();
}

export function setPersona(id: PlatformUserId): void {
  setPlatformUser(id);
}

export function getServiceAuthHeaders(): Record<string, string> {
  if (isOidcMode() && getOidcAccessToken()) {
    return {
      Authorization: `Bearer ${getOidcAccessToken()}`,
    };
  }
  return {
    Authorization: `Bearer dev:${SERVICE.email}:${SERVICE.roles.join(",")}`,
    "X-CRAM-User": SERVICE.email,
    "X-CRAM-Roles": SERVICE.roles.join(","),
  };
}

export function getAuthHeaders(): Record<string, string> {
  const oidcToken = getOidcAccessToken();
  if (isOidcMode() && oidcToken) {
    return { Authorization: `Bearer ${oidcToken}` };
  }
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
  if (isOidcMode() && getOidcAccessToken()) {
    return { Authorization: `Bearer ${getOidcAccessToken()}` };
  }
  const user = PLATFORM_USER_BY_ID.tayel_mohamed;
  return {
    Authorization: `Bearer dev:${user.email}:${user.roles.join(",")}`,
    "X-CRAM-User": user.email,
    "X-CRAM-Roles": user.roles.join(","),
  };
}

export function buildOidcAuthorizeUrl(cfg: NonNullable<PublicAuthConfig["oidc"]>, state: string): string {
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: cfg.scopes,
    state,
  });
  const base = cfg.authority.replace(/\/$/, "");
  return `${base}/oauth/authorize?${params}`;
}
