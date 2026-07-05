import type { ScoreDriverPlain } from "../../lib/cramDecisionFrame";

export default function ScoreWhyPanel({
  rating,
  topDrivers,
  reductionTips,
}: {
  rating: string;
  topDrivers: ScoreDriverPlain[];
  reductionTips: string[];
}) {
  if (topDrivers.length === 0 && reductionTips.length === 0) return null;

  return (
    <div className="cram-score-why">
      <div className="cram-score-why__title">Why this score?</div>
      <p className="cram-score-why__lead">
        {rating} risk — top drivers in plain language for compliance decision-making.
      </p>

      {topDrivers.length > 0 && (
        <ol className="cram-score-why__drivers">
          {topDrivers.map((d, i) => (
            <li key={`${d.label}-${i}`}>
              <span className="cram-score-why__driver-label">{d.label}</span>
              <span className="cram-score-why__driver-detail">{d.detail}</span>
            </li>
          ))}
        </ol>
      )}

      {reductionTips.length > 0 && (
        <div className="cram-score-why__reduce">
          <div className="cram-score-why__reduce-head">What would reduce the score</div>
          <ul>
            {reductionTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
