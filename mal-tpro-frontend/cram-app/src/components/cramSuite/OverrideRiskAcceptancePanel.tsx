import { Card } from "../ui";
import type { RiskAcceptanceRecord } from "../../lib/cramDecisionFrame";

export default function OverrideRiskAcceptancePanel({
  records,
}: {
  records: RiskAcceptanceRecord[];
}) {
  return (
    <Card className="p-4">
      <div className="text-[10px] uppercase tracking-wide text-faint mb-1">Overrides & risk acceptance</div>
      <p className="text-[11px] text-muted m-0 mb-3">
        Audit trail — who overrode what, why, expiry, and required approvals (CO / board).
      </p>

      {records.length === 0 ? (
        <div className="text-[11px] text-muted px-2 py-3 rounded-lg bg-panel2 border border-lineSoft">
          No active overrides or risk acceptance on file. Manual override or EDD approval will appear here.
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <div
              key={r.id}
              className={`rounded-lg border px-3 py-2.5 text-[11px] ${
                r.status === "active"
                  ? "border-low/30 bg-low/5"
                  : r.status === "pending"
                    ? "border-med/30 bg-med/5"
                    : "border-lineSoft bg-panel2 opacity-70"
              }`}
            >
              <div className="flex justify-between gap-2 flex-wrap">
                <span className="font-semibold text-ink">{r.what}</span>
                <span className={`text-[10px] font-bold uppercase ${
                  r.status === "active" ? "text-low" : r.status === "pending" ? "text-med" : "text-faint"
                }`}>
                  {r.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-muted">
                <div><span className="text-faint">Who:</span> {r.who}</div>
                <div><span className="text-faint">Review:</span> {r.reviewDate ?? "—"}</div>
                <div className="col-span-2"><span className="text-faint">Why:</span> {r.why}</div>
                <div><span className="text-faint">Expiry:</span> {r.expiryDate ?? "—"}</div>
                <div><span className="text-faint">Approvals:</span> {r.requiredApprovals.join(", ") || "—"}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
