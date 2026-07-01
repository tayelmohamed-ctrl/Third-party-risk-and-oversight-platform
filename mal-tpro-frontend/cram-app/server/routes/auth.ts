import type { Express, Request, Response } from "express";
import { hasCapability } from "../auth/rbac";
import { getPublicAuthConfig, getOidcServerConfig } from "../auth/oidcConfig";

/** Public auth routes — registered before authMiddleware. */
export function registerPublicAuthRoutes(app: Express) {
  app.get("/api/v1/crr/auth/config", (_req, res) => {
    res.json(getPublicAuthConfig());
  });

  app.post("/api/v1/crr/auth/token", async (req, res) => {
    const cfg = getOidcServerConfig();
    if (!cfg?.clientId || !cfg.clientSecret) {
      res.status(503).json({
        error: "oidc_not_configured",
        hint: "Set OIDC_CLIENT_ID and OIDC_CLIENT_SECRET for authorization code exchange",
      });
      return;
    }

    const { code, redirectUri } = req.body as { code?: string; redirectUri?: string };
    if (!code) {
      res.status(400).json({ error: "code required" });
      return;
    }

    const tokenUrl = `${cfg.issuer.replace(/\/$/, "")}/oauth/token`;
    try {
      const tokenRes = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri ?? cfg.redirectUri,
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret,
        }),
      });

      const body = await tokenRes.json().catch(() => ({})) as Record<string, unknown>;
      if (!tokenRes.ok) {
        res.status(tokenRes.status).json({ error: "token_exchange_failed", detail: body });
        return;
      }

      res.json({
        accessToken: body.access_token,
        idToken: body.id_token,
        refreshToken: body.refresh_token,
        expiresIn: body.expires_in,
        tokenType: body.token_type ?? "Bearer",
      });
    } catch (e) {
      res.status(502).json({ error: "token_exchange_error", detail: String(e) });
    }
  });

  app.post("/api/v1/crr/auth/logout", (_req, res) => {
    res.json({ ok: true });
  });
}

export function registerAuthRoutes(app: Express) {
  app.get("/api/v1/crr/auth/me", (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    res.json({
      email: req.user.email,
      name: req.user.name,
      roles: req.user.roles,
      authMode: process.env.AUTH_MODE ?? "dev",
      capabilities: {
        override: hasCapability(req.user.roles, "override"),
        score: hasCapability(req.user.roles, "score"),
        review: hasCapability(req.user.roles, "review"),
        readAudit: hasCapability(req.user.roles, "read_audit"),
        readMi: hasCapability(req.user.roles, "read_mi"),
        configPropose: hasCapability(req.user.roles, "config_propose"),
        configApprove: hasCapability(req.user.roles, "config_approve"),
      },
    });
  });
}
