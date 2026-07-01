import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MalLogo from "../components/MalLogo";
import { Card } from "../components/ui";
import { useAuth } from "../auth/AuthProvider";
import { setOidcAccessToken } from "../lib/authSession";
import { apiExchangeOidcCode } from "../lib/api";

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refresh, config } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    const savedState = sessionStorage.getItem("cram.oidc.state");

    if (!code) {
      setError(params.get("error_description") ?? "No authorization code received");
      return;
    }

    if (state && savedState && state !== savedState) {
      setError("Invalid OAuth state — possible CSRF");
      return;
    }

    void (async () => {
      try {
        const tokens = await apiExchangeOidcCode(code, config?.oidc?.redirectUri);
        setOidcAccessToken(tokens.accessToken);
        sessionStorage.removeItem("cram.oidc.state");
        await refresh();
        navigate("/", { replace: true });
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [params, navigate, refresh, config?.oidc?.redirectUri]);

  return (
    <div className="min-h-screen grid place-items-center bg-panel p-6">
      <Card className="p-8 max-w-md w-full text-center">
        <MalLogo size={40} />
        {error ? (
          <>
            <p className="text-hi text-[13px] mt-4">{error}</p>
            <button type="button" className="btn text-[12px] mt-4" onClick={() => navigate("/auth/login")}>
              Try again
            </button>
          </>
        ) : (
          <p className="text-muted text-[13px] mt-4">Completing sign-in…</p>
        )}
      </Card>
    </div>
  );
}
