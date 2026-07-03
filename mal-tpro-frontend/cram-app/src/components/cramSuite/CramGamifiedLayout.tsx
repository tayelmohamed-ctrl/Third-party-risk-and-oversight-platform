import type { ReactNode } from "react";
import type { CustomerMode } from "../../engine/cramSuiteConfig";
import type { DataQualityVerdict } from "../../engine/dataQualityGate";
import type { KycQualityContext } from "../../engine/dataQualityGate";
import type { ScoreResult } from "../../engine/types";
import type { GoldenThreadResult } from "../../engine/goldenThread";
import type { RiskAssessmentSummary } from "../../engine/riskExplainability";

const SECTION_THEMES = {
  kyc: { accent: "#39B9ED", icon: "🛡️", label: "00" },
  identity: { accent: "#5B8DEF", icon: "👤", label: "01" },
  geography: { accent: "#2FD8A6", icon: "🌍", label: "02" },
  drivers: { accent: "#F6A623", icon: "⚡", label: "03" },
  controls: { accent: "#39B9ED", icon: "⭐", label: "04" },
} as const;

export type CramSectionKey = keyof typeof SECTION_THEMES;

export function CramGamifiedShell({
  mode,
  name,
  customerId,
  segment,
  relationship,
  dq,
  kyc,
  result,
  gt,
  riskSummary,
  screeningSanctions,
  screeningWatchlist,
  partnerMsg,
  children,
}: {
  mode: CustomerMode;
  name: string;
  customerId: string;
  segment: string;
  relationship: string;
  dq: DataQualityVerdict;
  kyc: KycQualityContext;
  result: ScoreResult | null;
  gt: GoldenThreadResult | null;
  riskSummary: RiskAssessmentSummary | null;
  screeningSanctions: string;
  screeningWatchlist: string;
  partnerMsg: string;
  children: ReactNode;
}) {
  const isEntity = mode === "entity";
  const rating = result?.finalRating ?? "—";
  const scorePct = result ? Math.round((result.composite / 3) * 100) : 0;
  const gaugeColor = rating === "Prohibited" || rating === "High" ? "#FF5C77"
    : rating === "Medium" ? "#F6A623" : "#2FD8A6";

  const tmAlert = partnerMsg.toLowerCase().includes("oscilar") || partnerMsg.toLowerCase().includes("tm");
  const listHit = screeningSanctions !== "Clear" || screeningWatchlist !== "Clear";

  return (
    <div className={`cram-card cram-card--${mode}`}>
      <header className="cram-card__header">
        <div className="cram-card__hero">
          <div className="cram-card__avatar" aria-hidden>
            {isEntity ? "🏢" : "🧑"}
          </div>
          <div className="cram-card__identity">
            <div className="cram-card__eyebrow">{isEntity ? "ENTITY CRAM CARD" : "INDIVIDUAL CRAM CARD"}</div>
            <h2 className="cram-card__name">{name || "—"}</h2>
            <div className="cram-card__meta">
              <span>{isEntity ? "Legal Person" : "Natural Person"}</span>
              <span className="cram-card__dot">·</span>
              <span className="mono">{customerId || "—"}</span>
            </div>
            <div className="cram-card__badges">
              <span className={`cram-pill ${ratingPillClass(rating)}`}>{rating} risk</span>
              <span className="cram-pill cram-pill--muted">{segment}</span>
              <span className="cram-pill cram-pill--muted">{relationship}</span>
            </div>
          </div>
        </div>
        <div className="cram-card__gauge-wrap">
          <CramScoreGauge value={scorePct} color={gaugeColor} label={result ? result.finalRating : "—"} />
          <div className="cram-card__gauge-caption">{result ? `${result.composite.toFixed(2)}/3 composite` : "Awaiting DQ gate"}</div>
        </div>
      </header>

      <div className="cram-card__status-row">
        <StatusChip ok={dq.status === "READY"} label="KYC data quality" value={dq.status === "READY" ? "Passed" : "Blocked"} />
        <StatusChip ok={screeningSanctions === "Clear" && screeningWatchlist === "Clear"} label="Screening" value={screeningSanctions === "Clear" ? "Clear" : screeningSanctions} />
        <StatusChip ok label="Last KYC refresh" value={kyc.lastKycRefreshAt || "—"} />
        <StatusChip ok label="Last screening" value={kyc.screeningCompletedAt ? kyc.screeningCompletedAt.slice(0, 10) : "—"} />
      </div>

      <div className="cram-card__pipeline">
        <PipelineStep done={!!kyc.identityVerified} label="1a KYC Capture" />
        <PipelineStep done={screeningSanctions === "Clear"} label="1b Screening (Shufti)" />
        <PipelineStep done={dq.status === "READY" && !!result} label="2 TM & CRAM Feed (Oscilar)" highlight={tmAlert} />
      </div>

      {(tmAlert || listHit) && (
        <div className="cram-card__alerts">
          {tmAlert && <span className="cram-alert cram-alert--tm">⚡ TM ALERT: High</span>}
          {listHit && <span className="cram-alert cram-alert--hit">⛔ LIST HIT: {screeningSanctions !== "Clear" ? screeningSanctions : "Watchlist"}</span>}
        </div>
      )}

      <div className="cram-card__body">{children}</div>

      {riskSummary && gt && (
        <footer className="cram-card__footer">
          <div className="cram-card__footer-score">
            <span className="cram-card__trophy" aria-hidden>🏆</span>
            <div>
              <div className="cram-card__footer-num">{Math.round((riskSummary.inherentScore / 3) * 100)}<small>/100</small></div>
              <div className="cram-card__stars" aria-hidden>{"★".repeat(rating === "High" || rating === "Prohibited" ? 4 : rating === "Medium" ? 3 : 2)}{"☆".repeat(rating === "Low" ? 3 : 1)}</div>
            </div>
          </div>
          <div className="cram-card__takeaway">
            <span className="cram-card__target" aria-hidden>🎯</span>
            <div>
              <div className="cram-card__takeaway-label">Key takeaway</div>
              <p className="cram-card__takeaway-text">{`${gt.dueDiligence} · ${gt.approval.who} · ${gt.monitoringIntensity} monitoring`}</p>
            </div>
          </div>
        </footer>
      )}

      <div className="cram-card__legend">
        <span>{dq.status === "READY" ? "✓ Data quality gate passed" : "⛔ Data quality gate blocked"}</span>
        <span>{result ? "✓ Scoring enabled" : "— Scoring pending"}</span>
        <span>{gt?.eddRequired ? "⚠ Review required" : "✓ Standard path"}</span>
      </div>
    </div>
  );
}

