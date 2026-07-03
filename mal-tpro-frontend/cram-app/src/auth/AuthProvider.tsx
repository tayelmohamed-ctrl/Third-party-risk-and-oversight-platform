import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  clearOidcSession,
  getCachedAuthConfig,
  getOidcAccessToken,
  isOidcMode,
  setCachedAuthConfig,
  setOidcAccessToken,
  type PublicAuthConfig,
} from "../lib/authSession";
import { apiAuthConfig, apiAuthMe, type AuthMe } from "../lib/api";

interface AuthContextValue {
  config: PublicAuthConfig | null;
  user: AuthMe | null;
  loading: boolean;
  isOidc: boolean;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PUBLIC_PATHS = ["/auth/login", "/auth/callback"];
const isPublicPath = (path: string) =>
  PUBLIC_PATHS.includes(path) || path === "/partner" || path.startsWith("/partner/");

export function AuthProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PublicAuthConfig | null>(getCachedAuthConfig());
  const [user, setUser] = useState<AuthMe | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    const cfg = await apiAuthConfig();
    setConfig(cfg);
    setCachedAuthConfig(cfg);

    if (cfg.mode === "oidc" && !getOidcAccessToken()) {
      setUser(null);
      return;
    }

    try {
      setUser(await apiAuthMe());
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const cfg = await apiAuthConfig();
        if (cancelled) return;
        setConfig(cfg);
        setCachedAuthConfig(cfg);

        if (cfg.mode === "oidc") {
          if (!getOidcAccessToken() && !isPublicPath(location.pathname)) {
            navigate("/auth/login", { replace: true });
            return;
          }
          if (getOidcAccessToken()) {
            setUser(await apiAuthMe());
          }
        } else {
          setUser(await apiAuthMe());
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [location.pathname, navigate]);

  const logout = useCallback(() => {
    clearOidcSession();
    setUser(null);
    navigate("/auth/login", { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({
      config,
      user,
      loading,
      isOidc: config?.mode === "oidc" || isOidcMode(),
      logout,
      refresh,
    }),
    [config, user, loading, logout, refresh],
  );

  if (loading && !isPublicPath(location.pathname)) {
    return (
      <div className="min-h-screen grid place-items-center bg-panel text-muted text-sm">
        Loading session…
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth requires AuthProvider");
  return ctx;
}
