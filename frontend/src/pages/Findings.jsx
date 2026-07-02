import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, RiskBadge, StatusBadge } from "../components.jsx";
import { getFindings, getThirdParties, formatDate } from "../data.js";

const STATUSES = ["Open", "In Remediation", "Resolved", "Risk Accepted"];
const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export default function Findings() {
  const all = useMemo(() => getFindings(), []);
  const tpById = useMemo(
    () => new Map(getThirdParties().map((t) => [t.id, t])),
    [],
  );
  const [status, setStatus] = useState("");

  const filtered = all
    .filter((f) => !status || f.status === status)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  return (
    <div>
      <PageHeader
        title="Findings"
        description={`${all.length} findings tracked across third parties.`}
      />

      <div className="toolbar">
        <div className="chips">
          <button
            className={`chip ${status === "" ? "active" : ""}`}
            onClick={() => setStatus("")}
          >
            All
          </button>
          {STATUSES.map((s) => (
            <button
              key={s}
              className={`chip ${status === s ? "active" : ""}`}
              onClick={() => setStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Finding</th>
              <th>Third party</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Owner</th>
              <th>Identified</th>
              <th>Due</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => (
              <tr key={f.id}>
                <td>
                  <div className="cell-strong">{f.title}</div>
                  <div className="cell-sub">{f.description}</div>
                </td>
                <td className="muted">
                  <Link to={`/third-parties/${f.thirdPartyId}`}>
                    {tpById.get(f.thirdPartyId)?.name ?? "—"}
                  </Link>
                </td>
                <td>
                  <RiskBadge tier={f.severity} />
                </td>
                <td>
                  <StatusBadge status={f.status} />
                </td>
                <td className="muted">{f.owner}</td>
                <td className="muted">{formatDate(f.identifiedDate)}</td>
                <td className="muted">{formatDate(f.dueDate)}</td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty">
                  No findings match this filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