export function GamifiedSec({
  section,
  title,
  hint,
  scoreBadge,
  children,
}: {
  section: CramSectionKey;
  title: string;
  hint?: string;
  scoreBadge?: string;
  children: ReactNode;
}) {
  const theme = SECTION_THEMES[section];
  return (
    <section className={`cram-sec cram-sec--${section}`} style={{ "--sec-accent": theme.accent } as React.CSSProperties}>
      <div className="cram-sec__head">
        <div className="cram-sec__icon" aria-hidden>{theme.icon}</div>
        <div className="cram-sec__titles">
          <div className="cram-sec__num">{theme.label}</div>
          <h3 className="cram-sec__title">{title}</h3>
          {hint && <div className="cram-sec__hint">{hint}</div>}
        </div>
        {scoreBadge && <div className="cram-sec__badge">{scoreBadge}</div>}
      </div>
      <div className="cram-sec__content">{children}</div>
    </section>
  );
}

export function ControlStars({ value }: { value: number }) {
  const stars = Math.max(1, Math.min(5, Math.round((value / 3) * 5)));
  return (
    <span className="cram-stars" aria-label={`${stars} of 5 stars`}>
      {"★".repeat(stars)}{"☆".repeat(5 - stars)}
    </span>
  );
}

export function DriverChip({ icon, label, value, hot }: { icon: string; label: string; value: string; hot?: boolean }) {
  return (
    <div className={`cram-driver ${hot ? "cram-driver--hot" : ""}`}>
      <span className="cram-driver__icon" aria-hidden>{icon}</span>
      <span className="cram-driver__label">{label}</span>
      <span className="cram-driver__value">{value}</span>
    </div>
  );
}

function ratingPillClass(rating: string): string {
  const r = rating.toLowerCase();
  if (r === "high" || r === "prohibited") return "cram-pill--high";
  if (r === "medium") return "cram-pill--medium";
  if (r === "low") return "cram-pill--low";
  return "cram-pill--muted";
}

function StatusChip({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <div className={`cram-status-chip ${ok ? "cram-status-chip--ok" : "cram-status-chip--warn"}`}>
      <span className="cram-status-chip__label">{label}</span>
      <span className="cram-status-chip__value">{value}</span>
    </div>
  );
}

function PipelineStep({ done, label, highlight }: { done: boolean; label: string; highlight?: boolean }) {
  return (
    <div className={`cram-pipeline-step ${done ? "cram-pipeline-step--done" : ""} ${highlight ? "cram-pipeline-step--alert" : ""}`}>
      <span className="cram-pipeline-step__dot">{done ? "✓" : "○"}</span>
      <span>{label}</span>
    </div>
  );
}

function CramScoreGauge({ value, color, label }: { value: number; color: string; label: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  const angle = -90 + (clamped / 100) * 180;
  return (
    <div className="cram-gauge" style={{ "--gauge-color": color } as React.CSSProperties}>
      <svg viewBox="0 0 120 70" className="cram-gauge__svg">
        <path d="M 12 60 A 48 48 0 0 1 108 60" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="10" strokeLinecap="round" />
        <path
          d="M 12 60 A 48 48 0 0 1 108 60"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * 151} 151`}
        />
        <line x1="60" y1="60" x2="60" y2="22" stroke={color} strokeWidth="3" strokeLinecap="round"
          transform={`rotate(${angle} 60 60)`} />
        <circle cx="60" cy="60" r="5" fill={color} />
      </svg>
      <div className="cram-gauge__value">{clamped}<small>/100</small></div>
      <div className="cram-gauge__label">{label}</div>
    </div>
  );
}

export function sectionScoreBadge(result: ScoreResult | null, factorKey: string, max = 25): string | undefined {
  if (!result) return undefined;
  const f = result.factors.find((x) => x.key === factorKey);
  if (!f) return undefined;
  const pts = Math.round((f.score / 3) * max);
  return `${pts}/${max}`;
}

export function controlsScoreBadge(controls: Record<string, number>, max = 20): string {
  const vals = Object.values(controls);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return `${Math.round((avg / 3) * max)}/${max}`;
}
