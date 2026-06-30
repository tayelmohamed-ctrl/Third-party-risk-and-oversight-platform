import { useMemo, useState } from "react";
import { Card, Sec, AiTag } from "../components/ui";
import AgentBanner from "../components/agents/AgentBanner";
import AgentAiTag from "../components/agents/AgentAiTag";
import {
  REPORTING_AREAS, JURISDICTION_LABEL,
  type ReportingArea, type ReportJurisdiction,
} from "../config/reportingCatalogue";
import templateData from "../data/reporting_templates.json";
import { FIU_ROUTING } from "../config/partnerIntegration";

interface ReportTemplate {
  id: string;
  area: ReportingArea;
  title: string;
  purpose: string;
  trigger: string;
  submittedTo: string;
  jurisdiction: ReportJurisdiction;
  format: string;
  frequency?: string;
  policyRef?: string;
  cramRef?: string;
  tags: string[];
  checklist?: string[];
  body: string;
}

const FORMAT_STYLE: Record<string, string> = {
  report: "bg-ai/15 text-[#c9b6f5]",
  email: "bg-med/15 text-med",
  letter: "bg-panel2 text-muted",
  return: "bg-hi/15 text-hi",
  dashboard: "bg-low/15 text-low",
};

const JURIS_STYLE: Record<string, string> = {
  UAE: "bg-low/15 text-low",
  US: "bg-med/15 text-med",
  both: "bg-ai/15 text-[#c9b6f5]",
  internal: "bg-panel2 text-muted",
};

