import { lazy, Suspense, useEffect } from "react";
import PlatformChrome from "../components/PlatformChrome";
import { usePlatformTheme } from "../context/PlatformThemeContext";
import "../styles/partner-theme.css";

const PartnerApp = lazy(() => import("../../partner/Mal_ThirdParty_Risk_Oversight_Platform.jsx"));

export default function PartnerPlatformPage() {
  const { theme } = usePlatformTheme();

  useEffect(() => {
    document.title = "Mal · Partner Defense Command";
    return () => {
      document.title = "Mal FinCrime OS — CRAM Console";
    };
  }, []);

  return (
    <div className="partner-platform-root" data-theme={theme} style={{ minHeight: "100vh", paddingTop: 52 }}>
      <PlatformChrome variant="partner" />
      <Suspense
        fallback={
          <div
            style={{
              display: "grid",
              placeItems: "center",
              minHeight: "100vh",
              fontFamily: "Inter, system-ui, sans-serif",
              color: theme === "dark" ? "#9ca3af" : "#6b7280",
              background: theme === "dark" ? "#0c0f1a" : "#eef1fa",
            }}
          >
            Loading Partner Oversight…
          </div>
        }
      >
        <PartnerApp />
      </Suspense>
    </div>
  );
}
