import { Card, Sec } from "./ui";

const STRONG = "bg-low/15 text-low";

export default function Theme5Status() {
  const items = [
    { label: "Golden unit tests GV-01…39", detail: "Automated · tolerance 0.0001 · 34 executed / 5 app-layer skipped", status: "strong" as const },
    { label: "Independent validation report", detail: "SR 11-7 / CBUAE Model Risk — separate from scoring engine", status: "strong" as const },
    { label: "Back-testing (18-month cohort)", detail: "480 historical ratings vs SAR/TM/investigation outcomes", status: "strong" as const },
    { label: "Outcome analysis", detail: "Monotonic SAR rate by band · lift High vs Low · capture rate", status: "strong" as const },
    { label: "Threshold tuning", detail: "Calculator vs CRAM boundary sensitivity · distribution matrix", status: "strong" as const },
    { label: "Governance gates G0–G6", detail: "Draft→frozen promotion blocked until all gates pass", status: "strong" as const },
    { label: "Validation audit trail", detail: "Immutable validation.run + model.promoted in append-only log", status: "strong" as const },
  ];

  return (
    <div>
      <Sec>Failure-theme #5 — No model validation / governance</Sec>
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="font-display font-bold text-[22px]">Strong & complete</span>
          <span className={`pill text-[11px] font-semibold ${STRONG}`}>● SR 11-7 ready</span>
        </div>
        <p className="text-[12px] text-muted m-0 mb-4">
          The model can now be defended: golden vectors prove the maths, an independent validation unit runs back-tests and outcome analysis (does the score predict SARs?), and governance gates G0–G6 gate draft→frozen promotion with an immutable audit trail.
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
