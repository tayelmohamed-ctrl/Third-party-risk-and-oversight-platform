import { useState } from "react";
import { Download, FileText, ExternalLink } from "lucide-react";
import { Card, Sec } from "../ui";
import {
  ZENUS_REVIEW_META,
  ZENUS_PURPOSE_CODES,
  ZENUS_CHANGE_LOG,
  ZENUS_HANDOVER_NOTES,
  zenusRiskCounts,
  type ZenusPurposeCode,
  type ZenusRisk,
} from "../../config/zenusPurposeCodeReview";
import { exportZenusPurposeCodeReviewPdf } from "../../lib/zenusPurposeCodeReviewPdf";

const RISK_PILL: Record<ZenusRisk, string> = {
  Low: "bg-low/15 text-low",
  Medium: "bg-med/15 text-med",
  High: "bg-proh/20 text-[#ff7ea0]",
  Prohibited: "bg-[#8B5CF6]/20 text-[#c9b6f5]",
};

const FLOW_COLS: { key: keyof ZenusPurposeCode["flows"]; label: string }[] = [
  { key: "c2c", label: "C2C" },
  { key: "c2b", label: "C2B" },
  { key: "b2c", label: "B2C" },
  { key: "b2b", label: "B2B" },
  { key: "mal2mal", label: "Mal2Mal" },
];

