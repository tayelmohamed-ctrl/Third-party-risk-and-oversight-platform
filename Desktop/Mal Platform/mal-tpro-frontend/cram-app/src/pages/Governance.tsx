import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui";
import AgentAvatar from "../components/agents/AgentAvatar";
import {
  OPEN_ITEMS_REGISTER,
  openItemCounts,
  statusLabel,
  statusPillClass,
} from "../config/openItemsRegister";
import {
  apiValidationGovernance, apiPromoteModel, apiRunValidation,
  type ValidationGovernance,
} from "../lib/api";

export default function Governance() {
  const [gov, setGov] = useState<ValidationGovernance | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const itemCounts = openItemCounts();

  const refresh = useCallback(async () => {
    try {
      setGov(await apiValidationGovernance());
    } catch {
      setGov(null);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function handlePromote() {
    setBusy(true);
    setMsg(null);
    try {
      await apiPromoteModel();
      setMsg("Model promoted to Frozen.");
      await refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleValidate() {
    setBusy(true);
    setMsg(null);
    try {
      await apiRunValidation();
      setMsg("Independent validation run complete.");
      await refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const status = gov?.status ?? "draft";
  const openGates = gov?.openItems ?? itemCounts.open;
  const canPromote = (gov?.canPromoteToFrozen ?? false) && itemCounts.open === 0;

  return (
    <div>
      {msg && <Card className="p-3 mb-4 text-[12px]">{msg}</Card>}
      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <Card className="p-4">
          <h3 className="m-0 mb-1.5 text-sm font-display">Model version</h3>
          <div className="text-[13px]"><b className="mono">{gov?.modelVersionId ?? "CRAM-CBUAE-2026-05-FREEZE-01"}</b></div>
          <div className="text-muted text-[12px] my-1.5">
            Status{" "}
            <span className={`pill ${status === "frozen" ? "bg-low/15 text-low" : "bg-med/15 text-med"}`}>
              {status === "frozen" ? "Frozen" : "Draft freeze"}
            </span>
            {status === "draft" && itemCounts.open > 0 && (
              <span className="text-hi"> — {itemCounts.open} open item(s) block promotion (NFR-4).</span>
            )}
            {status === "draft" && itemCounts.open === 0 && canPromote && " — eligible for promotion."}
            {status === "draft" && itemCounts.open === 0 && !canPromote && openGates > 0 && ` — ${openGates} validation gate(s) open.`}
          </div>
          <div className="text-[11.5px] text-muted">
            Band boundary: <b className="text-ink">Calculator (&gt;2.15)</b> · hard stops OVR-001…007 <b className="text-hi">LOCKED</b> ·
            independent validation <Link to="/validation" className="text-ink underline">/validation</Link>
          </div>
          <div className="flex gap-2 mt-3.5">
            <button className="btn" disabled={busy} onClick={() => void handleValidate()}>Run validation</button>
            <button className="btn" disabled={busy || !canPromote || status === "frozen"} onClick={() => void handlePromote()}>
              {status === "frozen" ? "Frozen" : `Promote to Frozen${itemCounts.open ? ` (${itemCounts.open} open)` : openGates ? ` (${openGates} gates)` : ""}`}
            </button>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="m-0 mb-1 text-sm font-display">Open items register — MLRO ratification</h3>
          <div className="text-[10px] text-muted mb-3">
            From <code className="text-ink">docs/05-OPEN-ITEMS-REGISTER.md</code> ·
            {" "}{itemCounts.open} open · {itemCounts.accepted} accepted · {itemCounts.corrected} corrected
          </div>
          {OPEN_ITEMS_REGISTER.map((it) => (
            <div key={it.id} className="grid grid-cols-[26px_1fr_auto] gap-3 items-start py-3 border-b border-lineSoft last:border-0">
              <div className={`w-[26px] h-[26px] rounded-lg font-bold grid place-items-center text-[11px] ${it.status === "open" ? "bg-hi/15 text-hi" : it.status === "accepted" ? "bg-med/15 text-med" : "bg-low/15 text-low"}`}>{it.id}</div>
              <div>
                <b className="text-[12px]">{it.title}</b>
                <div className="text-muted text-[11px] mt-0.5">{it.impact}</div>
                {it.decision && <div className="text-[10px] text-faint mt-1">Decision: {it.decision}</div>}
                <div className="text-[10px] text-muted mt-0.5">Build: {it.buildHandling}</div>
              </div>
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${statusPillClass(it.status)}`}>
                {statusLabel(it.status)}
              </span>
            </div>
          ))}
        </Card>
      </div>

      {gov?.gates && (
        <>
          <div className="sec my-5">Validation gates G0–G6</div>
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-2 max-md:grid-cols-1">
              {gov.gates.map((g) => (
                <div key={g.id} className="flex gap-2 py-2 px-3 rounded-xl bg-panel2 border border-lineSoft text-[11px]">
                  <span className={`pill text-[10px] shrink-0 ${g.passed ? "bg-low/15 text-low" : "bg-hi/15 text-hi"}`}>{g.id}</span>
                  <div>
                    <b>{g.name}</b>
                    <div className="text-muted text-[10px]">{g.detail}</div>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/validation" className="text-[11px] text-muted mt-3 inline-block">Full validation report →</Link>
          </Card>
        </>
      )}

      <div className="sec my-5">Segregation of duties · agents</div>
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 mb-3">
          {(["sayed", "mohsen", "jana"] as const).map((id) => (
            <div key={id} className="flex items-center gap-2">
              <AgentAvatar agent={id} size="sm" />
              <span className="text-[11px] text-muted"><b className="text-ink">{id === "sayed" ? "Sayed" : id === "mohsen" ? "Mohsen" : "Jana"}</b> prepares</span>
            </div>
          ))}
        </div>
        <p className="text-[12px] text-muted m-0">prepared-by ≠ reviewed-by · MLRO owns override &amp; SAR · ConfigMaker ≠ ConfigChecker · every action actor-stamped in the immutable audit log. <b className="text-ink">Humans decide.</b></p>
      </Card>
    </div>
  );
}
