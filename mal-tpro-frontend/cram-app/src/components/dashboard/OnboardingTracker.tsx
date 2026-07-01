import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, RatingPill } from "../ui";
import AgentAiTag from "../agents/AgentAiTag";
import { apiActiveOnboarding, isApiAvailable, type OnboardingCaseRecord } from "../../lib/api";
import { ONBOARDING_STATE_PILL, onboardingStateLabel } from "../../lib/screeningUi";

export default function OnboardingTracker() {
  const [cases, setCases] = useState<OnboardingCaseRecord[]>([]);
  const [live, setLive] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!(await isApiAvailable())) {
      setLive(false);
      return;
    }
    setLive(true);
    try {
      const data = await apiActiveOnboarding();
      setCases(data.cases);
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
      setCases([]);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const dispositionRequired = cases.filter((c) => c.state === "DISPOSITION_REQUIRED").length;

  if (!live) {
    return (
      <Card className="p-4">
        <AgentAiTag agent="sayed">Onboarding pipeline</AgentAiTag>
        <p className="text-[12px] text-muted mt-2">Start the API server to track live onboarding cases from Shufti → Vital4 → CRAM.</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-line flex-wrap">
        <h3 className="m-0 text-sm font-display">Onboarding pipeline</h3>
        <AgentAiTag agent="sayed">Shufti → Vital4 → score</AgentAiTag>
        <span className="ml-auto text-[11px] text-muted">
          {cases.length} active
          {dispositionRequired > 0 && (
            <span className="text-hi font-semibold ml-1">· {dispositionRequired} need disposition</span>
          )}
        </span>
        <button type="button" className="btn btn-ghost text-[11px] px-2 py-1" onClick={() => void refresh()}>Refresh</button>
      </div>
      <div className="p-4">
        {err && <div className="text-hi text-[12px] mb-2">{err}</div>}
        {cases.length === 0 ? (
          <p className="text-[12px] text-muted m-0">No active onboarding cases. Use the Risk Test Bench to start partner onboarding.</p>
        ) : (
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-faint text-[10px] uppercase tracking-wide">
                <th className="text-left font-semibold pb-2">Customer</th>
                <th className="text-left font-semibold pb-2">State</th>
                <th className="text-left font-semibold pb-2">KYC</th>
                <th className="text-left font-semibold pb-2">Vital4</th>
                <th className="text-left font-semibold pb-2">Rating</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id} className="border-t border-lineSoft">
                  <td className="py-2.5">
                    <div className="font-semibold">{c.customerName}</div>
                    <div className="mono text-[10px] text-muted">{c.customerId}</div>
                  </td>
                  <td className="py-2.5">
                    <span className={`pill text-[10px] ${ONBOARDING_STATE_PILL[c.state] ?? "bg-panel2 text-muted"}`}>
                      {onboardingStateLabel(c.state)}
                    </span>
                  </td>
                  <td className="py-2.5 text-muted">{c.shuftiStatus ?? "—"}</td>
                  <td className="py-2.5">
                    {c.screeningCaseId ? (
                      <Link to={`/screening?caseId=${encodeURIComponent(c.screeningCaseId)}`} className="text-ai hover:underline mono text-[10px]">
                        {c.vital4CaseId ?? c.screeningCaseId}
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="py-2.5">
                    {c.finalRating ? <RatingPill rating={c.finalRating} /> : c.blockReason ? (
                      <span className="text-hi text-[10px]">Blocked</span>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {dispositionRequired > 0 && (
          <Link to="/screening" className="btn w-full mt-3 text-center block text-[12px]">
            Open disposition queue ({dispositionRequired}) →
          </Link>
        )}
      </div>
    </Card>
  );
}
