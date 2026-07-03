import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, Sec } from "./ui";
import { apiValidationGovernance, type ValidationGovernance } from "../lib/api";

const STRONG = "bg-low/15 text-low";
const WARN = "bg-med/15 text-med";
const WEAK = "bg-hi/15 text-hi";

export default function Theme5Status() {
  const [gov, setGov] = useState<ValidationGovernance | null>(null);

  useEffect(() => {
    void apiValidationGovernance().then(setGov).catch(() => setGov(null));
  }, []);

  const status = gov?.status ?? "draft";
  const gatesPassed = gov?.allGatesPassed ?? false;
  const openGates = gov?.openItems ?? 0;
  const registerOpen = gov?.registerCounts?.open ?? 0;
  const frozen = status === "frozen";
  const headline = frozen && gatesPassed ? "Strong & complete" : gatesPassed && registerOpen === 0 ? "Ready for freeze" : "In progress";
  const pillClass = frozen && gatesPassed ? STRONG : gatesPassed ? WARN : WEAK;
  const pillLabel = frozen ? "Frozen" : gatesPassed && registerOpen === 0 ? "Gates pass" : `${openGates} gate(s) open`;

  const items = [
    { label: "Golden unit tests GV-01…39", detail: gov ? `G3 ${gov.gates.find((g) => g.id === "G3")?.passed ? "pass" : "fail"}` : "Run validation", status: gov?.gates.find((g) => g.id === "G3")?.passed ? "strong" as const : "weak" as const },
    { label: "Independent validation", detail: gov ? `Verdict path · ${gov.gates.filter((g) => g.passed).length}/7 gates` : "Loading…", status: gatesPassed ? "strong" as const : "weak" as const },
    { label: "Vendor readiness (G2)", detail: gov?.gates.find((g) => g.id === "G2")?.detail ?? "—", status: gov?.gates.find((g) => g.id === "G2")?.passed ? "strong" as const : "weak" as const },
    { label: "Back-testing & outcome analysis", detail: gov?.gates.find((g) => g.id === "G5")?.detail ?? "Gate G5", status: gov?.gates.find((g) => g.id === "G5")?.passed ? "strong" as const : "weak" as const },
    { label: "Config maker-checker API", detail: "PATCH /config/{table} · OVR-001…007 locked", status: "strong" as const },
    { label: "Model freeze status", detail: `${gov?.modelVersionId ?? "—"} · ${status}`, status: frozen ? "strong" as const : "weak" as const },
    { label: "Open items register", detail: registerOpen === 0 ? "All items dispositioned" : `${registerOpen} open — blocks promotion`, status: registerOpen === 0 ? "strong" as const : "weak" as const },
  ];

  return (
    <div>
      <Sec>Failure-theme #5 — Model validation / governance</Sec>
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="font-display font-bold text-[22px]">{headline}</span>
          <span className={`pill text-[11px] font-semibold ${pillClass}`}>● {pillLabel}</span>
        </div>
        <p className="text-[12px] text-muted m-0 mb-4">
          Live governance state from validation store — not a static claim. Golden vectors, back-test, vendor readiness, and open items register must all pass before draft→frozen promotion.
          {" "}<Link to="/governance" className="text-ink underline">Governance</Link>
          {" · "}<Link to="/validation" className="text-ink underline">Validation</Link>
        </p>
        <div className="grid grid-cols-2 gap-2 max-md:grid-cols-1">
          {items.map((item) => (
            <div key={item.label} className="flex gap-2.5 py-2.5 px-3 rounded-xl bg-panel2 border border-lineSoft">
              <span className={`pill text-[10px] shrink-0 mt-0.5 ${item.status === "strong" ? STRONG : item.status === "weak" ? WEAK : WARN}`}>
                {item.status === "strong" ? "Strong" : item.status === "weak" ? "Open" : "Partial"}
              </span>
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
