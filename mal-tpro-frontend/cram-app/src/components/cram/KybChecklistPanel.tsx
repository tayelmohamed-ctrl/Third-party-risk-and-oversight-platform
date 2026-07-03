import { useMemo, useState } from "react";
import { Download, FileJson, ClipboardCheck } from "lucide-react";
import { Card } from "../ui";
import AgentAiTag from "../agents/AgentAiTag";
import MalLogo from "../MalLogo";
import {
  buildKybChecklist,
  kybProductSummary,
  type KybCaseContext,
  type KybChecklistPackage,
} from "../../lib/kybChecklistBuilder";
import { exportKybChecklistJson, exportKybChecklistPdf } from "../../lib/kybChecklistPdf";
import { KYB_PRODUCT_LABELS, type KybProduct } from "../../config/kybDocumentMatrix";

interface Props {
  context: KybCaseContext;
  compact?: boolean;
  onProductsChange?: (products: KybProduct[]) => void;
}

const ALL_PRODUCTS: KybProduct[] = ["uae_iban", "global_account", "financing"];

const LEVEL_STYLE: Record<string, string> = {
  mandatory: "bg-low/15 text-low border-low/30",
  conditional: "bg-med/15 text-med border-med/30",
};

const RATING_STYLE: Record<string, string> = {
  Low: "text-low",
  Medium: "text-med",
  High: "text-hi",
};

