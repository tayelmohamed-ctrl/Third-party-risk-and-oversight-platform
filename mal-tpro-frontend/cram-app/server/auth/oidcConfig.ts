export type AuthMode = "dev" | "oidc";

export interface OidcServerConfig {
  issuer: string;
  audience: string;
  jwksUri: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string;
}

export function getAuthMode(): AuthMode {
  return process.env.AUTH_MODE === "oidc" ? "oidc" : "dev";
}

export function allowDevFallback(): boolean {
  if (getAuthMode() !== "oidc") return true;
  return process.env.OIDC_ALLOW_DEV_FALLBACK === "1";
}

export function allowHeaderAuth(): boolean {
  if (getAuthMode() === "dev") return true;
  return process.env.OIDC_ALLOW_HEADER_AUTH === "1";
}

export function getOidcServerConfig(): OidcServerConfig | null {
  if (getAuthMode() !== "oidc") return null;
  const issuer = process.env.OIDC_ISSUER;
  if (!issuer) return null;
  return {
    issuer,
    audience: process.env.OIDC_AUDIENCE ?? "cram-api",
    jwksUri: process.env.OIDC_JWKS_URI ?? `${issuer.replace(/\/$/, "")}/.well-known/jwks.json`,
    clientId: process.env.OIDC_CLIENT_ID ?? "",
    clientSecret: process.env.OIDC_CLIENT_SECRET,
    redirectUri: process.env.OIDC_REDIRECT_URI ?? "http://localhost:5174/auth/callback",
    scopes: process.env.OIDC_SCOPES ?? "openid profile email",
  };
}

export function getPublicAuthConfig() {
  const mode = getAuthMode();
  const oidc = getOidcServerConfig();
  return {
    mode,
    allowDevFallback: allowDevFallback(),
    oidc: oidc
      ? {
          authority: oidc.issuer,
          clientId: oidc.clientId,
          redirectUri: oidc.redirectUri,
          scopes: oidc.scopes,
        }
      : null,
  };
}
