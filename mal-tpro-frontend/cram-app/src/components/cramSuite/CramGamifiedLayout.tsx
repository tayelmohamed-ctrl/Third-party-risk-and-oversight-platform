import type { ReactNode } from "react";
import type { CustomerMode } from "../../engine/cramSuiteConfig";
import type { DataQualityVerdict } from "../../engine/dataQualityGate";
import type { KycQualityContext } from "../../engine/dataQualityGate";
import type { ScoreResult } from "../../engine/types";
import type { GoldenThreadResult } from "../../engine/goldenThread";
import type { RiskAssessmentSummary } from "../../engine/riskExplainability";
import type { DecisionFrame } from "../../lib/cramDecisionFrame";
import {
  WorkspaceSection,
  CustomerIdentityBlock,
  RiskMeterBlock,
  TopDriversBlock,
  WhyScoreBlock,
  MitigationsBlock,
  VerificationStatusBlock,
} from "./CramWorkspaceSections";

export type CramSectionKey = "kyc" | "identity" | "geography" | "drivers" | "controls" | "products" | "corridor" | "screening";

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
  decisionFrame,
  evidenceCompletenessPct,
  riskConfidencePct,
  trendDelta,
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
  decisionFrame: DecisionFrame | null;
  evidenceCompletenessPct: number;
  riskConfidencePct: number;
  trendDelta: number;
  children: ReactNode;
}) {
  const rating = result?.finalRating ?? "—";
  const tmAlert = partnerMsg.toLowerCase().includes("oscilar") || partnerMsg.toLowerCase().includes("tm");
  const screeningClear = screeningSanctions === "Clear" && screeningWatchlist === "Clear";
  const lastUpdated = kyc.screeningCompletedAt
    ? new Date(kyc.screeningCompletedAt).toLocaleDateString()
    : "Today";

  return (
    <div className={`cram-workspace cram-workspace--${mode}`}>
      <WorkspaceSection title="Customer" accent="info">
        <CustomerIdentityBlock
          mode={mode}
          name={name}
          customerId={customerId}
          segment={segment}
          relationship={relationship}
        />
      </WorkspaceSection>

      {result && (
        <WorkspaceSection title="Risk summary" subtitle="Current inherent assessment">
          <RiskMeterBlock
            result={result}
            confidencePct={riskConfidencePct}
            evidencePct={evidenceCompletenessPct}
            trendDelta={trendDelta}
          />
          {decisionFrame && decisionFrame.topDrivers.length > 0 && (
            <div className="cram-ws-subblock">
              <div className="cram-ws-subblock__label">Top drivers</div>
              <TopDriversBlock drivers={decisionFrame.topDrivers} />
            </div>
          )}
        </WorkspaceSection>
      )}

      {decisionFrame && decisionFrame.topDrivers.length > 0 && (
        <WorkspaceSection title="Why this score?" accent="info">
          <WhyScoreBlock rating={String(rating)} drivers={decisionFrame.topDrivers} />
        </WorkspaceSection>
      )}

      {decisionFrame && decisionFrame.scoreReductionTips.length > 0 && (
        <WorkspaceSection title="Risk mitigation opportunities" accent="warning">
          <MitigationsBlock tips={decisionFrame.scoreReductionTips} />
        </WorkspaceSection>
      )}

      <WorkspaceSection title="Verification status" accent="success">
        <VerificationStatusBlock
          kycPassed={dq.status === "READY" && kyc.identityVerified}
          screeningClear={screeningClear}
          cramFeedClear={dq.status === "READY" && !!result}
          tmFeedClear={!tmAlert}
          lastUpdated={lastUpdated}
        />
        {(tmAlert || !screeningClear) && (
          <div className="cram-ws-alerts">
            {!screeningClear && <span className="cram-ws-alert cram-ws-alert--danger">Screening requires attention</span>}
            {tmAlert && <span className="cram-ws-alert cram-ws-alert--warning">Transaction monitoring alert active</span>}
          </div>
        )}
      </WorkspaceSection>

      <div className="cram-ws-form-divider">
        <span>Assessment inputs</span>
      </div>

      <div className="cram-ws-form">{children}</div>

      {riskSummary && gt && (
        <footer className="cram-ws-footer">
          <span>{gt.dueDiligence}</span>
          <span>·</span>
          <span>{gt.approval.who}</span>
          <span>·</span>
          <span>{gt.monitoringIntensity} monitoring</span>
        </footer>
      )}
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
  return (
    <section className={`cram-sec cram-sec--${section}`}>
      <div className="cram-sec__head">
        <div className="cram-sec__titles">
          <h3 className="cram-sec__title">{title}</h3>
          {hint && <div className="cram-sec__hint">{hint}</div>}
        </div>
        {scoreBadge && <div className="cram-sec__badge">{scoreBadge}</div>}
      </div>
      <div className="cram-sec__content">{children}</div>
    </section>
  );
}

export function DriverChip({ icon, label, value, hot }: { icon: string; label: string; value: string; hot?: boolean }) {
  return (
    <div className={`cram-driver-chip ${hot ? "cram-driver-chip--hot" : ""}`}>
      <span className="cram-driver-chip__icon" aria-hidden>{icon}</span>
      <div>
        <div className="cram-driver-chip__label">{label}</div>
        <div className="cram-driver-chip__value">{value}</div>
      </div>
    </div>
  );
}

export function ControlStars({ value }: { value: number }) {
  return (
    <span className="cram-control-stars" aria-label={`Control level ${value} of 3`}>
      {"★".repeat(value)}{"☆".repeat(3 - value)}
    </span>
  );
}

export function sectionScoreBadge(
  result: ScoreResult | null,
  factorKey: string,
  weightPct?: number,
): string | undefined {
  if (!result) return undefined;
  const factor = result.factors.find((f) => f.key === factorKey);
  if (!factor) return undefined;
  return weightPct ? `${factor.score}/3 · ${weightPct}% wt` : `${factor.score}/3`;
}

export function controlsScoreBadge(controls: Record<string, number>): string {
  const avg = Object.values(controls).reduce((a, b) => a + b, 0) / Object.values(controls).length;
  return `Avg ${avg.toFixed(1)}/3`;
}
