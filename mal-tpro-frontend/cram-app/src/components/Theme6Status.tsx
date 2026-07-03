import { Card, Sec } from "./ui";

const STRONG = "bg-low/15 text-low";

export default function Theme6Status() {
  const items = [
    { label: "Mandatory field gate (FR-007)", detail: "Missing mandatory → BLOCKED · listed fields · no final rating", status: "strong" as const },
    { label: "KYC verification check", detail: "Identity source · verified flag · liveness before scoring", status: "strong" as const },
    { label: "Freshness / completeness", detail: "Document age · KYC refresh SLA · screening completion timestamp", status: "strong" as const },
    { label: "Test bench enforcement", detail: "Scores only after DQ pass — BLOCKED panel when incomplete", status: "strong" as const },
    { label: "API enforcement", detail: "POST /assessments rejects data_quality_blocked with issue list", status: "strong" as const },
    { label: "Unmapped → Medium never Low", detail: "Country/profession/activity library rules unchanged", status: "strong" as const },
    { label: "GV-19 automated", detail: "Incomplete capture test in unit suite", status: "strong" as const },
  ];

  return (
    <div>
      <Sec>Failure-theme #7 — bad inputs (data quality)</Sec>
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="font-display font-bold text-[22px]">Strong & complete</span>
          <span className={`pill text-[11px] font-semibold ${STRONG}`}>● garbage-in blocked</span>
        </div>
        <p className="text-[12px] text-muted m-0 mb-4">
          The test bench no longer scores with silent defaults. A KYC data-quality gate validates completeness, verification, and freshness before any composite is computed — matching FR-007 and methodology §15.3.
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
