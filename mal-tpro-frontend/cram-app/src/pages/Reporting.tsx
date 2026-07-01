import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, Sec, AiTag } from "../components/ui";
import AgentBanner from "../components/agents/AgentBanner";
import AgentAiTag from "../components/agents/AgentAiTag";
import {
  REPORTING_AREAS, JURISDICTION_LABEL,
  type ReportingArea, type ReportJurisdiction,
} from "../config/reportingCatalogue";
import templateData from "../data/reporting_templates.json";
import { FIU_ROUTING } from "../config/partnerIntegration";
import { CBUAE_STR_GUIDANCE, STR_FILING_SLA, GOAML_REPORT_TYPES } from "../config/cbuaeReportingGuidance";
import { CTR_FILING_SLA } from "../config/fincenCtrGuidance";
import {
  apiFilingStats,
  apiGetFilingDraft,
  apiListFilingDrafts,
  apiMlroApproveFiling,
  apiSubmitFilingReview,
  apiSubmitFilingToFiu,
  apiCtrStats,
  apiListCtrObligations,
  apiCreateCtrDraft,
  type FilingDraftRecord,
  type CtrObligationRecord,
} from "../lib/api";
import { hasOverrideCapability } from "../lib/authSession";
import { evaluateDraftCompliance } from "../config/filingGuidanceRequirements";
import { evaluateCtrCompliance } from "../config/ctrGuidanceRequirements";
import { normalizeDraftBody } from "../lib/filingDraftDocument";
import FilingDraftEditor from "../components/reporting/FilingDraftEditor";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const templates = templateData.templates as ReportTemplate[];
  const [view, setView] = useState<"templates" | "drafts" | "ctr">(
    searchParams.get("draft") ? "drafts" : searchParams.has("ctr") ? "ctr" : "templates",
  );
  const [area, setArea] = useState<ReportingArea | "all">("all");
  const [jurisdiction, setJurisdiction] = useState<ReportJurisdiction | "all">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ReportTemplate | null>(templates[0] ?? null);
  const [drafts, setDrafts] = useState<FilingDraftRecord[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<FilingDraftRecord | null>(null);
  const [draftStats, setDraftStats] = useState({ total: 0, draft: 0, pendingReview: 0 });
  const [ctrObligations, setCtrObligations] = useState<CtrObligationRecord[]>([]);
  const [ctrStats, setCtrStats] = useState({ total: 0, pending: 0, draftCreated: 0, filed: 0, overdue: 0, dueSoon: 0 });
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const canMlro = hasOverrideCapability();

  const refreshDrafts = useCallback(async () => {
    try {
      const [{ drafts: list }, stats] = await Promise.all([
        apiListFilingDrafts(),
        apiFilingStats(),
      ]);
      setDrafts(list);
      setDraftStats(stats);
      const draftId = searchParams.get("draft");
      if (draftId) {
        const found = list.find((d) => d.id === draftId);
        if (found) setSelectedDraft(found);
        else setSelectedDraft(await apiGetFilingDraft(draftId));
      } else if (list.length) {
        setSelectedDraft((prev) => prev ?? list[0]);
      }
    } catch {
      setDrafts([]);
    }
  }, [searchParams]);

  const refreshCtr = useCallback(async () => {
    try {
      const [list, stats] = await Promise.all([apiListCtrObligations(), apiCtrStats()]);
      setCtrObligations(list.obligations);
      setCtrStats(stats);
    } catch {
      setCtrObligations([]);
    }
  }, []);

  useEffect(() => { void refreshDrafts(); }, [refreshDrafts]);
  useEffect(() => { if (view === "ctr") void refreshCtr(); }, [view, refreshCtr]);

  useEffect(() => {
    if (searchParams.get("draft")) setView("drafts");
  }, [searchParams]);

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

  function copyDraft() {
    if (!selectedDraft) return;
    const doc = normalizeDraftBody(selectedDraft.body);
    const text = doc?.renderedText ?? (selectedDraft.body && "renderedText" in selectedDraft.body ? selectedDraft.body.renderedText : "");
    if (!text) return;
    void navigator.clipboard.writeText(text);
    setToast("Copied full filing draft to clipboard");
    setTimeout(() => setToast(""), 3000);
  }

  const draftCompliance = useMemo(() => {
    if (!selectedDraft?.body) return null;
    const doc = normalizeDraftBody(selectedDraft.body);
    if (!doc) return null;
    if (doc.reportType === "CTR_US") {
      return evaluateCtrCompliance(doc.sections);
    }
    return evaluateDraftCompliance({
      sections: doc.sections,
      reportType: doc.reportType,
      fiuId: doc.fiu.id,
      defensiveFilingDenied: doc.defensiveFilingDenied,
    });
  }, [selectedDraft?.body, selectedDraft?.id]);

  async function handleCreateCtrDraft(obligationId: string) {
    setBusy(true);
    try {
      const { draftId } = await apiCreateCtrDraft(obligationId);
      setView("drafts");
      setSearchParams({ draft: draftId });
      await refreshDrafts();
      await refreshCtr();
      setToast("CTR Form 104 draft created — complete TIN/account fields before review");
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusy(false);
      setTimeout(() => setToast(""), 4000);
    }
  }

  async function handleSubmitReview() {
    if (!selectedDraft) return;
    if (draftCompliance?.blockers.length) {
      setToast(`Complete required fields before review: ${draftCompliance.blockers.slice(0, 2).join("; ")}${draftCompliance.blockers.length > 2 ? "…" : ""}`);
      setTimeout(() => setToast(""), 5000);
      return;
    }
    setBusy(true);
    try {
      const updated = await apiSubmitFilingReview(selectedDraft.id);
      setSelectedDraft(updated);
      await refreshDrafts();
      setToast("Draft submitted for maker-checker review");
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusy(false);
      setTimeout(() => setToast(""), 3500);
    }
  }

  async function handleSubmitFiu() {
    if (!selectedDraft) return;
    setBusy(true);
    try {
      const result = await apiSubmitFilingToFiu(selectedDraft.id);
      setSelectedDraft(result.draft);
      await refreshDrafts();
      setToast(`Submitted to ${result.submission.fiuSystem} · ref ${result.submission.fiuReference}`);
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusy(false);
      setTimeout(() => setToast(""), 5000);
    }
  }

  async function handleMlroApprove() {
    if (!selectedDraft) return;
    setBusy(true);
    try {
      const updated = await apiMlroApproveFiling(selectedDraft.id);
      setSelectedDraft(updated);
      await refreshDrafts();
      setToast("MLRO approved — ready for FIU submission (manual goAML step)");
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusy(false);
      setTimeout(() => setToast(""), 3500);
    }
  }

  function selectDraft(d: FilingDraftRecord) {
    setSelectedDraft(d);
    setSearchParams({ draft: d.id });
  }

  const STATUS_STYLE: Record<string, string> = {
    draft: "bg-med/15 text-med",
    pending_review: "bg-ai/15 text-ai",
    mlro_approved: "bg-low/15 text-low",
    submitted: "bg-panel2 text-muted",
  };

  return (
    <div>
      <AgentBanner agent="jana" title="Jana — Reporting Centre">
        Professional templates aligned to CBUAE Notice 3354/2022 STR/SAR guidance and the Jan 2023 Thematic Review —
        UAE (goAML) and US BaaS (FinCEN). Jana drafts from Mohsen&apos;s evidence; the MLRO approves and files. Nothing is submitted autonomously.
      </AgentBanner>

      <div className="grid grid-cols-4 gap-3 mt-4 mb-4 max-md:grid-cols-2">
        <Stat n={String(stats.total)} l="Templates" />
        <Stat n={String(stats.uae)} l="UAE / goAML" c="text-low" />
        <Stat n={String(stats.us)} l="US / FinCEN" c="text-med" />
        <Stat n={String(draftStats.total)} l="Live filing drafts" c="text-ai" />
      </div>

      <div className="flex gap-2 mb-4">
        <button type="button" onClick={() => setView("templates")}
          className={`px-4 py-2 rounded-lg text-[12px] font-semibold border ${view === "templates" ? "bg-ai/20 border-ai" : "border-line text-muted"}`}>
          Template library
        </button>
        <button type="button" onClick={() => { setView("drafts"); void refreshDrafts(); }}
          className={`px-4 py-2 rounded-lg text-[12px] font-semibold border ${view === "drafts" ? "bg-ai/20 border-ai" : "border-line text-muted"}`}>
          STR/SAR drafts ({draftStats.total})
        </button>
        <button type="button" onClick={() => { setView("ctr"); void refreshCtr(); }}
          className={`px-4 py-2 rounded-lg text-[12px] font-semibold border ${view === "ctr" ? "bg-ai/20 border-ai" : "border-line text-muted"}`}>
          US CTR queue ({ctrStats.pending + ctrStats.draftCreated})
        </button>
      </div>

      <Card className="p-3 mb-4 text-[11px] text-muted flex flex-wrap gap-4">
        <span><b className="text-ink">UAE FIU:</b> {FIU_ROUTING.UAE.system} · {FIU_ROUTING.UAE.regulator}</span>
        <span><b className="text-ink">US BaaS:</b> {FIU_ROUTING.US.system} · SAR + CTR Form 104</span>
        <span><b className="text-ink">STR SLA:</b> {STR_FILING_SLA.standardBusinessDaysFromAlert} business days</span>
        <span><b className="text-ink">CTR SLA:</b> {CTR_FILING_SLA.deadlineDays} calendar days · ≥ ${CTR_FILING_SLA.thresholdUsd.toLocaleString()} cash</span>
        <span><b className="text-ink">Guidance:</b> {CBUAE_STR_GUIDANCE.notice} · {CBUAE_STR_GUIDANCE.thematicReview}</span>
        <span><b className="text-ink">goAML types:</b> {GOAML_REPORT_TYPES.map((t) => t.code).join(", ")}</span>
      </Card>

      {view === "ctr" ? (
        <div className="grid grid-cols-[320px_1fr] gap-4 max-lg:grid-cols-1">
          <Card className="p-3">
            <div className="text-[10px] text-faint mb-2">
              {ctrStats.pending} pending · {ctrStats.draftCreated} draft · {ctrStats.filed} filed
              {ctrStats.overdue > 0 && <span className="text-hi"> · {ctrStats.overdue} overdue</span>}
            </div>
            <div className="space-y-1 max-h-[70vh] overflow-y-auto">
              {ctrObligations.length === 0 && (
                <p className="text-[12px] text-muted">No CTR obligations. US cash transactions ≥ $10,000 auto-register from TM.</p>
              )}
              {ctrObligations.map((o) => (
                <div key={o.id} className="p-2.5 rounded-lg border border-lineSoft text-[11px]">
                  <div className="font-semibold">{o.customerName}</div>
                  <div className="text-muted">${o.aggregateUsd.toLocaleString()} · {o.transactionDate.slice(0, 10)}</div>
                  <div className="text-[10px] text-faint">Due {o.dueAt.slice(0, 10)} · {o.status}</div>
                  {o.filingDraftId ? (
                    <button type="button" className="btn text-[10px] mt-2" onClick={() => { setView("drafts"); setSearchParams({ draft: o.filingDraftId! }); void refreshDrafts(); }}>
                      Open draft
                    </button>
                  ) : o.status === "pending" ? (
                    <button type="button" className="btn text-[10px] mt-2" disabled={busy} onClick={() => void handleCreateCtrDraft(o.id)}>
                      Create Form 104 draft
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="m-0 text-sm font-display">US CTR programme — FinCEN Form 104</h3>
            <p className="text-[12px] text-muted mt-2">
              Cash transactions ≥ ${CTR_FILING_SLA.thresholdUsd.toLocaleString()} on US BaaS customers register automatically from TM.
              Jana creates Form 104 drafts; BSA officer reviews and submits via FinCEN BSA E-File (mock/live).
            </p>
            <ul className="text-[11px] text-muted mt-3 space-y-1 list-disc pl-4">
              <li>Maker-checker: draft → review → MLRO approve → FinCEN submit</li>
              <li>15-day filing deadline from transaction date (31 CFR 1010.311)</li>
              <li>Aggregation of multiple same-day cash transactions supported</li>
            </ul>
          </Card>
        </div>
      ) : view === "drafts" ? (
        <div className="grid grid-cols-[320px_1fr] gap-4 max-lg:grid-cols-1">
          <Card className="p-3 max-h-[70vh] overflow-y-auto">
            <div className="text-[10px] text-faint mb-2">
              {draftStats.draft} draft · {draftStats.pendingReview} in review
            </div>
            {drafts.length === 0 && (
              <p className="text-[12px] text-muted">
                No drafts yet. Escalate a case from{" "}
                <Link to="/investigation" className="text-ai hover:underline">Investigation Hub</Link>
                {" "}to auto-create a Jana STR/SAR draft.
              </p>
            )}
            <div className="space-y-1">
              {drafts.map((d) => (
                <button key={d.id} type="button" onClick={() => selectDraft(d)}
                  className={`w-full text-left p-2.5 rounded-lg border transition text-[11px] ${
                    selectedDraft?.id === d.id ? "border-ai bg-ai/10" : "border-lineSoft hover:bg-panel2"
                  }`}>
                  <div className="mono text-[9px] text-faint">{d.templateId}</div>
                  <div className="font-semibold text-[12px] mt-0.5 leading-tight">{d.title ?? d.filingType}</div>
                  <div className="text-muted text-[10px] mt-0.5">{d.customerName}</div>
                  <span className={`pill text-[9px] mt-1 inline-block ${STATUS_STYLE[d.status] ?? "bg-panel2"}`}>{d.status}</span>
                </button>
              ))}
            </div>
          </Card>

          <div>
            {selectedDraft ? (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedDraft.status === "draft" && (
                    <button
                      type="button"
                      className="btn text-[11px]"
                      disabled={busy || (draftCompliance?.blockers.length ?? 0) > 0}
                      title={draftCompliance?.blockers.length ? draftCompliance.blockers.slice(0, 3).join("; ") : undefined}
                      onClick={() => void handleSubmitReview()}
                    >
                      Submit for review
                      {draftCompliance && draftCompliance.blockers.length > 0 && (
                        <span className="ml-1 text-hi">({draftCompliance.score}/{draftCompliance.total})</span>
                      )}
                    </button>
                  )}
                  {selectedDraft.status === "pending_review" && canMlro && (
                    <button type="button" className="btn text-[11px]" disabled={busy} onClick={() => void handleMlroApprove()}>
                      MLRO approve
                    </button>
                  )}
                  {selectedDraft.status === "mlro_approved" && canMlro && (
                    <button type="button" className="btn text-[11px]" disabled={busy} onClick={() => void handleSubmitFiu()}>
                      {selectedDraft.filingType === "ctr_us"
                        ? "Submit to FinCEN (Form 104 CTR)"
                        : "Submit to FIU (goAML / FinCEN SAR)"}
                    </button>
                  )}
                  {selectedDraft.status === "submitted" && (
                    <span className="pill bg-low/15 text-low text-[10px] self-center">Filed with FIU</span>
                  )}
                  <Link to="/investigation" className="btn btn-ghost text-[11px]">Investigation →</Link>
                  <span className={`pill text-[10px] ml-auto self-center ${STATUS_STYLE[selectedDraft.status] ?? ""}`}>
                    {selectedDraft.status.replace("_", " ")}
                  </span>
                </div>
                <FilingDraftEditor
                  draft={selectedDraft}
                  readOnly={selectedDraft.status === "mlro_approved" || selectedDraft.status === "submitted"}
                  onCopy={copyDraft}
                  onSaved={(updated) => {
                    setSelectedDraft(updated);
                    void refreshDrafts();
                    setToast("Draft saved");
                    setTimeout(() => setToast(""), 2500);
                  }}
                />
              </>
            ) : (
              <Card className="p-4 text-muted">Select a filing draft or escalate a case from Investigation Hub.</Card>
            )}
          </div>
        </div>
      ) : (
        <>
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
        </>
      )}

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