function ChecklistTable({
  title,
  items,
  onStatusChange,
}: {
  title: string;
  items: KybChecklistPackage["coreItems"];
  onStatusChange?: (id: string, status: "pending" | "collected" | "waived") => void;
}) {
  if (!items.length) return null;
  return (
    <div className="mt-4">
      <div className="text-[10px] uppercase tracking-wide text-faint font-semibold mb-2">{title}</div>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-[11.5px] border-collapse">
          <thead>
            <tr className="bg-[#0c1233] text-white text-left">
              <th className="px-3 py-2.5 font-semibold min-w-[220px]">Document</th>
              <th className="px-3 py-2.5 font-semibold w-24">Level</th>
              <th className="px-3 py-2.5 font-semibold min-w-[140px]">CRAM / MLRO note</th>
              <th className="px-3 py-2.5 font-semibold w-28">Policy</th>
              {onStatusChange && <th className="px-3 py-2.5 font-semibold w-28">Status</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} className={i % 2 ? "bg-panel2/50" : "bg-panel"}>
                <td className="px-3 py-2.5 border-t border-lineSoft align-top">{item.document}</td>
                <td className="px-3 py-2.5 border-t border-lineSoft align-top">
                  <span className={`pill text-[9px] border ${LEVEL_STYLE[item.effectiveLevel] ?? ""}`}>
                    {item.effectiveLevel}
                  </span>
                </td>
                <td className="px-3 py-2.5 border-t border-lineSoft align-top text-muted">{item.cramNote}</td>
                <td className="px-3 py-2.5 border-t border-lineSoft align-top mono text-[10px] text-faint">{item.policyRef}</td>
                {onStatusChange && (
                  <td className="px-3 py-2.5 border-t border-lineSoft align-top">
                    <select
                      className="input text-[10px] py-1"
                      value={item.status === "not_applicable" ? "pending" : item.status}
                      onChange={(e) => onStatusChange(item.id, e.target.value as "pending" | "collected" | "waived")}
                    >
                      <option value="pending">Pending</option>
                      <option value="collected">Collected</option>
                      <option value="waived">Waived</option>
                    </select>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function KybChecklistPanel({ context, compact, onProductsChange }: Props) {
  const [products, setProducts] = useState<KybProduct[]>(context.products);
  const [statusMap, setStatusMap] = useState<Record<string, "pending" | "collected" | "waived">>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const ctx = useMemo(() => ({ ...context, products }), [context, products]);
  const base = useMemo(() => buildKybChecklist(ctx), [ctx]);

  const pkg = useMemo(() => {
    const apply = (items: typeof base.coreItems) =>
      items.map((item) => ({
        ...item,
        status: statusMap[item.id] ?? item.status,
      }));
    return {
      ...base,
      coreItems: apply(base.coreItems),
      entityItems: apply(base.entityItems),
    };
  }, [base, statusMap]);

  function toggleProduct(p: KybProduct) {
    setProducts((prev) => {
      const next = prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p];
      if (next.length === 0) return prev;
      onProductsChange?.(next);
      return next;
    });
  }

  async function downloadPdf() {
    setBusy(true);
    setMsg("");
    try {
      await exportKybChecklistPdf(pkg);
      setMsg("PDF downloaded");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(""), 3500);
    }
  }

  function downloadJson() {
    exportKybChecklistJson(pkg);
    setMsg("JSON audit trail downloaded");
    setTimeout(() => setMsg(""), 2500);
  }

  if (pkg.prohibited) {
    return (
      <Card className="p-4 border border-hi/40 bg-hi/5">
        <AgentAiTag agent="sayed">KYB checklist blocked</AgentAiTag>
        <p className="text-[13px] text-hi mt-2 font-semibold">{pkg.prohibitedReason}</p>
        <p className="text-[12px] text-muted mt-1">CRAM OVR-006 — relationship must not proceed.</p>
      </Card>
    );
  }

  const mandatoryCount = [...pkg.coreItems, ...pkg.entityItems].filter((i) => i.effectiveLevel === "mandatory").length;
  const collectedCount = [...pkg.coreItems, ...pkg.entityItems].filter((i) => i.status === "collected").length;

  return (
    <Card className="overflow-hidden">
      <div
        className="px-5 py-4 flex flex-wrap gap-4 items-start justify-between"
        style={{ background: "linear-gradient(135deg, #0c1233 0%, #1a1c52 50%, #0f2847 100%)" }}
      >
        <div className="flex gap-3 items-center">
          <div className="w-11 h-11 rounded-xl bg-white/10 grid place-items-center border border-white/15">
            <MalLogo size={32} />
          </div>
          <div>
            <div className="font-display font-bold text-white text-[15px]">Mal FinCrime OS</div>
            <div className="text-[10px] text-white/70 uppercase tracking-[0.12em]">KYB Document Checklist · Sayed</div>
            <div className="text-[10px] text-white/50 mono mt-0.5">{pkg.caseRef}</div>
          </div>
        </div>
        <div className="text-right text-[11px] text-white/85">
          <div className="font-semibold text-white">{pkg.customerName}</div>
          <div className="text-white/60 mono text-[10px]">{pkg.customerId}</div>
          <div className={`font-bold mt-1 ${RATING_STYLE[pkg.cramRating] ?? "text-white"}`}>
            CRAM {pkg.cramRating} · {pkg.ddLevel}
          </div>
        </div>
      </div>

      <div className="p-4">
        {!compact && (
          <div className="flex flex-wrap gap-2 mb-3">
            {ALL_PRODUCTS.map((p) => (
              <button
                key={p}
                type="button"
                className={`pill text-[10px] border transition ${products.includes(p) ? "bg-ai/20 border-ai text-ai" : "border-line text-muted"}`}
                onClick={() => toggleProduct(p)}
              >
                {KYB_PRODUCT_LABELS[p]}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2 mb-3">
          <MiniStat label="Products" value={kybProductSummary(products)} />
          <MiniStat label="Mandatory items" value={String(mandatoryCount)} />
          <MiniStat label="Collected" value={`${collectedCount} / ${pkg.coreItems.length + pkg.entityItems.length}`} />
          <MiniStat label="Review cycle" value={`${pkg.reviewMonths} mo`} />
        </div>

        <div className="flex flex-wrap gap-2 items-center mb-2">
          <AgentAiTag agent="sayed">CRAM-tailored checklist</AgentAiTag>
          <span className="text-[10px] text-muted">{pkg.entityType}</span>
          <div className="ml-auto flex gap-2">
            <button type="button" className="btn btn-ghost text-[11px]" disabled={busy} onClick={() => void downloadPdf()}>
              <Download size={13} /> Export PDF
            </button>
            <button type="button" className="btn btn-ghost text-[11px]" onClick={downloadJson}>
              <FileJson size={13} /> JSON
            </button>
          </div>
        </div>

        {pkg.escalations.length > 0 && (
          <div className="rounded-lg border border-med/30 bg-med/10 px-3 py-2 mb-2">
            <div className="text-[10px] font-semibold text-med uppercase mb-1">CRAM escalations</div>
            <ul className="text-[11px] text-muted m-0 pl-4 space-y-0.5">
              {pkg.escalations.map((e) => <li key={e}>{e}</li>)}
            </ul>
          </div>
        )}

        <ChecklistTable
          title="Core document matrix"
          items={pkg.coreItems}
          onStatusChange={(id, status) => setStatusMap((m) => ({ ...m, [id]: status }))}
        />
        <ChecklistTable
          title="Entity-type conditional documents"
          items={pkg.entityItems}
          onStatusChange={(id, status) => setStatusMap((m) => ({ ...m, [id]: status }))}
        />

        <div className="mt-4 pt-3 border-t border-lineSoft">
          <div className="text-[10px] text-faint uppercase mb-1">Policy basis</div>
          <ul className="text-[10px] text-muted m-0 pl-4 space-y-0.5">
            {pkg.guidelines.policyBasis.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </div>

        {msg && <div className="text-[11px] text-ai mt-3">{msg}</div>}
      </div>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-lg border border-lineSoft bg-panel2">
      <div className="text-[9px] uppercase text-faint">{label}</div>
      <div className="text-[12px] font-semibold mt-0.5 truncate" title={value}>{value}</div>
    </div>
  );
}

export function KybChecklistEmpty() {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted">
        <ClipboardCheck size={18} />
        <span className="text-[12px]">Switch to Entity mode and complete CRAM scoring to generate a KYB checklist.</span>
      </div>
    </Card>
  );
}