export default function ZenusPurposeCodeReview() {
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState("");
  const rc = zenusRiskCounts();
  const c = ZENUS_REVIEW_META.counts;

  async function download() {
    setDownloading(true);
    setMsg("");
    try {
      await exportZenusPurposeCodeReviewPdf();
      setMsg("PDF downloaded — reviewed Zenus register");
    } catch {
      setMsg("PDF export failed — try again in browser");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 border-ai/30 bg-ai/5">
        <div className="flex flex-wrap gap-4 items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <FileText size={16} className="text-ai" />
              <h3 className="m-0 text-sm font-display">{ZENUS_REVIEW_META.title}</h3>
              <span className="pill bg-panel2 text-muted text-[10px]">{ZENUS_REVIEW_META.documentId}</span>
              <span className="pill bg-low/15 text-low text-[10px]">Global Account · US</span>
            </div>
            <p className="text-[12px] text-muted mt-2 mb-0">
              MLRO review of the Zenus <b>{ZENUS_REVIEW_META.source}</b> against the US framework
              (<span className="mono text-[11px]">{ZENUS_REVIEW_META.basis}</span>).
              Outcome: <b>{c.unchanged} unchanged · {c.modified} modified · {c.retired} retired · {c.added} added</b> ({c.activeTotal} active).
              This is the Global Account counterpart to the CBUAE/UAE purpose-code catalog shown under Mal Bank.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary flex items-center gap-2 shrink-0"
            disabled={downloading}
            onClick={() => void download()}
          >
            <Download size={14} />
            {downloading ? "Generating PDF…" : "Download reviewed register (PDF)"}
          </button>
        </div>
        {msg && <p className="text-[11px] text-low mt-2 mb-0">{msg}</p>}
      </Card>

      <Card className="p-4 border-l-2 border-ai">
        <div className="text-[10px] uppercase tracking-wide text-faint font-semibold mb-1">Regulatory framing</div>
        <p className="text-[11px] text-muted m-0">{ZENUS_REVIEW_META.framing}</p>
      </Card>

      <div className="grid grid-cols-4 gap-2 max-md:grid-cols-2">
        <Stat n={rc.Low} l="Low tier" cls="text-low" />
        <Stat n={rc.Medium} l="Medium tier" cls="text-med" />
        <Stat n={rc.High} l="High tier" cls="text-proh" />
        <Stat n={rc.Prohibited} l="Prohibited / restricted" cls="text-[#c9b6f5]" />
      </div>

      {/* Register */}
      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-line flex items-center gap-2 flex-wrap">
          <h3 className="m-0 text-sm font-display">Corrected register</h3>
          <span className="text-[10px] text-faint ml-auto">
            <span className="text-ai font-semibold">•</span> changed from Zenus original · validate Convera category per destination country
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-faint text-[9.5px] uppercase border-b border-line">
                <th className="text-left p-2.5">ID</th>
                <th className="text-left p-2.5">Purpose</th>
                <th className="text-left p-2.5">Convera category</th>
                <th className="text-left p-2.5">Type</th>
                {FLOW_COLS.map((f) => <th key={f.key} className="text-center p-2 text-[8.5px]">{f.label}</th>)}
                <th className="text-left p-2.5">Risk</th>
                <th className="text-left p-2.5">EDD / monitoring trigger</th>
              </tr>
            </thead>
            <tbody>
              {ZENUS_PURPOSE_CODES.map((code) => (
                <tr key={code.id} className={`border-b border-lineSoft ${code.retired ? "opacity-55" : ""} ${code.added ? "bg-ai/5" : ""}`}>
                  <td className="p-2.5 mono text-faint whitespace-nowrap">
                    {code.id}{code.changed && <span className="text-ai ml-1">•</span>}
                    {code.retired && <span className="block text-[8.5px] text-faint">retired</span>}
                    {code.added && <span className="block text-[8.5px] text-ai">new</span>}
                  </td>
                  <td className="p-2.5">
                    <div className={`font-semibold ${code.retired ? "line-through text-faint" : "text-ink"}`}>{code.name}</div>
                    {code.note && <div className="text-[9.5px] text-faint mt-0.5">{code.note}</div>}
                  </td>
                  <td className="p-2.5 text-muted">
                    {code.category}
                    {code.categoryWas && <span className="block text-[9px] text-faint">was {code.categoryWas}</span>}
                  </td>
                  <td className="p-2.5">
                    {code.type !== "—" ? <span className="pill bg-panel2 text-muted text-[9px]">{code.type}</span> : <span className="text-faint">—</span>}
                  </td>
                  {FLOW_COLS.map((f) => (
                    <td key={f.key} className="p-2 text-center mono">
                      {code.flows[f.key] ? <span className="text-ai font-bold">Y</span> : <span className="text-faint">·</span>}
                    </td>
                  ))}
                  <td className="p-2.5">
                    {code.risk !== "—"
                      ? <span className={`pill text-[9.5px] ${RISK_PILL[code.risk as ZenusRisk]}`}>{code.risk}</span>
                      : <span className="text-faint">—</span>}
                  </td>
                  <td className="p-2.5 text-muted text-[10px] max-w-[240px]">{code.trigger}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-lineSoft flex flex-wrap gap-3 text-[9.5px] text-faint">
          <span><b className="text-muted">GA</b> all customers</span>
          <span><b className="text-muted">SME</b> business-tier onboarding</span>
          <span><b className="text-muted">Prohibited*</b> blocked unless VA activity licensed &amp; policy-approved</span>
        </div>
      </Card>

      {/* Change log */}
      <Card className="p-4">
        <Sec>Change log — {ZENUS_CHANGE_LOG.length} corrections</Sec>
        <div className="space-y-2 mt-2">
          {ZENUS_CHANGE_LOG.map((chg, i) => (
            <div key={chg.title} className="p-3 rounded-lg border border-lineSoft bg-panel2">
              <div className="flex items-start gap-2.5">
                <span className="shrink-0 grid place-items-center w-5 h-5 rounded-full bg-ai/15 text-ai text-[10px] font-bold mono">{i + 1}</span>
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-ink">{chg.title}</div>
                  <p className="text-[11px] text-muted m-0 mt-0.5">{chg.detail}</p>
                  <div className="text-[9.5px] text-faint mono mt-1">{chg.tag}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Handover */}
      <Card className="p-4">
        <Sec>Before you hand this back to Zenus</Sec>
        <ul className="mt-2 space-y-2 m-0 pl-0 list-none">
          {ZENUS_HANDOVER_NOTES.map((n) => (
            <li key={n.title} className="text-[11px]">
              <span className="text-ink font-semibold">{n.title}.</span>{" "}
              <span className="text-muted">{n.detail}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 pt-3 border-t border-lineSoft flex flex-wrap gap-3 items-center">
          <a
            href={ZENUS_REVIEW_META.artifactUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-ai hover:underline inline-flex items-center gap-1"
          >
            Source review artifact <ExternalLink size={11} />
          </a>
          <span className="text-[10px] text-faint">Reconcile with MAL-TM-PPC-CATALOG-v1.0 · route through model governance before production.</span>
        </div>
      </Card>
    </div>
  );
}

function Stat({ n, l, cls }: { n: number; l: string; cls: string }) {
  return (
    <Card className="p-3">
      <div className={`font-display text-xl font-bold ${cls}`}>{n}</div>
      <div className="text-[10px] text-muted mt-0.5">{l}</div>
    </Card>
  );
}
