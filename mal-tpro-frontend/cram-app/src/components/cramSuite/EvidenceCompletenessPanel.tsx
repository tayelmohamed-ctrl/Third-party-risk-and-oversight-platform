import type { EvidenceCheckItem } from "../../lib/cramDecisionFrame";

const STATUS_ICON: Record<string, string> = {
  complete: "✓",
  warn: "⚠",
  missing: "✕",
};

const STATUS_CLS: Record<string, string> = {
  complete: "cram-evidence--ok",
  warn: "cram-evidence--warn",
  missing: "cram-evidence--miss",
};

export default function EvidenceCompletenessPanel({
  items,
  completenessPct,
  poaOnFile,
  deviceIpCaptured,
  onPoaChange,
  onDeviceIpChange,
}: {
  items: EvidenceCheckItem[];
  completenessPct: number;
  poaOnFile: boolean;
  deviceIpCaptured: boolean;
  onPoaChange: (v: boolean) => void;
  onDeviceIpChange: (v: boolean) => void;
}) {
  const required = items.filter((i) => i.requiredForApprove);
  const complete = required.filter((i) => i.status === "complete").length;

  return (
    <section className="cram-evidence-block">
      <div className="cram-evidence-block__head">
        <div>
          <div className="cram-evidence-block__eyebrow">Minimum evidence standard</div>
          <h3 className="cram-evidence-block__title">Completeness checklist</h3>
          <p className="cram-evidence-block__hint">
            Approve vs escalate — operational standard for onboarding / periodic review
          </p>
        </div>
        <div className="cram-evidence-block__meter">
          <div className="cram-evidence-block__pct">{completenessPct}%</div>
          <div className="text-[10px] text-muted">{complete}/{required.length} required</div>
        </div>
      </div>

      <div className="cram-evidence-block__bar">
        <div className="cram-evidence-block__bar-fill" style={{ width: `${completenessPct}%` }} />
      </div>

      <ul className="cram-evidence-list">
        {items.map((item) => (
          <li key={item.id} className={`cram-evidence-item ${STATUS_CLS[item.status]}`}>
            <span className="cram-evidence-item__icon" aria-hidden>{STATUS_ICON[item.status]}</span>
            <div className="cram-evidence-item__body">
              <div className="cram-evidence-item__label">
                {item.label}
                {item.requiredForApprove && <span className="cram-evidence-item__req">required</span>}
              </div>
              <div className="cram-evidence-item__detail">{item.detail}</div>
            </div>
          </li>
        ))}
      </ul>

      <div className="cram-evidence-toggles">
        <label className="cram-evidence-toggle">
          <input type="checkbox" checked={poaOnFile} onChange={(e) => onPoaChange(e.target.checked)} />
          PoA on file (simulate)
        </label>
        <label className="cram-evidence-toggle">
          <input type="checkbox" checked={deviceIpCaptured} onChange={(e) => onDeviceIpChange(e.target.checked)} />
          Device / IP captured (simulate)
        </label>
      </div>
    </section>
  );
}
