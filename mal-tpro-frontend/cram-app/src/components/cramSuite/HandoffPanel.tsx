import { useMemo } from "react";
import type { GoldenThreadResult } from "../../engine/goldenThread";
import { onboardingGate } from "../../engine/goldenThread";

export interface HandoffOps {
  checks: Record<string, boolean>;
  approved: boolean;
  approvedBy: string;
  approvedAt: string;
  deployed: boolean;
  deployedAt: string;
}

interface Props {
  gt: GoldenThreadResult;
  ops: HandoffOps;
  approverInput: string;
  onToggleCheck: (id: string, checked: boolean) => void;
  onApprove: () => void;
  onDeploy: () => void;
  onApproverChange: (v: string) => void;
}

function money(n: number, currency: "AED" | "USD") {
  return currency === "USD"
    ? `USD ${n.toLocaleString("en-US")}`
    : `AED ${n.toLocaleString("en-AE")}`;
}

export default function HandoffPanel({
  gt, ops, approverInput, onToggleCheck, onApprove, onDeploy, onApproverChange,
}: Props) {
  const gate = useMemo(() => onboardingGate(gt, ops.checks, ops.approved, ops.deployed), [gt, ops]);
  const reqItems = gt.eddItems.filter((i) => i.required);
  const reqDone = reqItems.filter((i) => ops.checks[i.id]).length;
  const progress = reqItems.length ? Math.round((reqDone / reqItems.length) * 100) : 100;

  const gateCls = gate.status === "done" ? "border-low/40 bg-low/10"
    : gate.status === "ready" || gate.status === "auto" ? "border-low/30 bg-low/5"
    : gate.status === "exit" ? "border-med/40 bg-med/10"
    : "border-hi/40 bg-hi/10";

  return (
    <div className="rounded-xl border border-line bg-panel2 overflow-hidden">
      <div className="px-4 py-3 border-b border-lineSoft">
        <div className="text-[10.5px] font-bold tracking-wide uppercase text-faint">Operational hand-off</div>
        <div className="text-[11px] text-muted mt-0.5">Rating → executed controls (golden thread)</div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3 text-[12px]">
          <div>
            <div className="text-[10px] text-faint uppercase">Disposition</div>
            <span className={`inline-block mt-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
              gt.disposition === "DECLINE_EXIT" ? "bg-hi/20 text-hi"
                : gt.disposition === "EDD_REQUIRED" ? "bg-med/20 text-med"
                : "bg-low/20 text-low"
            }`}>{gt.dispositionText}</span>
          </div>
          <div>
            <div className="text-[10px] text-faint uppercase">Approval authority</div>
            <div className="font-semibold mt-1">{gt.approval.who}</div>
          </div>
        </div>
        <p className="text-[11.5px] text-muted m-0">{gt.subText}</p>

        {(gt.eddRequired || gt.inherentLevel === "Prohibited") && (
          <div>
            <div className="flex justify-between text-[11px] mb-2">
              <span className="font-semibold">{gt.inherentLevel === "Prohibited" ? "Exit & reporting workflow" : "EDD workflow"}</span>
              <span className="text-faint">{reqDone} / {reqItems.length} required</span>
            </div>
            <div className="h-1.5 rounded-full bg-panel overflow-hidden mb-3">
              <div className="h-full bg-low transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {gt.eddItems.map((it) => (
                <label key={it.id} className={`flex gap-2 items-start text-[11.5px] p-2 rounded-lg cursor-pointer ${ops.checks[it.id] ? "bg-low/10" : "bg-panel"}`}>
                  <input type="checkbox" checked={!!ops.checks[it.id]} onChange={(e) => onToggleCheck(it.id, e.target.checked)} className="mt-0.5" />
                  <span className="flex-1">{it.text}</span>
                  {it.required && <span className="text-[9px] text-med font-semibold shrink-0">required</span>}
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="text-[11px] font-semibold mb-2">Monitoring profile {gt.monitoring ? "(consumed by TM engine)" : ""}</div>
          {gt.monitoring ? (
            <table className="w-full text-[11px]">
              <tbody>
                {[
                  ["Monitoring intensity", gt.monitoring.intensity],
                  ["Single-txn alert (≥)", money(gt.monitoring.singleTxnAlertAed, gt.monitoring.currency)],
                  ["Cumulative 30-day alert (≥)", money(gt.monitoring.monthlyCumulativeAlertAed, gt.monitoring.currency)],
                  ["Structuring / aggregation watch", money(gt.monitoring.structuringWatchAed, gt.monitoring.currency)],
                  ["Sanctions re-screen", gt.monitoring.sanctionsRescreen],
                  ["Adverse-media sweep", gt.monitoring.adverseMediaSweep],
                  ["Periodic KYC review", gt.monitoring.periodicKycReview],
                ].map(([k, v]) => (
                  <tr key={k} className="border-t border-lineSoft">
                    <td className="py-1.5 text-muted pr-2">{k}</td>
                    <td className="py-1.5 font-semibold text-right">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-[11px] text-muted">No monitoring profile — relationship declined / exited.</div>
          )}
          {ops.deployed && (
            <div className="text-[10.5px] text-low mt-2">Deployed to monitoring engine · {ops.deployedAt}</div>
          )}
          <button
            className="btn btn-ghost w-full mt-2 text-[11px]"
            disabled={!gt.monitoring || gate.canDeploy === false}
            onClick={onDeploy}
          >
            Deploy profile to monitoring engine
          </button>
        </div>

        <div className={`rounded-lg border px-3 py-2.5 ${gateCls}`}>
          <div className="text-[11.5px] font-semibold">{gate.message}</div>
        </div>

        {gate.canApprove && (
          <div className="flex gap-2">
            <input
              className="input flex-1 text-[12px]"
              placeholder="Approver name & role"
              value={approverInput}
              onChange={(e) => onApproverChange(e.target.value)}
            />
            <button className="btn text-[12px] shrink-0" onClick={onApprove}>Record approval</button>
          </div>
        )}
        {ops.approved && (
          <div className="text-[11px] text-low">Approved by {ops.approvedBy} · {ops.approvedAt}</div>
        )}
      </div>
    </div>
  );
}
