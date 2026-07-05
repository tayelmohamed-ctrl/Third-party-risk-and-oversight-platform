import type { ReactNode } from "react";
import type { ScoreDriverPlain, EvidenceCheckItem } from "../../lib/cramDecisionFrame";
import type { GoldenThreadResult } from "../../engine/goldenThread";
import type { ScoreResult } from "../../engine/types";

const RATING_COLOR: Record<string, string> = {
  Low: "#2FD8A6",
  Medium: "#F6A623",
  High: "#FF5C77",
  Prohibited: "#FF5C77",
};

export function WorkspaceSection({
  title,
  subtitle,
  accent = "default",
  children,
}: {
  title: string;
  subtitle?: string;
  accent?: "default" | "info" | "success" | "warning" | "danger";
  children: React.ReactNode;
}) {
  return (
    <section className={`cram-ws-section cram-ws-section--${accent}`}>
      <header className="cram-ws-section__head">
        <h3 className="cram-ws-section__title">{title}</h3>
        {subtitle && <p className="cram-ws-section__subtitle">{subtitle}</p>}
      </header>
      <div className="cram-ws-section__body">{children}</div>
    </section>
  );
}

export function CustomerIdentityBlock({
  mode,
  name,
  customerId,
  segment,
  relationship,
}: {
  mode: "individual" | "entity";
  name: string;
  customerId: string;
  segment: string;
  relationship: string;
}) {
  return (
    <div className="cram-ws-customer">
      <div className="cram-ws-customer__avatar" aria-hidden>{mode === "entity" ? "🏢" : "🧑"}</div>
      <div>
        <div className="cram-ws-customer__eyebrow">{mode === "entity" ? "Legal person" : "Natural person"}</div>
        <h2 className="cram-ws-customer__name">{name || "—"}</h2>
        <div className="cram-ws-customer__meta">
          <span>{customerId || "—"}</span>
          <span className="cram-ws-customer__dot">·</span>
          <span>{segment}</span>
          <span className="cram-ws-customer__dot">·</span>
          <span>{relationship}</span>
        </div>
      </div>
    </div>
  );
}

export function RiskMeterBlock({
  result,
  confidencePct,
  evidencePct,
  trendDelta,
}: {
  result: ScoreResult | null;
  confidencePct: number;
  evidencePct: number;
  trendDelta: number;
}) {
  const rating = result?.finalRating ?? "—";
  const score100 = result ? Math.round((result.composite / 3) * 100) : 0;
  const barColor = RATING_COLOR[String(rating)] ?? "#6E72A6";
  const trendLabel = trendDelta > 0
    ? `↑ ${trendDelta} since onboarding`
    : trendDelta < 0
      ? `↓ ${Math.abs(trendDelta)} since onboarding`
      : "Stable since onboarding";

  return (
    <div className="cram-ws-risk-meter">
      <div className="cram-ws-risk-meter__main">
        <div className="cram-ws-risk-meter__label">Risk</div>
        <div className="cram-ws-risk-meter__bar-wrap">
          <div
            className="cram-ws-risk-meter__bar-fill"
            style={{ width: `${score100}%`, background: barColor }}
          />
        </div>
        <div className="cram-ws-risk-meter__score-row">
          <span className="cram-ws-risk-meter__score">{result ? score100 : "—"}</span>
          <span className={`cram-ws-risk-meter__band cram-ws-risk-meter__band--${String(rating).toLowerCase()}`}>
            {rating}
          </span>
        </div>
        {result && (
          <div className={`cram-ws-risk-meter__trend ${trendDelta > 0 ? "cram-ws-risk-meter__trend--up" : trendDelta < 0 ? "cram-ws-risk-meter__trend--down" : ""}`}>
            {trendLabel}
          </div>
        )}
      </div>
      <div className="cram-ws-risk-meter__metrics">
        <MetricPill label="Confidence" value={`${confidencePct}%`} tone={confidencePct >= 90 ? "success" : confidencePct >= 75 ? "warning" : "danger"} />
        <MetricPill label="Evidence complete" value={`${evidencePct}%`} tone={evidencePct >= 90 ? "success" : evidencePct >= 75 ? "warning" : "danger"} />
      </div>
    </div>
  );
}

function MetricPill({ label, value, tone }: { label: string; value: string; tone: "success" | "warning" | "danger" }) {
  return (
    <div className={`cram-ws-metric cram-ws-metric--${tone}`}>
      <div className="cram-ws-metric__label">{label}</div>
      <div className="cram-ws-metric__value">{value}</div>
    </div>
  );
}

