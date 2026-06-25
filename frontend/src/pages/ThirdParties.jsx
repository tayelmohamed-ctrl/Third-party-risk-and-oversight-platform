import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, RiskBadge, StatusBadge } from "../components.jsx";
import { getThirdParties, RISK_TIERS, formatCurrency, formatDate } from "../data.js";

export default function ThirdParties() {
  const all = useMemo(() => getThirdParties(), []);
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("");

  const filtered = all.filter((tp) => {
    const q = query.toLowerCase();
    const matchesQuery =
      !q ||
      tp.name.toLowerCase().includes(q) ||
      tp.category.toLowerCase().includes(q) ||
      tp.internalOwner.toLowerCase().includes(q);
    const matchesTier = !tier || tp.residualRiskTier === tier;
    return matchesQuery && matchesTier;
  });

  return (
    <div>
      <PageHeader
        title="Third parties"
        description={`${all.length} vendors and partners in the oversight portfolio.`}
      />

      <div className="toolbar">
        <div className="search">
          <input
            className="input"
            type="search"
            placeholder="Search by name, category, owner…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="chips">
          <button
            className={`chip ${tier === "" ? "active" : ""}`}
            onClick={() => setTier("")}
          >
            All
          </button>
          {RISK_TIERS.map((t) => (
            <button
              key={t}
              className={`chip ${tier === t ? "active" : ""}`}
              onClick={() => setTier(t)}
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
              <th>Category</th>
              <th>Status</th>
              <th>Criticality</th>
              <th>Residual risk</th>
              <th>Annual spend</th>
              <th>Next review</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((tp) => (
              <tr key={tp.id}>
                <td>
                  <Link className="cell-strong" to={`/third-parties/${tp.id}`}>
                    {tp.name}
                  </Link>
                  <div className="cell-sub">{tp.internalOwner}</div>
                </td>
                <td className="muted">{tp.category}</td>
                <td>
                  <StatusBadge status={tp.status} />
                </td>
                <td>
                  <RiskBadge tier={tp.criticality} />
                </td>
                <td>
                  <RiskBadge tier={tp.residualRiskTier} />
                </td>
                <td className="muted">{formatCurrency(tp.annualSpendUSD)}</td>
                <td className="muted">{formatDate(tp.nextReviewDate)}</td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty">
                  No third parties match your filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
