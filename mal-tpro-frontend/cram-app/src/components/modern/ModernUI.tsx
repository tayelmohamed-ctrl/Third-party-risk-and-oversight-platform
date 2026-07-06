/**
 * Mal FinCrime OS — enterprise design system primitives.
 * Presentation layer only — no business logic.
 */
import { type ReactNode } from "react";
export type { LucideIcon } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type BadgeVariant = "low" | "medium" | "high" | "prohibited" | "purple" | "cyan" | "muted" | "active";

// ─── Badge styles ─────────────────────────────────────────────────────────────

const BADGE: Record<BadgeVariant, string> = {
  low:        "bg-[#2FD8A6]/15 text-[#2FD8A6]",
  medium:     "bg-[#F6A623]/15 text-[#F6A623]",
  high:       "bg-[#FF5C77]/15 text-[#FF5C77]",
  prohibited: "bg-[#B23A5B]/20 text-[#ff7ea0]",
  purple:     "bg-[#A953DF]/15 text-[#c9b6f5]",
  cyan:       "bg-[#39B9ED]/15 text-[#39B9ED]",
  muted:      "bg-[#26285C]/60 text-[#A7ACDB]",
  active:     "bg-[#2FD8A6]/15 text-[#2FD8A6]",
};

// ─── ModuleCard ───────────────────────────────────────────────────────────────

