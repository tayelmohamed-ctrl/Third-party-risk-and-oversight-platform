import { Card, Sec } from "./ui";

type ItemStatus = "strong" | "partial" | "gap";

interface ThemeItem {
  label: string;
  detail: string;
  status: ItemStatus;
  ref?: string;
}

const STRONG = "bg-low/15 text-low";

/** Theme 2 — risk factor completeness (UBO + expected-vs-actual TM). Engine-side; no API dependency. */
export default function Theme2Status() {
  const items: ThemeItem[] = [
    {
      label: "Geography (residence, nationality, birth, SoW, SoF)",
      detail: "Highest firm-score attribute drives geography factor",
      status: "strong",
      ref: "Policy §10.5.1",
    },
    {
      label: "Product · service · delivery channel · customer type · PEP",
      detail: "Six-factor model with weighted customer-type blend",
      status: "strong",
    },
    {
      label: "Beneficial ownership / UBO transparency",
      detail: "legalForm + uboStatus + layers → customer-type score · OVR-004 wired",
      status: "strong",
      ref: "Policy §12.2 · Onboarding §2",
    },
    {
      label: "Expected activity profile (onboarding declaration)",
      detail: "expectedMonthlyBand captured at onboarding — frequency, volume, value",
      status: "strong",
      ref: "Policy §12.5",
    },
    {
      label: "Observed vs expected (transaction monitoring)",
      detail: "actualMonthlyBand from TM compared to declared profile · deviation drives transaction factor",
      status: "strong",
      ref: "Policy §12.6 · Onboarding §10",
    },
    {
      label: "Trigger integration",
      detail: "OWNERSHIP_CHANGE → UBO re-verify · TRANSACTION_ANOMALY → actual band uplift",
      status: "strong",
    },
  ];

  return (
    <div>
      <Sec>Failure-theme #2 — incomplete risk factors</Sec>
      <Card className="p-4">
        <div className="flex items-start gap-4 flex-wrap mb-4">
          <div className="flex-1 min-w-[200px]">
            <div className="text-[10.5px] text-faint uppercase tracking-wide font-semibold">Theme 2 status</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-display font-bold text-[22px]">Strong & complete</span>
              <span className={`pill text-[11px] font-semibold ${STRONG}`}>● built</span>
            </div>
            <p className="text-[12px] text-muted mt-2 m-0 leading-relaxed">
              UBO is now a scoring input with OVR-004 enforcement. Expected activity is declared at onboarding and compared against TM-observed volumes — material deviation escalates via the transaction factor and profile notes per Mal Bank Policy §12.5–12.6.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 max-md:grid-cols-1">
          {items.map((item) => (
            <div key={item.label} className="flex items-start gap-2.5 py-2.5 px-3 rounded-xl bg-panel2 border border-lineSoft">
              <span className={`pill text-[10px] shrink-0 mt-0.5 ${STRONG}`}>Strong</span>
              <div className="min-w-0">
                <div className="text-[12px] font-semibold">{item.label}</div>
                <div className="text-[10.5px] text-muted">{item.detail}</div>
                {item.ref && <div className="text-[10px] text-faint mono mt-0.5">{item.ref}</div>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
