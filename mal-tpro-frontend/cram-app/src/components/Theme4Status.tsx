import { Card, Sec } from "./ui";

const STRONG = "bg-low/15 text-low";

export default function Theme4Status() {
  const items = [
    { label: "Rating → CDD/EDD level", detail: "dueDiligenceLevel drives Simplified / Standard / Enhanced / Exit", status: "strong" as const },
    { label: "EDD-required flag + workflow", detail: "Checklist gates onboarding · required steps enforced before submit", status: "strong" as const },
    { label: "Approval authority", detail: "RM auto · team lead · MLRO · FCC by inherent rating + EDD", status: "strong" as const },
    { label: "Review frequency", detail: "Low 60mo · Medium 36mo · High 12mo — computed next review date", status: "strong" as const },
    { label: "Monitoring intensity + TM thresholds", detail: "AED alert bands derived from rating · deploy to TM engine", status: "strong" as const },
    { label: "Control layer → residual", detail: "6 controls · effectiveness · appetite · control-gap flag", status: "strong" as const },
    { label: "Individual + Entity modes", detail: "CRAM Suite parity — separate geography & UBO treatment", status: "strong" as const },
  ];

  return (
    <div>
      <Sec>Failure-theme #4 — CRAM output disconnected from controls</Sec>
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="font-display font-bold text-[22px]">Strong & complete</span>
          <span className={`pill text-[11px] font-semibold ${STRONG}`}>● golden thread wired</span>
        </div>
        <p className="text-[12px] text-muted m-0 mb-4">
          Outcomes are no longer display-only. The Test Bench executes the golden thread: inherent rating drives due diligence, EDD workflow, approval gate, review cadence, and a deployable transaction-monitoring profile — for both individual and entity customers.
        </p>
        <div className="grid grid-cols-2 gap-2 max-md:grid-cols-1">
          {items.map((item) => (
            <div key={item.label} className="flex gap-2.5 py-2.5 px-3 rounded-xl bg-panel2 border border-lineSoft">
              <span className={`pill text-[10px] shrink-0 mt-0.5 ${STRONG}`}>Strong</span>
              <div>
                <div className="text-[12px] font-semibold">{item.label}</div>
                <div className="text-[10.5px] text-muted">{item.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