export function ModuleCard({
  icon, iconBg = "#A953DF", title, desc, meta, badge,
  badgeVariant = "purple", active = false, onClick,
}: {
  icon: ReactNode;
  iconBg?: string;
  title: string;
  desc: string;
  meta?: string;
  badge?: string;
  badgeVariant?: BadgeVariant;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative flex flex-col gap-3 p-4 rounded-2xl border text-left w-full",
        "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A953DF]",
        active
          ? "border-[#A953DF]/50 shadow-[0_0_32px_rgba(169,83,223,.1)] scale-[1.01]"
          : "border-[#26285C] hover:border-[#A953DF]/35 hover:shadow-[0_6px_28px_rgba(0,0,0,.32)] hover:scale-[1.01]",
      ].join(" ")}
      style={{ background: active ? "rgba(169,83,223,0.06)" : "#0A1130" }}
    >
      {/* Top accent line when active */}
      {active && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl"
          style={{ background: "linear-gradient(90deg,#A953DF,#39B9ED)" }}
        />
      )}

      {/* Left accent strip when active */}
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-4 bottom-4 w-[2px] rounded-r-full bg-[#A953DF]"
        />
      )}

      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
        style={{ background: `${iconBg}1A`, color: iconBg }}
      >
        {icon}
      </div>

      {/* Title + desc */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold font-display leading-snug text-[#F8F6FE]">
          {title}
        </div>
        <div className="text-[11px] text-[#A7ACDB] mt-1 leading-snug">{desc}</div>
      </div>

      {/* Footer metadata */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        {meta && (
          <span className="text-[10px] text-[#6E72A6] font-medium tabular-nums">{meta}</span>
        )}
        {badge && (
          <span className={`text-[9.5px] font-semibold rounded-full px-2 py-0.5 ml-auto ${BADGE[badgeVariant]}`}>
            {badge}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── ModuleGrid ───────────────────────────────────────────────────────────────

export function ModuleGrid({
  children, cols = 4,
}: {
  children: ReactNode;
  cols?: 2 | 3 | 4;
}) {
  const colClass =
    cols === 2 ? "sm:grid-cols-2" :
    cols === 3 ? "sm:grid-cols-2 lg:grid-cols-3" :
    "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  return (
    <div className={`grid grid-cols-1 ${colClass} gap-3 mb-5`}>
      {children}
    </div>
  );
}

// ─── HeroBar ──────────────────────────────────────────────────────────────────

export function HeroBar({
  title, sub,
  gradient = "linear-gradient(135deg,#0c1233 0%,#181c48 100%)",
  children,
}: {
  title: string;
  sub: string;
  gradient?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className="flex gap-4 items-center flex-wrap p-5 rounded-2xl border border-[#26285C] mb-5"
      style={{ background: gradient }}
    >
      <div className="min-w-0">
        <div className="font-display text-[18px] font-bold text-white leading-tight">{title}</div>
        <div className="text-[#A7ACDB] text-[12px] mt-1 leading-snug">{sub}</div>
      </div>
      {children && (
        <div className="ml-auto flex gap-5 items-center flex-wrap shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── HeroStat ─────────────────────────────────────────────────────────────────

export function HeroStat({
  label, value, color = "text-white",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="text-right">
      <div className="text-[10px] text-[#6E72A6] uppercase tracking-[0.08em] font-medium">{label}</div>
      <div className={`font-display text-[22px] font-bold leading-none mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}

// ─── StatGrid ─────────────────────────────────────────────────────────────────

export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      {children}
    </div>
  );
}

export function StatTile({
  label, value, color, sub,
}: {
  label: string;
  value: string;
  color?: string;
  sub?: string;
}) {
  return (
    <div className="p-3.5 rounded-xl border border-[#26285C] bg-[#10103C]">
      <div className="text-[9.5px] text-[#6E72A6] uppercase tracking-wide font-semibold mb-1">{label}</div>
      <div className={`font-display text-[20px] font-bold leading-none ${color ?? "text-white"}`}>{value}</div>
      {sub && <div className="text-[10px] text-[#A7ACDB] mt-1">{sub}</div>}
    </div>
  );
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="h-px flex-1 bg-[#26285C]" />
      <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#6E72A6]">
        {children}
      </span>
      <div className="h-px flex-1 bg-[#26285C]" />
    </div>
  );
}

// ─── ContentDivider ───────────────────────────────────────────────────────────

export function ContentDivider() {
  return <div className="h-px bg-[#1e2156] my-4" />;
}

// ─── PanelCard ────────────────────────────────────────────────────────────────

/** Elevated card variant — used for active/selected content panels */
export function PanelCard({
  children, className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#26285C] ${className}`}
      style={{ background: "#070d23" }}
    >
      {children}
    </div>
  );
}

// ─── TableHeaderCell ──────────────────────────────────────────────────────────

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <th className="text-left py-2.5 px-4 text-[9.5px] uppercase tracking-[0.12em] text-[#6E72A6] font-semibold border-b border-[#1e2156] bg-[#0c1130]">
      {children}
    </th>
  );
}

// ─── CaseCard ─────────────────────────────────────────────────────────────────

/** Used in case queue lists */
export function QueueItem({
  title, sub, badge, badgeVariant = "muted", active, onClick, right,
}: {
  title: string;
  sub?: string;
  badge?: string;
  badgeVariant?: BadgeVariant;
  active?: boolean;
  onClick?: () => void;
  right?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left px-4 py-3 border-b border-[#191b46] transition-colors",
        active
          ? "bg-[#A953DF]/10 border-l-2 border-l-[#A953DF]"
          : "hover:bg-[#0d1540]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-[#F8F6FE] leading-snug truncate">{title}</div>
          {sub && <div className="text-[10.5px] text-[#6E72A6] mt-0.5 truncate">{sub}</div>}
          {badge && (
            <span className={`inline-block text-[9px] font-semibold rounded-full px-1.5 py-0.5 mt-1 ${BADGE[badgeVariant]}`}>
              {badge}
            </span>
          )}
        </div>
        {right && <div className="shrink-0 text-right">{right}</div>}
      </div>
    </button>
  );
}

// ─── Step indicator (pipeline) ────────────────────────────────────────────────

export function StepCircle({
  n, label, sub, active, done, onClick,
}: {
  n: string;
  label: string;
  sub?: string;
  active?: boolean;
  done?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 min-w-[80px] cursor-pointer flex flex-col items-center gap-1.5 group"
    >
      <div
        className={[
          "w-10 h-10 rounded-full grid place-items-center mono text-[13px] border-2 transition-all duration-200",
          active
            ? "bg-[#A953DF] border-[#A953DF] text-white shadow-[0_0_20px_rgba(169,83,223,.45)]"
            : done
              ? "bg-[#2FD8A6]/10 border-[#2FD8A6] text-[#2FD8A6]"
              : "bg-[#0A1130] border-[#26285C] text-[#6E72A6] group-hover:border-[#A953DF]/40",
        ].join(" ")}
      >
        {n}
      </div>
      <div className={`text-center text-[10.5px] font-semibold font-display leading-tight ${active ? "text-white" : done ? "text-[#2FD8A6]" : "text-[#A7ACDB]"}`}>
        {label}
      </div>
      {sub && (
        <div className="text-center text-[9.5px] text-[#6E72A6]">{sub}</div>
      )}
    </button>
  );
}

// ─── ActionButton ─────────────────────────────────────────────────────────────

export function ActionButton({
  children, variant = "primary", disabled, onClick, className = "",
}: {
  children: ReactNode;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const styles = {
    primary: "bg-gradient-to-r from-[#A953DF] to-[#7C6CF7] text-white hover:opacity-90 border-transparent",
    ghost:   "bg-transparent border-[#26285C] text-[#A7ACDB] hover:bg-[#0d1540] hover:text-white hover:border-[#A953DF]/35",
    danger:  "bg-[rgba(255,92,119,.12)] border-[rgba(255,92,119,.35)] text-[#ff8ea7] hover:bg-[rgba(255,92,119,.2)]",
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-semibold border",
        "transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed",
        styles[variant],
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
