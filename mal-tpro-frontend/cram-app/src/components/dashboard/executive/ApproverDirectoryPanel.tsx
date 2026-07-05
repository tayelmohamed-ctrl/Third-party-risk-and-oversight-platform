import { APPROVER_DIRECTORY, type ApproverRole } from "../../../config/approvalRouting";
import { Card } from "../../ui";

const DISPLAY_ORDER: ApproverRole[] = [
  "primary_user",
  "mlro",
  "us_co",
  "delegated_mlro",
  "board",
];

export default function ApproverDirectoryPanel() {
  return (
    <Card className="p-4 mt-4">
      <div className="text-[10px] uppercase tracking-wide text-faint font-semibold mb-2">
        Approver directory · fill emails in <code className="mono text-[9px]">src/config/approvalRouting.ts</code>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {DISPLAY_ORDER.map((role) => {
          const c = APPROVER_DIRECTORY[role];
          const configured = Boolean(c.email.trim());
          return (
            <div key={role} className="rounded-lg border border-line bg-panel2/40 px-3 py-2">
              <div className="text-[10px] font-semibold text-ink">{c.label}</div>
              <div className={`text-[10px] mono mt-1 ${configured ? "text-muted" : "text-med"}`}>
                {configured ? c.email : "Email pending"}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
