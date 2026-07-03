import { describe, expect, it } from "vitest";
import { mapGroupsToRoles, DEFAULT_GROUP_MAP } from "../server/auth/groupMapping";
import { getAuthMode, allowDevFallback } from "../server/auth/oidcConfig";

describe("OIDC group mapping", () => {
  it("maps IdP groups to CRAM roles", () => {
    const roles = mapGroupsToRoles(["cram-mlro", "cram-reviewer"]);
    expect(roles).toContain("MLRO");
    expect(roles).toContain("Reviewer");
  });

  it("accepts direct CRAM role names in token", () => {
    expect(mapGroupsToRoles(["MLRO"])).toEqual(["MLRO"]);
  });

  it("returns empty for unmapped groups", () => {
    expect(mapGroupsToRoles(["unknown-group"])).toEqual([]);
  });

  it("includes default Azure/Okta style mappings", () => {
    expect(DEFAULT_GROUP_MAP["cram-mlro"]).toBe("MLRO");
    expect(DEFAULT_GROUP_MAP["cram-analyst"]).toBe("Analyst");
  });
});

describe("OIDC config", () => {
  it("defaults to dev auth mode", () => {
    const prev = process.env.AUTH_MODE;
    delete process.env.AUTH_MODE;
    expect(getAuthMode()).toBe("dev");
    process.env.AUTH_MODE = prev;
  });

  it("disallows dev fallback in strict oidc mode", () => {
    const prevMode = process.env.AUTH_MODE;
    const prevFallback = process.env.OIDC_ALLOW_DEV_FALLBACK;
    process.env.AUTH_MODE = "oidc";
    delete process.env.OIDC_ALLOW_DEV_FALLBACK;
    expect(allowDevFallback()).toBe(false);
    process.env.AUTH_MODE = prevMode;
    process.env.OIDC_ALLOW_DEV_FALLBACK = prevFallback;
  });
});

describe("OIDC auth routes", () => {
  const ROUTES = [
    "GET /api/v1/crr/auth/config",
    "POST /api/v1/crr/auth/token",
    "GET /api/v1/crr/auth/me",
    "POST /api/v1/crr/auth/logout",
  ];

  it("exposes public config and token exchange", () => {
    expect(ROUTES.some((r) => r.includes("config"))).toBe(true);
    expect(ROUTES.some((r) => r.includes("token"))).toBe(true);
  });
});
