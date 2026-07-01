import type { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AuthUser, Role, Capability } from "./rbac";
import { hasCapability, requireCapability } from "./rbac";
import { PLATFORM_USERS } from "../../src/config/platformUsers";
import { extractGroupsFromPayload, mapGroupsToRoles } from "./groupMapping";
import { allowDevFallback, allowHeaderAuth, getAuthMode, getOidcServerConfig } from "./oidcConfig";

const VALID_ROLES: Role[] = ["Analyst", "Reviewer", "MLRO", "ConfigMaker", "ConfigChecker", "ServiceAccount"];

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function parseRoles(raw: string | undefined): Role[] {
  if (!raw) return [];
  return raw.split(",").map((r) => r.trim()).filter((r): r is Role => VALID_ROLES.includes(r as Role));
}

function devAuth(req: Request): AuthUser | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer dev:")) return null;
  const rest = auth.slice("Bearer dev:".length);
  const colon = rest.indexOf(":");
  if (colon < 0) return null;
  const email = rest.slice(0, colon);
  const roles = parseRoles(rest.slice(colon + 1));
  if (!roles.length) return null;
  const platform = PLATFORM_USERS.find((u) => u.email === email);
  return { id: platform?.id ?? `dev_${email}`, email, name: platform?.name ?? email.split("@")[0], roles };
}

function headerAuth(req: Request): AuthUser | null {
  const email = req.headers["x-cram-user"] as string | undefined;
  const roles = parseRoles(req.headers["x-cram-roles"] as string | undefined);
  if (!email || !roles.length) return null;
  return { id: `hdr_${email}`, email, roles };
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

async function oidcAuth(req: Request): Promise<AuthUser | null> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ") || auth.startsWith("Bearer dev:")) return null;
  const token = auth.slice(7);
  const cfg = getOidcServerConfig();
  if (!cfg) return null;
  if (!jwks) jwks = createRemoteJWKSet(new URL(cfg.jwksUri));
  const { payload } = await jwtVerify(token, jwks, {
    issuer: cfg.issuer,
    audience: cfg.audience,
  });
  const email = String(payload.email ?? payload.preferred_username ?? payload.sub ?? "unknown");
  const groups = extractGroupsFromPayload(payload as Record<string, unknown>);
  const roles = mapGroupsToRoles(groups);
  if (!roles.length) return null;
  return {
    id: String(payload.sub),
    email,
    name: String(payload.name ?? payload.given_name ?? email),
    roles,
  };
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === "/api/v1/crr/health") return next();
  if (req.path === "/api/v1/crr/auth/config") return next();
  if (req.path === "/api/v1/crr/auth/token") return next();

  const mode = getAuthMode();
  try {
    let user: AuthUser | null = null;
    if (mode === "oidc") user = await oidcAuth(req);
    if (!user && allowDevFallback()) user = devAuth(req);
    if (!user && allowHeaderAuth()) user = headerAuth(req);

    if (!user) {
      res.status(401).json({
        error: "unauthorized",
        hint: mode === "dev"
          ? "Authorization: Bearer dev:feeds@mal.ae:ServiceAccount"
          : "Valid OIDC Bearer token required",
      });
      return;
    }
    req.user = user;
    next();
  } catch (e) {
    res.status(401).json({ error: "invalid token", detail: String(e) });
  }
}

function capabilityFor(req: Request): Capability | null {
  const { method, path } = req;
  if (method === "POST" && path === "/api/v1/crr/events") return "ingest_events";
  if (method === "POST" && path === "/api/v1/crr/assessments") return "score";
  if (method === "POST" && path === "/api/v1/crr/scheduler/run") return "scheduler_run";
  if (method === "GET" && path === "/api/v1/crr/audit") return "read_audit";
  if (method === "GET" && path === "/api/v1/crr/mlro/alerts") return "read_audit";
  if (path.startsWith("/api/v1/crr/identity/")) return "manage_identity";
  if (method === "POST" && path.startsWith("/api/v1/crr/screening/") && path.endsWith("/disposition")) return "review";
  if (method === "POST" && path === "/api/v1/crr/screening/initiate") return "score";
  return null;
}

export function rbacMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return next();
  const cap = capabilityFor(req);
  if (!cap) return next();
  try {
    requireCapability(req.user.roles, cap);
    next();
  } catch (e) {
    const err = e as Error & { status?: number };
    res.status(err.status ?? 403).json({ error: err.message });
  }
}

export const DEV_USERS: AuthUser[] = [
  ...PLATFORM_USERS.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    roles: u.roles as Role[],
  })),
  { id: "u_service", email: "feeds@mal.ae", name: "Feed Service", roles: ["ServiceAccount"] },
];
