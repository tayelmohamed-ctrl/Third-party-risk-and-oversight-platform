import { Link } from "react-router-dom";
import {
  PageHeader,
  StatCard,
  RiskDistribution,
  RiskBadge,
  StatusBadge,
} from "../components.jsx";
import {
  computeMetrics,
  getThirdParties,
  getAssessments,
  getFindings,
  assessmentEffectiveStatus,
  daysUntil,
  formatDate,
} from "../data.js";

const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export default function Dashboard() {
  const metrics = computeMetrics();
  const tpById = new Map(getThirdParties().map((t) => [t.id, t]));

  const upcomingAssessments = getAssessments()
    .filter((a) => a.status !== "Completed")
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);

  const topFindings = getFindings()
    .filter((f) => f.status === "Open" || f.status === "In Remediation")
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .slice(0, 5);

  const riskTone =
    metrics.portfolioRiskScore >= 60
      ? "danger"
      : metrics.portfolioRiskScore >= 40
        ? "warning"
        : "success";

  return (
    <div>
      <PageHeader
        title="Portfolio overview"
        description="Real-time posture across all third-party relationships."
      />

      <div className="grid cols-4">
        <StatCard
          label="Third parties"
          value={metrics.totalThirdParties}
          hint={`${metrics.activeThirdParties} active · ${metrics.criticalThirdParties} critical`}
          icon="▣"
        />
        <StatCard
          label="Open findings"
          value={metrics.openFindings}
          hint={`${metrics.criticalOrHighFindings} high or critical`}
          icon="⚠"
          tone={metrics.criticalOrHighFindings > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Assessments due"
          value={metrics.assessmentsDueSoon + metrics.overdueAssessments}
          hint={`${metrics.overdueAssessments} overdue · next 45 days`}
          icon="◷"
          tone={metrics.overdueAssessments > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Portfolio risk score"
          value={`${metrics.portfolioRiskScore}/100`}
          hint={`Avg control posture ${metrics.averagePostureScore}/100`}
          icon="◉"
          tone={riskTone}
        />
      </div>

      <div className="grid cols-3" style={{ marginTop: 16 }}>
        <RiskDistribution counts={metrics.riskTierCounts} />

        <section className="card pad span-2">
          <div className="section-head">
            <h3>Upcoming &amp; overdue assessments</h3>
            <Link className="link" to="/assessments">
              View all →
            </Link>
          </div>
          <div>
            {upcomingAssessments.map((a) => {
              const tp = tpById.get(a.thirdPartyId);
              const due = daysUntil(a.dueDate);
              return (
                <div className="list-item" key={a.id}>
                  <div className="list-row">
                    <div>
                      <div className="cell-strong">{tp?.name ?? "Unknown"}</div>
                      <div className="cell-sub">
                        {a.type} · due {formatDate(a.dueDate)}
                        {due < 0 ? ` · ${Math.abs(due)}d overdue` : ` · in ${due}d`}
                      </div>
                    </div>
                    <StatusBadge status={assessmentEffectiveStatus(a)} />
                  </div>
                </div>
              );
            })}
            {upcomingAssessments.length === 0 ? (
              <div className="empty">No pending assessments.</div>
            ) : null}
          </div>
        </section>
      </div>

      <section className="card pad" style={{ marginTop: 16 }}>
        <div className="section-head">
          <h3>Highest-priority open findings</h3>
          <Link className="link" to="/findings">
            View all →
          </Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Finding</th>
                <th>Third party</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {topFindings.map((f) => (
                <tr key={f.id}>
                  <td className="cell-strong">{f.title}</td>
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
                  <td className="muted">{formatDate(f.dueDate)}</td>
                </tr>
              ))}
              {topFindings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty">
                    No open findings.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