export function TopDriversBlock({ drivers }: { drivers: ScoreDriverPlain[] }) {
  if (!drivers.length) return null;
  return (
    <ul className="cram-ws-drivers">
      {drivers.slice(0, 5).map((d, i) => (
        <li key={`${d.label}-${i}`} className="cram-ws-drivers__item">
          <span className="cram-ws-drivers__arrow" aria-hidden>↑</span>
          <span className="cram-ws-drivers__label">{d.label}</span>
        </li>
      ))}
    </ul>
  );
}

export function WhyScoreBlock({ rating, drivers }: { rating: string; drivers: ScoreDriverPlain[] }) {
  if (!drivers.length) return null;
  return (
    <div className="cram-ws-why">
      <p className="cram-ws-why__lead">{rating} risk — key factors driving the assessment.</p>
      <ul className="cram-ws-why__list">
        {drivers.map((d, i) => (
          <li key={`${d.label}-${i}`}>
            <strong>{d.label}</strong>
            <span>{d.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MitigationsBlock({ tips }: { tips: string[] }) {
  if (!tips.length) return null;
  return (
    <ul className="cram-ws-mitigations">
      {tips.map((tip) => (
        <li key={tip}>{tip}</li>
      ))}
    </ul>
  );
}

export function VerificationStatusBlock({
  kycPassed,
  screeningClear,
  cramFeedClear,
  tmFeedClear,
  lastUpdated,
}: {
  kycPassed: boolean;
  screeningClear: boolean;
  cramFeedClear: boolean;
  tmFeedClear: boolean;
  lastUpdated: string;
}) {
  const items = [
    { label: "KYC", ok: kycPassed },
    { label: "Screening", ok: screeningClear },
    { label: "CRAM Feed", ok: cramFeedClear },
    { label: "Transaction Feed", ok: tmFeedClear },
  ];
  return (
    <div className="cram-ws-verify">
      <ul className="cram-ws-verify__list">
        {items.map((item) => (
          <li key={item.label} className={item.ok ? "cram-ws-verify__item--ok" : "cram-ws-verify__item--miss"}>
            <span className="cram-ws-verify__icon">{item.ok ? "✓" : "✕"}</span>
            {item.label}
          </li>
        ))}
      </ul>
      <div className="cram-ws-verify__updated">Last updated · {lastUpdated}</div>
    </div>
  );
}

export function EvidenceProgressBlock({
  items,
  completenessPct,
}: {
  items: EvidenceCheckItem[];
  completenessPct: number;
}) {
  const required = items.filter((i) => i.requiredForApprove);
  const complete = required.filter((i) => i.status === "complete").length;
  const missing = required.filter((i) => i.status !== "complete");

  return (
    <div className="cram-ws-evidence">
      <div className="cram-ws-evidence__head">
        <span>Evidence</span>
        <span className="cram-ws-evidence__count">{complete} of {required.length} complete</span>
      </div>
      <div className="cram-ws-evidence__bar">
        <div className="cram-ws-evidence__bar-fill" style={{ width: `${completenessPct}%` }} />
      </div>
      {missing.length > 0 && (
        <div className="cram-ws-evidence__missing">
          <span className="cram-ws-evidence__missing-label">Missing</span>
          <ul>
            {missing.map((m) => (
              <li key={m.id}>{m.label}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function DecisionSummaryBlock({
  customerName,
  customerId,
  rating,
  requiredAction,
  missingEvidence,
  approver,
  recommendation,
}: {
  customerName: string;
  customerId: string;
  rating: string;
  requiredAction: string;
  missingEvidence: string[];
  approver: string;
  recommendation: string;
}) {
  const rows = [
    ["Customer", `${customerName} (${customerId})`],
    ["Current risk", rating],
    ["Required action", requiredAction],
    ["Missing evidence", missingEvidence.length ? missingEvidence.join(", ") : "None"],
    ["Approver", approver],
    ["Recommendation", recommendation],
  ] as const;

  return (
    <dl className="cram-ws-decision-summary">
      {rows.map(([k, v]) => (
        <div key={k} className="cram-ws-decision-summary__row">
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function computeRiskConfidence(
  evidencePct: number,
  dqReady: boolean,
  screeningClear: boolean,
  hasResult: boolean,
): number {
  let c = evidencePct;
  if (dqReady) c += 3;
  if (screeningClear) c += 3;
  if (hasResult) c += 2;
  return Math.min(100, Math.max(0, c));
}

export function computeTrendDelta(result: ScoreResult | null, expectedBand: number): number {
  if (!result) return 0;
  const score100 = Math.round((result.composite / 3) * 100);
  const baseline = Math.round((expectedBand / 3) * 100);
  return score100 - baseline;
}

export function approverFromGt(gt: GoldenThreadResult | null): string {
  if (!gt?.approval.who) return "Standard approver";
  return gt.approval.who.replace(" required", "");
}
