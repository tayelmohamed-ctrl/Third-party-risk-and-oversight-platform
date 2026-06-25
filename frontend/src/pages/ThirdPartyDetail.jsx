import { Link, useParams } from "react-router-dom";
import { PageHeader, RiskBadge, StatusBadge } from "../components.jsx";
import {
  getThirdParty,
  getAssessmentsForThirdParty,
  getFindingsForThirdParty,
  assessmentEffectiveStatus,
  formatCurrency,
  formatDate,
} from "../data.js";

export default function ThirdPartyDetail() {
  const { id } = useParams();
  const tp = getThirdParty(id);

  if (!tp) {
    return (
      <div>
        <Link className="back" to="/third-parties">
          ← Back to third parties
        </Link>
        <div className="empty">Third party not found.</div>
      </div>
    );
  }

  const assessments = getAssessmentsForThirdParty(tp.id);
  const findings = getFindingsForThirdParty(tp.id);

  return (
    <div>
      <Link className="back" to="/third-parties">
        ← Back to third parties
      </Link>

      <PageHeader
        title={tp.name}
        description={tp.description}
        action={<StatusBadge status={tp.status} />}
      />

      <div className="detail-grid">
        <div className="stack">
          <section className="card pad">
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Risk profile</h3>
            <dl className="kv">
              <dt>Category</dt>
              <dd>{tp.category}</dd>
              <dt>Criticality</dt>
              <dd>
                <RiskBadge tier={tp.criticality} />
              </dd>
              <dt>Inherent risk</dt>
              <dd>
                <RiskBadge tier={tp.inherentRiskTier} />
              </dd>
              <dt>Residual risk</dt>
              <dd>
                <RiskBadge tier={tp.residualRiskTier} />
              </dd>
              <dt>Data access</dt>
              <dd>{tp.dataAccess}</dd>
              <dt>Annual spend</dt>
              <dd>{formatCurrency(tp.annualSpendUSD)}</dd>
              <dt>Services</dt>
              <dd>
                <div className="tags">
                  {(tp.services ?? []).map((s) => (
                    <span className="tag" key={s}>
                      {s}
                    </span>
                  ))}
                </div>
              </dd>
            </dl>
          </section>

          <section className="card pad">
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Assessments</h3>
            {assessments.map((a) => (
              <div className="list-item" key={a.id}>
                <div className="list-row">
                  <div>
                    <div className="cell-strong">
                      {a.type} assessment
                      {a.score > 0 ? (
                        <span className="score-pill"> · {a.score}/100</span>
                      ) : null}
                    </div>
                    <div className="cell-sub">
                      {a.assessor} · due {formatDate(a.dueDate)}
                      {a.completedDate
                        ? ` · completed ${formatDate(a.completedDate)}`
                        : ""}
                    </div>
                    {a.summary ? (
                      <div className="muted" style={{ marginTop: 6 }}>
                        {a.summary}
                      </div>
                    ) : null}
                  </div>
                  <StatusBadge status={assessmentEffectiveStatus(a)} />
                </div>
              </div>
            ))}
            {assessments.length === 0 ? (
              <div className="empty">No assessments recorded.</div>
            ) : null}
          </section>

          <section className="card pad">
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Findings</h3>
            {findings.map((f) => (
              <div className="list-item" key={f.id}>
                <div className="list-row">
                  <div>
                    <div className="cell-strong">{f.title}</div>
                    <div className="cell-sub">
                      Owner: {f.owner} · due {formatDate(f.dueDate)}
                    </div>
                    {f.description ? (
                      <div className="muted" style={{ marginTop: 6 }}>
                        {f.description}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <RiskBadge tier={f.severity} />
                    <StatusBadge status={f.status} />
                  </div>
                </div>
              </div>
            ))}
            {findings.length === 0 ? (
              <div className="empty">No findings. 🎉</div>
            ) : null}
          </section>
        </div>

        <div className="stack">
          <section className="card pad">
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Relationship</h3>
            <dl className="kv">
              <dt>Internal owner</dt>
              <dd>{tp.internalOwner}</dd>
              <dt>Country</dt>
              <dd>{tp.country}</dd>
              <dt>Contact</dt>
              <dd>{tp.contactName}</dd>
              <dt>Email</dt>
              <dd>{tp.contactEmail}</dd>
              <dt>Onboarded</dt>
              <dd>{formatDate(tp.onboardedAt)}</dd>
              <dt>Last review</dt>
              <dd>{formatDate(tp.lastReviewDate)}</dd>
              <dt>Next review</dt>
              <dd>{formatDate(tp.nextReviewDate)}</dd>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
