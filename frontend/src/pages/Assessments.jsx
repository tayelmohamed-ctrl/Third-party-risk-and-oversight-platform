import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, RiskBadge, StatusBadge } from "../components.jsx";
import {
  getAssessments,
  getThirdParties,
  assessmentEffectiveStatus,
  formatDate,
} from "../data.js";

const TYPES = ["Security", "Privacy", "Financial", "Operational", "Compliance"];

export default function Assessments() {
  const all = useMemo(() => getAssessments(), []);
  const tpById = useMemo(
    () => new Map(getThirdParties().map((t) => [t.id, t])),
    [],
  );
  const [type, setType] = useState("");

  const filtered = all.filter((a) => !type || a.type === type);

  return (
    <div>
      <PageHeader
        title="Assessments"
        description={`${all.length} risk assessments across the portfolio.`}
      />

      <div className="toolbar">
        <div className="chips">
          <button
            className={`chip ${type === "" ? "active" : ""}`}
            onClick={() => setType("")}
          >
            All types
          </button>
          {TYPES.map((t) => (
            <button
              key={t}
              className={`chip ${type === t ? "active" : ""}`}
              onClick={() => setType(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Third party</th>
              <th>Type</th>
              <th>Status</th>
              <th>Risk rating</th>
              <th>Score</th>
              <th>Assessor</th>
              <th>Due</th>
              <th>Completed</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => {
              const tp = tpById.get(a.thirdPartyId);
              return (
                <tr key={a.id}>
                  <td>
                    <Link className="cell-strong" to={`/third-parties/${a.thirdPartyId}`}>
                      {tp?.name ?? "—"}
                    </Link>
                  </td>
                  <td className="muted">{a.type}</td>
                  <td>
                    <StatusBadge status={assessmentEffectiveStatus(a)} />
                  </td>
                  <td>
                    <RiskBadge tier={a.riskRating} />
                  </td>
                  <td className="score-pill">{a.score > 0 ? `${a.score}/100` : "—"}</td>
                  <td className="muted">{a.assessor}</td>
                  <td className="muted">{formatDate(a.dueDate)}</td>
                  <td className="muted">{formatDate(a.completedDate)}</td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty">
                  No assessments match this filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
