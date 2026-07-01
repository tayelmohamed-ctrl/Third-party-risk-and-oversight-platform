import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MalLogo from "../components/MalLogo";
import { Card } from "../components/ui";
import { useAuth } from "../auth/AuthProvider";
import { buildOidcAuthorizeUrl } from "../lib/authSession";

export default function Login() {
  const { config, isOidc } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOidc) {
      navigate("/", { replace: true });
      return;
    }
    if (config?.oidc?.clientId) {
      const state = crypto.randomUUID();
      sessionStorage.setItem("cram.oidc.state", state);
      window.location.href = buildOidcAuthorizeUrl(config.oidc, state);
    }
  }, [config, isOidc, navigate]);

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-b from-[#06091c] to-[#0b0c2e] p-6">
      <Card className="p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <MalLogo size={48} />
        </div>
        <h1 className="font-display text-lg m-0 mb-2">Mal FinCrime OS</h1>
        <p className="text-[13px] text-muted m-0 mb-4">
          {config?.oidc?.clientId
            ? "Redirecting to your bank identity provider…"
            : "OIDC not configured — set OIDC_CLIENT_ID and OIDC_ISSUER on the server."}
        </p>
        {!isOidc && (
          <button type="button" className="btn text-[12px]" onClick={() => navigate("/")}>
            Continue in dev mode
          </button>
        )}
      </Card>
    </div>
  );
}
