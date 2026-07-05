import type { RbmAssessmentResult } from "../../engine/rbm/types";
import { RatingPill, ratingColor } from "../ui";

interface Props {
  result: RbmAssessmentResult;
}

export default function RbmScoreBreakdown({ result }: Props) {
  return (
    <div className="rbm-breakdown space-y-4">
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-wider text-faint mb-1">Composite Risk Score</div>
        <div className="font-display text-4xl font-extrabold" style={{ color: ratingColor(result.compositeBand) }}>
          {result.compositeScore}
          <span className="text-lg text-muted font-normal"> /100</span>
        </div>
        <div className="mt-2 flex justify-center gap-2 flex-wrap">
          <RatingPill rating={result.compositeBand} />
          <span className="text-[11px] text-muted px-2 py-0.5 rounded-full border border-lineSoft">
            Residual {result.residualScore}
          </span>
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase text-faint mb-2">Breakdown</div>
        <div className="space-y-1.5">
          {result.components.map((c) => (
            <div key={c.key} className="rbm-breakdown__row">
              <span className="text-[11px] text-muted">{c.label}</span>
              <div className="flex items-center gap-2">
                <div className="rbm-breakdown__bar">
                  <div
                    className="rbm-breakdown__bar-fill"
                    style={{
                      width: `${Math.min(100, Math.abs(c.contribution) / Math.max(c.weight, 1) * 100)}%`,
                      opacity: c.contribution < 0 ? 0.5 : 1,
                    }}
                  />
                </div>
                <span className="text-[11px] font-mono font-semibold text-ink w-8 text-right">
                  {c.contribution > 0 ? "+" : ""}{c.contribution}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {result.why.length > 0 && (
        <div>
          <div className="text-[10px] uppercase text-faint mb-2">Why?</div>
          <ul className="m-0 pl-4 space-y-1 text-[11px] text-muted">
            {result.why.map((w) => (
              <li key={w} className="flex gap-1.5">
                <span className="text-low shrink-0">✔</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.overrides.length > 0 && (
        <div className="text-[10px] px-2 py-2 rounded-lg bg-panel2 space-y-1">
          <div className="uppercase text-faint font-semibold">Rules fired</div>
          {result.overrides.map((o) => (
            <div key={o.id} className="text-muted">
              <span className="font-mono text-ai">{o.id}</span> · {o.label}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="px-2 py-1.5 rounded-lg bg-panel2">
          <div className="text-faint">Policy</div>
          <div className="text-ink font-medium">{result.policyProfile.label}</div>
        </div>
        <div className="px-2 py-1.5 rounded-lg bg-panel2">
          <div className="text-faint">Review cycle</div>
          <div className="text-ink font-medium">{result.reviewCycleMonths} months</div>
        </div>
        <div className="px-2 py-1.5 rounded-lg bg-panel2">
          <div className="text-faint">EDD</div>
          <div className="text-ink font-medium">{result.eddRequired ? "Required" : "Standard CDD"}</div>
        </div>
        <div className="px-2 py-1.5 rounded-lg bg-panel2">
          <div className="text-faint">Approver</div>
          <div className="text-ink font-medium">{result.approvalAuthority}</div>
        </div>
      </div>
    </div>
  );
}
