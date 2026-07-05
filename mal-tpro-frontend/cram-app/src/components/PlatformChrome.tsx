import { Link, useLocation } from "react-router-dom";
import { Moon, Sun, ArrowLeftRight } from "lucide-react";
import { usePlatformTheme } from "../context/PlatformThemeContext";
import { PerimeterSwitch } from "./dashboard/executive/PerimeterBar";
import clsx from "clsx";

type Props = {
  variant: "cram" | "partner";
};

export default function PlatformChrome({ variant }: Props) {
  const { theme, toggleTheme } = usePlatformTheme();
  const location = useLocation();
  const onPartner = location.pathname.startsWith("/partner");

  const shell = clsx(
    "inline-flex items-center gap-2 rounded-full border text-[11px] font-semibold",
    variant === "partner"
      ? "fixed top-3 right-3 z-[45] px-2 py-1.5 shadow-lg backdrop-blur-md border-[rgba(139,92,246,.25)]"
      : "px-2.5 py-1 border-line bg-panel2",
    variant === "partner" && theme === "dark"
      ? "bg-[rgba(21,25,35,.92)] text-[#f3f4f6]"
      : variant === "partner"
        ? "bg-[rgba(255,255,255,.94)] text-[#111827]"
        : "text-muted",
  );

  const linkClass = clsx(
    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition",
    variant === "partner" && theme === "dark"
      ? "hover:bg-[rgba(139,92,246,.15)]"
      : "hover:bg-[rgba(139,92,246,.08)]",
  );

  const activeClass =
    variant === "partner" && theme === "dark"
      ? "bg-[rgba(139,92,246,.22)] text-[#c4b5fd]"
      : "bg-[rgba(139,92,246,.12)] text-[#7c3aed]";

  return (
    <div className={shell} role="toolbar" aria-label="Platform navigation">
      <Link
        to="/"
        className={clsx(linkClass, !onPartner && activeClass)}
        title="FinCrime OS — CRAM regulatory, investigation & reporting"
      >
        FinCrime OS
      </Link>
      <span className="opacity-40" aria-hidden>
        |
      </span>
      <Link
        to="/partner"
        className={clsx(linkClass, onPartner && activeClass)}
        title="Partner Oversight — onboarding, management oversight & audit"
      >
        Partner Oversight
      </Link>
      <span className="opacity-40" aria-hidden>
        |
      </span>
      {!onPartner && (
        <>
          <PerimeterSwitch compact />
          <span className="opacity-40 max-lg:hidden" aria-hidden>
            |
          </span>
        </>
      )}
      <button
        type="button"
        className={clsx(linkClass, "border-none cursor-pointer bg-transparent font-inherit")}
        onClick={toggleTheme}
        title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      >
        {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        <span className="max-sm:hidden">{theme === "dark" ? "Light" : "Dark"}</span>
        <ArrowLeftRight size={12} className="opacity-50 max-sm:hidden" aria-hidden />
      </button>
    </div>
  );
}
