import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui";
import {
  apiCreateEvidenceExport,
  apiCreateLegalHold,
  apiListEvidenceExports,
  apiListLegalHolds,
  apiListRetentionRecords,
  apiReleaseLegalHold,
  apiRetentionPolicies,
  apiRetentionStats,
  apiRunRetentionScheduler,
  type EvidenceExportRun,
  type LegalHoldRecord,
  type RetentionRecordSummary,
  type RetentionStats,
} from "../lib/api";
import { hasOverrideCapability } from "../lib/authSession";

const DISPOSITION_STYLE: Record<string, string> = {
  active: "bg-low/15 text-low",
  approaching_expiry: "bg-med/15 text-med",
  eligible_archive: "bg-ai/15 text-[#c9b6f5]",
  on_hold: "bg-hi/15 text-hi",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function Retention() {
  const canManage = hasOverrideCapability();
  const [stats, setStats] = useState<RetentionStats | null>(null);
  const [holds, setHolds] = useState<LegalHoldRecord[]>([]);
  const [records, setRecords] = useState<RetentionRecordSummary[]>([]);
  const [exports, setExports] = useState<EvidenceExportRun[]>([]);
  const [policies, setPolicies] = useState<{ id: string; label: string }[]>([]);
  const [filter, setFilter] = useState<"all" | "on_hold" | "approaching_expiry" | "eligible_archive">("all");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [holdReason, setHoldReason] = useState("");
  const [holdCustomer, setHoldCustomer] = useState("");
  const [exportPolicy, setExportPolicy] = useState("EXP-FILING-RECEIPTS");
  const [exportCustomer, setExportCustomer] = useState("US-BAAS-0042");

  const refresh = useCallback(async () => {
    try {
      const [s, h, p, ex] = await Promise.all([
        apiRetentionStats(),
        apiListLegalHolds("active"),
        apiRetentionPolicies(),
        apiListEvidenceExports(),
      ]);
      setStats(s);
      setHolds(h.holds);
      setPolicies(p.exportPolicies.map((x) => ({ id: x.id, label: x.label })));
      setExports(ex.exports);
      const rec = await apiListRetentionRecords(
        filter === "all" ? undefined : { disposition: filter },
      );
      setRecords(rec.records.slice(0, 80));
    } catch {
      setStats(null);
      setRecords([]);
    }
  }, [filter]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function handleRunScheduler() {
    setBusy(true);
    setMsg("");
    try {
      const r = await apiRunRetentionScheduler();
      setMsg(`Retention scan complete · ${r.stats.scanned} records · run ${r.runId}`);
      await refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePlaceHold() {
    if (!holdReason.trim()) return;
    setBusy(true);
    try {
      await apiCreateLegalHold({
        scopeType: holdCustomer.trim() ? "customer" : "global",
        customerId: holdCustomer.trim() || undefined,
        scopeId: holdCustomer.trim() || undefined,
        reason: holdReason.trim(),
        matterRef: `LH-${Date.now().toString(36).toUpperCase()}`,
      });
      setHoldReason("");
      setMsg("Legal hold placed");
      await refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReleaseHold(id: string) {
    setBusy(true);
    try {
      await apiReleaseLegalHold(id);
      setMsg("Legal hold released");
      await refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    setBusy(true);
    setMsg("");
    try {
      const r = await apiCreateEvidenceExport({
        policyId: exportPolicy,
        scopeType: exportCustomer.trim() ? "customer" : "global",
        customerId: exportCustomer.trim() || undefined,
      });
      setMsg(`Export ${r.export.exportRef} · ${r.export.recordCount} records${r.deniedOnHold ? ` · ${r.deniedOnHold} blocked by hold` : ""}`);
      await refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function copyExportManifest(exp: EvidenceExportRun) {
    if (!exp.manifest) return;
    void navigator.clipboard.writeText(JSON.stringify(exp.manifest, null, 2));
    setMsg(`Copied manifest ${exp.exportRef}`);
  }

  return (
    <div>
      <p className="text-[13px] text-muted max-w-3xl">
        Record retention registry · legal hold · governed evidence export. Records are append-only — the scheduler marks
        archive eligibility only; no hard deletes. CBUAE §4.6 · FinCEN 31 CFR 1010.430 · Mal Records Management Policy.
      </p>

      {msg && <Card className="p-3 mt-4 text-[12px]">{msg}</Card>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
        {[
          { l: "Records scanned", v: stats?.scanned ?? "—" },
          { l: "Active retention", v: stats?.active ?? "—", c: "text-low" },
          { l: "Approaching expiry", v: stats?.approachingExpiry ?? "—", c: "text-med" },
          { l: "On legal hold", v: stats?.onHold ?? "—", c: "text-hi" },
          { l: "Export runs", v: stats?.exportRuns ?? "—" },
        ].map((k) => (
          <Card key={k.l} className="p-3">
            <div className={`text-xl font-display ${k.c ?? "text-ink"}`}>{k.v}</div>
            <div className="text-[10px] text-faint uppercase font-semibold mt-1">{k.l}</div>
          </Card>
        ))}
      </div>

      <div className="text-[10px] text-muted mt-2">
        Last scheduler run: {fmtDate(stats?.lastRunAt ?? null)}
        {canManage && (
          <button type="button" className="btn btn-ghost text-[11px] ml-3" disabled={busy} onClick={() => void handleRunScheduler()}>
            Run retention scan
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <Card className="p-4">
          <div className="text-[10px] text-faint uppercase font-semibold mb-3">Active legal holds ({holds.length})</div>
          {holds.length === 0 && <p className="text-[12px] text-muted">No active holds.</p>}
          {holds.map((h) => (
            <div key={h.id} className="border border-line rounded-lg p-3 mb-2 text-[12px]">
              <div className="font-semibold">{h.scopeType}{h.customerId ? ` · ${h.customerId}` : ""}</div>
              <div className="text-muted mt-1">{h.reason}</div>
              <div className="text-[10px] text-faint mt-1">{h.matterRef} · {h.placedBy} · {fmtDate(h.placedAt)}</div>
              {canManage && (
                <button type="button" className="btn btn-ghost text-[10px] mt-2" disabled={busy}
                  onClick={() => void handleReleaseHold(h.id)}>Release hold</button>
              )}
            </div>
          ))}
          {canManage && (
            <div className="mt-4 pt-4 border-t border-line space-y-2">
              <div className="text-[10px] text-faint uppercase font-semibold">Place hold (MLRO)</div>
              <input className="input text-[12px]" placeholder="Customer ID (optional — blank = global)" value={holdCustomer}
                onChange={(e) => setHoldCustomer(e.target.value)} />
              <textarea className="input text-[12px] min-h-[60px]" placeholder="Reason / matter description" value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)} />
              <button type="button" className="btn btn-primary text-[11px]" disabled={busy} onClick={() => void handlePlaceHold()}>
                Place legal hold
              </button>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="text-[10px] text-faint uppercase font-semibold mb-3">Evidence export (governed manifest)</div>
          <select className="input text-[12px] mb-2 w-full" value={exportPolicy} onChange={(e) => setExportPolicy(e.target.value)}>
            {policies.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          <input className="input text-[12px] mb-2 w-full" placeholder="Customer ID (optional)" value={exportCustomer}
            onChange={(e) => setExportCustomer(e.target.value)} />
          <button type="button" className="btn btn-primary text-[11px] mb-4" disabled={busy} onClick={() => void handleExport()}>
            Generate export manifest
          </button>
          {exports.slice(0, 5).map((ex) => (
            <div key={ex.id} className="border border-line rounded-lg p-2 mb-2 text-[11px] flex justify-between gap-2">
              <div>
                <span className="mono font-semibold">{ex.exportRef}</span>
                <span className="text-muted"> · {ex.policyId} · {ex.recordCount} rec</span>
                {ex.holdBlockedCount > 0 && <span className="text-hi"> · {ex.holdBlockedCount} blocked</span>}
              </div>
              <button type="button" className="btn btn-ghost text-[10px] shrink-0" onClick={() => copyExportManifest(ex)}>Copy</button>
            </div>
          ))}
        </Card>
      </div>

      <Card className="p-4 mt-4">
        <div className="flex flex-wrap gap-2 items-center justify-between mb-3">
          <div className="text-[10px] text-faint uppercase font-semibold">Retention registry</div>
          <div className="flex gap-2">
            {(["all", "on_hold", "approaching_expiry", "eligible_archive"] as const).map((f) => (
              <button key={f} type="button"
                className={`px-2 py-1 rounded text-[10px] border ${filter === f ? "bg-ai/20 border-ai" : "border-line text-muted"}`}
                onClick={() => setFilter(f)}>{f.replace(/_/g, " ")}</button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-faint border-b border-line">
                <th className="py-2 pr-2">Class</th>
                <th className="py-2 pr-2">Entity</th>
                <th className="py-2 pr-2">Customer</th>
                <th className="py-2 pr-2">Retain until</th>
                <th className="py-2">Disposition</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={`${r.entityType}-${r.entityId}`} className="border-b border-line/50">
                  <td className="py-2 pr-2 mono text-[10px]">{r.recordClass}</td>
                  <td className="py-2 pr-2">{r.entityId.slice(0, 20)}…</td>
                  <td className="py-2 pr-2">{r.customerName ?? r.customerId ?? "—"}</td>
                  <td className="py-2 pr-2">{fmtDate(r.retentionUntil)}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${DISPOSITION_STYLE[r.disposition] ?? ""}`}>
                      {r.disposition.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-muted mt-3">
          Related: <Link to="/audit" className="text-ai">Audit log</Link>
          {" · "}
          <Link to="/reporting" className="text-ai">Reporting</Link>
          {" · "}
          <Link to="/examination" className="text-ai">FFIEC matrix</Link>
        </p>
      </Card>
    </div>
  );
}