export default function Reporting() {
  const templates = templateData.templates as ReportTemplate[];
  const [area, setArea] = useState<ReportingArea | "all">("all");
  const [jurisdiction, setJurisdiction] = useState<ReportJurisdiction | "all">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ReportTemplate | null>(templates[0] ?? null);
  const [toast, setToast] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (area !== "all" && t.area !== area) return false;
      if (jurisdiction !== "all" && t.jurisdiction !== jurisdiction && t.jurisdiction !== "both") return false;
      if (!q) return true;
      return [t.id, t.title, t.purpose, t.tags.join(" "), t.submittedTo].join(" ").toLowerCase().includes(q);
    });
  }, [templates, area, jurisdiction, query]);

  const stats = useMemo(() => ({
    total: templates.length,
    uae: templates.filter((t) => t.jurisdiction === "UAE" || t.jurisdiction === "both").length,
    us: templates.filter((t) => t.jurisdiction === "US" || t.jurisdiction === "both").length,
    email: templates.filter((t) => t.format === "email").length,
  }), [templates]);

  function copyTemplate() {
    if (!selected) return;
    void navigator.clipboard.writeText(selected.body);
    setToast(`Copied "${selected.title}" to clipboard`);
    setTimeout(() => setToast(""), 3000);
  }

  return (
    <div>
      <AgentBanner agent="jana" title="Jana — Reporting Centre">
        Professional templates for every regulatory, FIU, management, and operational report — UAE (goAML / CBUAE)
        and US BaaS (FinCEN). Jana drafts from Mohsen&apos;s evidence; the MLRO approves and files. Nothing is submitted autonomously.
      </AgentBanner>

      <div className="grid grid-cols-4 gap-3 mt-4 mb-4 max-md:grid-cols-2">
        <Stat n={String(stats.total)} l="Templates" />
        <Stat n={String(stats.uae)} l="UAE / goAML" c="text-low" />
        <Stat n={String(stats.us)} l="US / FinCEN" c="text-med" />
        <Stat n={String(stats.email)} l="Email / letter drafts" />
      </div>

      <Card className="p-3 mb-4 text-[11px] text-muted flex flex-wrap gap-4">
        <span><b className="text-ink">UAE FIU:</b> {FIU_ROUTING.UAE.system} · {FIU_ROUTING.UAE.regulator}</span>
        <span><b className="text-ink">US BaaS:</b> {FIU_ROUTING.US.system} · {FIU_ROUTING.US.regulator}</span>
        <span><b className="text-ink">Methodology:</b> {templateData.methodology}</span>
      </Card>

      <div className="flex gap-2 flex-wrap mb-4">
        <button type="button" onClick={() => setArea("all")}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${area === "all" ? "bg-ai/20 border-ai" : "border-line text-muted"}`}>
          All areas
        </button>
        {REPORTING_AREAS.map((a) => (
          <button key={a.id} type="button" onClick={() => setArea(a.id)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${area === a.id ? "bg-ai/20 border-ai" : "border-line text-muted"}`}>
            {a.label}
          </button>
        ))}
      </div>

      {area !== "all" && (
        <p className="text-[12px] text-muted mb-3">
          {REPORTING_AREAS.find((a) => a.id === area)?.description}
        </p>
      )}

      <div className="grid grid-cols-[320px_1fr] gap-4 max-lg:grid-cols-1">
        <Card className="p-3 max-h-[70vh] overflow-y-auto">
          <input className="input mb-3 text-[12px]" placeholder="Search templates…" value={query}
            onChange={(e) => setQuery(e.target.value)} />
          <select className="input mb-3 text-[12px]" value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value as ReportJurisdiction | "all")}>
            <option value="all">All jurisdictions</option>
            {(Object.keys(JURISDICTION_LABEL) as ReportJurisdiction[]).map((j) => (
              <option key={j} value={j}>{JURISDICTION_LABEL[j]}</option>
            ))}
          </select>
          <div className="text-[10px] text-faint mb-2">{filtered.length} template(s)</div>
          <div className="space-y-1">
            {filtered.map((t) => (
              <button key={t.id} type="button" onClick={() => setSelected(t)}
                className={`w-full text-left p-2.5 rounded-lg border transition text-[11px] ${
                  selected?.id === t.id ? "border-ai bg-ai/10" : "border-lineSoft hover:bg-panel2"
                }`}>
                <div className="mono text-[9px] text-faint">{t.id}</div>
                <div className="font-semibold text-[12px] mt-0.5 leading-tight">{t.title}</div>
                <div className="flex gap-1 mt-1 flex-wrap">
                  <span className={`pill text-[9px] ${JURIS_STYLE[t.jurisdiction]}`}>{t.jurisdiction}</span>
                  <span className={`pill text-[9px] ${FORMAT_STYLE[t.format] ?? "bg-panel2 text-muted"}`}>{t.format}</span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <div>
          {selected ? (
            <>
              <Card className="p-4 mb-4">
                <div className="flex flex-wrap gap-2 items-start justify-between mb-2">
                  <div>
                    <span className="mono text-[10px] text-faint">{selected.id}</span>
                    <h2 className="m-0 mt-1 text-base font-display">{selected.title}</h2>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="btn btn-ghost text-[11px]" onClick={copyTemplate}>Copy template</button>
                    <button type="button" className="btn text-[11px]" onClick={() => setToast("Draft saved for MLRO review — filing requires explicit approval.")}>
                      Save draft
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[11px] max-md:grid-cols-1">
                  <Meta label="Purpose" value={selected.purpose} />
                  <Meta label="Trigger" value={selected.trigger} />
                  <Meta label="Submitted to" value={selected.submittedTo} />
                  <Meta label="Jurisdiction" value={JURISDICTION_LABEL[selected.jurisdiction]} />
                  {selected.frequency && <Meta label="Frequency" value={selected.frequency} />}
                  {selected.policyRef && <Meta label="Policy ref" value={selected.policyRef} />}
                  {selected.cramRef && <Meta label="CRAM ref" value={selected.cramRef} />}
                </div>
                {selected.checklist && (
                  <div className="mt-3 pt-3 border-t border-lineSoft">
                    <div className="text-[10px] text-faint uppercase mb-1.5">Pre-filing checklist</div>
                    <ul className="text-[11px] text-muted space-y-1 pl-4 list-disc">
                      {selected.checklist.map((c) => <li key={c}>{c}</li>)}
                    </ul>
                  </div>
                )}
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AgentAiTag agent="jana">Jana draft template</AgentAiTag>
                  <span className="text-[10px] text-faint ml-auto">Replace {"{{placeholders}}"} with case data</span>
                </div>
                <pre className="text-[11.5px] leading-relaxed whitespace-pre-wrap font-body m-0 p-3 bg-panel2 rounded-lg border border-lineSoft overflow-x-auto" style={{ color: "#d7ddf0" }}>
                  {selected.body}
                </pre>
              </Card>
            </>
          ) : (
            <Card className="p-4 text-muted">Select a template from the list.</Card>
          )}

          <Sec>Six reporting areas (AML platform standard)</Sec>
          <div className="grid grid-cols-3 gap-3 max-md:grid-cols-1">
            {REPORTING_AREAS.map((a) => {
              const count = templates.filter((t) => t.area === a.id).length;
              return (
                <button key={a.id} type="button" className="text-left w-full" onClick={() => setArea(a.id)}>
                  <Card className="p-3 hover:border-ai/40 transition h-full">
                    <div className="font-semibold text-[12px]">{a.label}</div>
                    <div className="text-[10px] text-muted mt-1">{a.description}</div>
                    <div className="text-[11px] text-ai mt-2">{count} templates</div>
                  </Card>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <Card className="p-4 mt-5">
        <AgentAiTag agent="jana">Executive summary (sample draft)</AgentAiTag>
        <div className="text-[12.5px] leading-relaxed mt-2" style={{ color: "#d7ddf0" }}>
          CRAM health held at 92%. Coverage rose to 84% as Sayed mapped six obligations; eight remain uncovered
          (CBUAE 2026/14 highest priority). 41 STR/SARs filed (UAE goAML: 28 · FinCEN SAR: 13). Round-amount layering
          dominant typology. Manual-vs-system CRA variance 0.06%, within tolerance. No hard-stop bypassed.
          <span className="text-muted"> — MLRO review &amp; edit before sign-off.</span>
        </div>
      </Card>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-panel3 border border-ai text-white px-4 py-3 rounded-xl text-[13px] shadow-2xl max-w-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

function Stat({ n, l, c }: { n: string; l: string; c?: string }) {
  return (
    <Card className="p-3">
      <div className={`font-display text-xl font-bold ${c ?? ""}`}>{n}</div>
      <div className="text-[11px] text-muted">{l}</div>
    </Card>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 bg-panel2 rounded border border-lineSoft">
      <div className="text-[10px] text-faint uppercase">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
