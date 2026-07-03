/**
 * TM System Pre-Implementation Assessment — partner portal module.
 * Embeds Mal Bank questionnaire + BRD go-live gates for integrating systems.
 */
import { useMemo, useState } from "react";
import {
  sectionsForPartnerCategory,
  scoreAssessment,
  TM_ASSESSMENT_META,
  TM_NO_GO_CONDITIONS,
  requiresTmAssessment,
} from "@/config/tmPreImplementationAssessment";
import {
  TM_GO_LIVE_GATES,
  TM_BRD_META,
} from "@/config/tmImplementationBrd";

const RESPONSES = ["Yes", "Partial", "No"];

function pct(n) {
  return Math.round(n * 100);
}

function scoreColor(score) {
  if (score >= 0.9) return "var(--green)";
  if (score >= 0.75) return "var(--gold)";
  if (score >= 0.6) return "var(--amber)";
  return "var(--red)";
}

export default function TmSystemAssessment({
  partnerId,
  partnerName,
  category,
  assessment,
  onSave,
  readOnly = false,
}) {
  const sections = useMemo(() => sectionsForPartnerCategory(category || "System integrator"), [category]);
  const [activeSec, setActiveSec] = useState(sections[0]?.id || "05");
  const [responses, setResponses] = useState(() => assessment?.responses || {});
  const [view, setView] = useState("assess");

  const scored = useMemo(() => scoreAssessment(responses), [responses]);
  const active = sections.find((s) => s.id === activeSec) || sections[0];

  function setResponse(qid, val) {
    if (readOnly) return;
    const next = { ...responses, [qid]: val };
    setResponses(next);
    onSave?.({ responses: next, updatedAt: new Date().toISOString(), ...scoreAssessment(next) });
  }

  if (!requiresTmAssessment(category || "System integrator")) {
    return (
      <div className="card">
        <p className="muted" style={{ fontSize: 12 }}>
          TM pre-implementation assessment applies to integrating systems (Risk platform, System integrator, KYC, banking, payout, card).
          Category “{category}” uses a reduced relevant section set when opened from onboarding.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="h1">System integration assessment</h1>
      <p className="sub">
        {TM_ASSESSMENT_META.title} · aligned to {TM_BRD_META.title} ({TM_BRD_META.date}).
        {partnerName ? ` Partner: ${partnerName}.` : ""} Complete before go-live approval for any system integrating with Mal (TM, screening, core feeds, API).
      </p>

      <div className="row" style={{ gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          ["assess", "Questionnaire"],
          ["gates", "Go-live gates"],
          ["nogo", "No-go matrix"],
          ["summary", "Readiness summary"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={view === id ? "btn gold" : "btn ghost"}
            onClick={() => setView(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 14 }}>
        <div className="card" style={{ textAlign: "center", padding: 14 }}>
          <div className="muted" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Readiness</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: scoreColor(scored.overall) }}>{pct(scored.overall)}%</div>
          <div style={{ fontSize: 11, fontWeight: 600 }}>{scored.rating}</div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: 14 }}>
          <div className="muted" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Decision</div>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 8 }}>{scored.decision}</div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: 14 }}>
          <div className="muted" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Sections</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{sections.length}</div>
          <div className="muted" style={{ fontSize: 11 }}>relevant to {category}</div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: 14 }}>
          <div className="muted" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Questions</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            {sections.reduce((a, s) => a + s.questions.length, 0)}
          </div>
        </div>
      </div>

      {view === "assess" && (
        <div className="grid" style={{ gridTemplateColumns: "220px 1fr", gap: 12, alignItems: "start" }}>
          <div className="card" style={{ padding: 8, maxHeight: 480, overflow: "auto" }}>
            {sections.map((sec) => {
              const secScore = scored.sections.find((s) => s.id === sec.id);
              return (
                <button
                  key={sec.id}
                  type="button"
                  className="btn ghost"
                  style={{
                    width: "100%",
                    justifyContent: "space-between",
                    marginBottom: 4,
                    background: activeSec === sec.id ? "var(--brand50)" : undefined,
                    fontSize: 11,
                    textAlign: "left",
                  }}
                  onClick={() => setActiveSec(sec.id)}
                >
                  <span>{sec.id} · {sec.title.slice(0, 28)}{sec.title.length > 28 ? "…" : ""}</span>
                  <span className="mono" style={{ color: scoreColor(secScore?.score ?? 0) }}>
                    {pct(secScore?.score ?? 0)}%
                  </span>
                </button>
              );
            })}
          </div>

          <div className="card">
            <h3 style={{ textTransform: "none", letterSpacing: 0, fontSize: 15 }}>{active?.title}</h3>
            <p className="muted" style={{ fontSize: 11, marginBottom: 12 }}>
              Response: Yes = fully met · Partial = partly met · No = not met. Scoring per Mal questionnaire instructions.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {active?.questions.map((q) => (
                <div key={q.id} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                  <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <span className="mono" style={{ fontSize: 10, color: "var(--brand600)" }}>{q.id}</span>
                    <span className="chip" style={{ fontSize: 10 }}>{q.requirementType} · {q.applicability}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, margin: "6px 0" }}>{q.controlArea}</div>
                  <div style={{ fontSize: 12, marginBottom: 8 }}>{q.question}</div>
                  {!readOnly && (
                    <div className="row" style={{ gap: 6 }}>
                      {RESPONSES.map((r) => (
                        <button
                          key={r}
                          type="button"
                          className={responses[q.id] === r ? "btn gold" : "btn ghost"}
                          style={{ padding: "4px 10px", fontSize: 11 }}
                          onClick={() => setResponse(q.id, r)}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                  {readOnly && responses[q.id] && (
                    <span className="chip">{responses[q.id]}</span>
                  )}
                  {q.systemConfig && (
                    <div className="muted" style={{ fontSize: 10, marginTop: 6 }}>
                      Config: {q.systemConfig.slice(0, 120)}…
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === "gates" && (
        <div className="grid" style={{ gap: 10 }}>
          {TM_GO_LIVE_GATES.map((g) => (
            <div key={g.id} className="card">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <b>{g.id} · {g.name}</b>
                <span className="muted" style={{ fontSize: 11 }}>{g.approver}</span>
              </div>
              <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>{g.requirement}</p>
            </div>
          ))}
        </div>
      )}

      {view === "nogo" && (
        <div className="card" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
                <th style={{ padding: 6 }}>Ref</th>
                <th style={{ padding: 6 }}>Condition</th>
                <th style={{ padding: 6 }}>Owner</th>
              </tr>
            </thead>
            <tbody>
              {TM_NO_GO_CONDITIONS.map((n) => (
                <tr key={n.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: 6, fontWeight: 700, color: "var(--red)" }}>{n.id}</td>
                  <td style={{ padding: 6 }}>{n.condition}</td>
                  <td style={{ padding: 6 }} className="muted">{n.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === "summary" && (
        <div className="card">
          <table style={{ width: "100%", fontSize: 11 }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th>Section</th>
                <th>Score</th>
                <th>Answered</th>
              </tr>
            </thead>
            <tbody>
              {scored.sections.map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: 6 }}>{s.id} · {s.title}</td>
                  <td style={{ padding: 6, fontWeight: 700, color: scoreColor(s.score) }}>{pct(s.score)}%</td>
                  <td style={{ padding: 6 }}>{s.answered}/{s.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {partnerId && (
            <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>
              Assessment stored against partner profile {partnerId}. Export evidence pack from Examiner room when complete.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export { requiresTmAssessment, scoreAssessment };
