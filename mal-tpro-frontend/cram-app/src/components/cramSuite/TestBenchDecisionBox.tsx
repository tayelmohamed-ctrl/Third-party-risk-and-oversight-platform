import { useState } from "react";
import type { DecisionFrame, HumanDecisionAction, EvidenceCheckItem } from "../../lib/cramDecisionFrame";
import { DecisionSummaryBlock, EvidenceProgressBlock } from "./CramWorkspaceSections";

const ACTION_TONE: Record<string, string> = {
  Approve: "approve",
  Review: "review",
  Reject: "reject",
  "Accept with conditions": "conditional",
};

export interface RecordedBenchDecision {
  action: HumanDecisionAction;
  rationale: string;
  recordedAt: string;
  recordedBy: string;
}

export default function TestBenchDecisionBox({
  frame,
  disabled,
  recorded,
  onRecordDecision,
  customerName,
  customerId,
  rating,
  requiredAction,
  approver,
  confidencePct,
  evidenceItems,
  evidenceCompletenessPct,
}: {
  frame: DecisionFrame;
  disabled?: boolean;
  recorded: RecordedBenchDecision | null;
  onRecordDecision: (decision: RecordedBenchDecision) => void;
  customerName: string;
  customerId: string;
  rating: string;
  requiredAction: string;
  approver: string;
  confidencePct: number;
  evidenceItems: EvidenceCheckItem[];
  evidenceCompletenessPct: number;
}) {
  const [rationale, setRationale] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [pending, setPending] = useState<HumanDecisionAction | null>(null);

  const tone = ACTION_TONE[frame.recommendedAction] ?? "review";
  const isPrimaryApprove = frame.recommendedAction === "Approve";
  const isPrimaryConditional = frame.recommendedAction === "Accept with conditions";

  function record(action: HumanDecisionAction) {
    if (disabled) return;
    const trimmed = rationale.trim();
    if (trimmed.length < 20) {
      setPending(action);
      setShowNotes(true);
      return;
    }
    setPending(null);
    onRecordDecision({
      action,
      rationale: trimmed,
      recordedAt: new Date().toISOString(),
      recordedBy: "Human approver (test bench)",
    });
  }

  return (
    <div className="cram-decision-box">
      <div className={`cram-decision-box__hero cram-decision-box__hero--${tone}`}>
        <div className="cram-decision-box__hero-label">Recommended decision</div>
        <div className="cram-decision-box__hero-action">{frame.recommendedAction.toUpperCase()}</div>
        <div className="cram-decision-box__hero-confidence">
          Confidence <strong>{confidencePct}%</strong>
        </div>
        <p className="cram-decision-box__hero-rationale">{frame.actionRationale}</p>
      </div>

      <div className="cram-decision-box__section">
        <EvidenceProgressBlock items={evidenceItems} completenessPct={evidenceCompletenessPct} />
      </div>

      {frame.mandatoryEscalations.length > 0 && (
        <div className="cram-decision-box__section cram-decision-box__escalations">
          <div className="cram-decision-box__section-title">Mandatory escalations</div>
          <ul>
            {frame.mandatoryEscalations.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="cram-decision-box__section">
        <div className="cram-decision-box__section-title">Decision summary</div>
        <DecisionSummaryBlock
          customerName={customerName}
          customerId={customerId}
          rating={rating}
          requiredAction={requiredAction}
          missingEvidence={frame.missingEvidence}
          approver={approver}
          recommendation={frame.recommendedAction}
        />
      </div>

      <div className="cram-decision-box__section">
        <button
          type="button"
          className="cram-decision-box__notes-toggle"
          onClick={() => setShowNotes((v) => !v)}
        >
          {showNotes ? "▾ Hide approver notes" : "▸ Add approver notes (audit trail)"}
        </button>
        {showNotes && (
          <textarea
            className="input cram-decision-box__notes"
            placeholder="Document rationale for audit (min 20 characters)…"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            disabled={disabled}
          />
        )}
        {pending && (
          <div className="cram-decision-box__notes-hint">Min 20 characters required for audit trail.</div>
        )}
      </div>

      <div className="cram-decision-box__actions">
        <button
          type="button"
          className={`cram-decision-box__btn cram-decision-box__btn--primary ${isPrimaryApprove ? "cram-decision-box__btn--emphasis" : ""}`}
          disabled={disabled}
          onClick={() => record("Approve")}
        >
          Approve
        </button>
        <button
          type="button"
          className={`cram-decision-box__btn cram-decision-box__btn--secondary ${isPrimaryConditional ? "cram-decision-box__btn--emphasis-secondary" : ""}`}
          disabled={disabled}
          onClick={() => record("Accept with conditions")}
        >
          Accept with conditions
        </button>
        <button
          type="button"
          className="cram-decision-box__btn cram-decision-box__btn--danger"
          disabled={disabled}
          onClick={() => record("Reject")}
        >
          Reject
        </button>
      </div>

      {recorded && (
        <div className="cram-decision-box__recorded">
          <strong>{recorded.action}</strong> recorded · {recorded.recordedAt.slice(0, 16).replace("T", " ")}
        </div>
      )}
    </div>
  );
}
