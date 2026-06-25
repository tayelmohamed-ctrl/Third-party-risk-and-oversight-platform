import { RISK_TIERS } from "./data.js";

export function RiskBadge({ tier }) {
  return <span className={`badge tier-${tier}`}>{tier}</span>;
}

const STATUS_CLASS = {
  Active: "s-green",
  Completed: "s-green",
  Resolved: "s-green",
  Overdue: "s-red",
  Open: "s-red",
  Terminated: "s-red",
  "In Progress": "s-blue",
  "In Remediation": "s-blue",
  "Under Review": "s-blue",
  Submitted: "s-blue",
  Onboarding: "s-violet",
  Draft: "s-violet",
  Offboarding: "s-gray",
  "Risk Accepted": "s-gray",
};

export function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_CLASS[status] ?? "s-gray"}`}>{status}</span>;
}

export function PageHeader({ title, description, action }) {
  return (
    <div className="page-header">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, hint, icon, tone = "default" }) {
  return (
    <div className="card stat">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className={`stat-icon ${tone}`} aria-hidden>
          {icon}
        </span>
      </div>
      <p className="stat-value">{value}</p>
      {hint ? <p className="stat-hint">{hint}</p> : null}
    </div>
  );
}

const BAR_DOT = {
  Critical: "#f43f5e",
  High: "#f97316",
  Medium: "#fbbf24",
  Low: "#10b981",
};

export function RiskDistribution({ counts }) {
  const total = RISK_TIERS.reduce((acc, t) => acc + counts[t], 0) || 1;
  return (
    <div className="card pad">
      <h3 style={{ margin: 0, fontSize: 14 }}>Residual risk distribution</h3>
      <p className="muted" style={{ margin: "4px 0 0" }}>
        Vendor portfolio by residual risk tier
      </p>
      <div className="bar">
        {RISK_TIERS.map((tier) =>
          counts[tier] > 0 ? (
            <span
              key={tier}
              className={tier}
              style={{ width: `${(counts[tier] / total) * 100}%` }}
              title={`${tier}: ${counts[tier]}`}
            />
          ) : null,
        )}
      </div>
      <ul className="legend">
        {RISK_TIERS.map((tier) => (
          <li key={tier}>
            <span className="dot" style={{ background: BAR_DOT[tier] }} />
            <span>{tier}</span>
            <span className="count">{counts[tier]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
