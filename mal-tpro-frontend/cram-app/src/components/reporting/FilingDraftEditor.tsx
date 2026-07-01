import { useCallback, useEffect, useMemo, useState } from "react";
import MalLogo from "../MalLogo";
import AgentAiTag from "../agents/AgentAiTag";
import { Card } from "../ui";
import { FIU_LIST, type FiuDestinationId } from "../../config/fiuRegistry";
import {
  ANNEX1_ANTI_PATTERNS,
  evaluateDraftCompliance,
  GUIDANCE_FOOTNOTES,
} from "../../config/filingGuidanceRequirements";
import { evaluateCtrCompliance } from "../../config/ctrGuidanceRequirements";
import { CTR_FILING_SLA } from "../../config/fincenCtrGuidance";
import {
  SECTION_GROUP_LABELS,
  applyFiuChange,
  applyReportTypeChange,
  composeRenderedText,
  normalizeDraftBody,
  updateDraftFlags,
  updateFiuContact,
  updateSection,
  type FilingDraftDocument,
  type FilingReportType,
  type FilingSectionGroup,
} from "../../lib/filingDraftDocument";
import { apiSaveFilingDraft, type FilingDraftRecord } from "../../lib/api";

const GROUP_ORDER: FilingSectionGroup[] = [
  "cover", "introduction", "narrative", "transactions", "investigation", "compliance", "mlro", "fincen", "ctr",
];

interface Props {
  draft: FilingDraftRecord;
  onSaved: (updated: FilingDraftRecord) => void;
  onCopy?: () => void;
  readOnly?: boolean;
}

export default function FilingDraftEditor({ draft, onSaved, onCopy, readOnly }: Props) {
  const [doc, setDoc] = useState<FilingDraftDocument | null>(null);
  const [activeGroup, setActiveGroup] = useState<FilingSectionGroup>("cover");
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const normalized = normalizeDraftBody(draft.body);
    setDoc(normalized);
    setActiveGroup(normalized?.reportType === "CTR_US" ? "ctr" : "cover");
    setDirty(false);
  }, [draft.id, draft.body]);

  const visibleGroups = useMemo(() => {
    if (!doc) return GROUP_ORDER;
    return GROUP_ORDER.filter((g) => doc.sections.some((s) => s.group === g));
  }, [doc]);

  const sectionsInGroup = useMemo(
    () => doc?.sections.filter((s) => s.group === activeGroup) ?? [],
    [doc, activeGroup],
  );

  const compliance = useMemo(() => {
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
  }, [doc]);

  const isCtr = doc?.reportType === "CTR_US";

  const patchDoc = useCallback((next: FilingDraftDocument) => {
    setDoc(next);
    setDirty(true);
  }, []);

  function handleSectionChange(sectionId: string, value: string) {
    if (!doc) return;
    patchDoc(updateSection(doc, sectionId, value));
  }

  function handleFiuSelect(fiuId: FiuDestinationId) {
    if (!doc) return;
    const hasTxn = doc.reportType === "STR";
    patchDoc(applyFiuChange(doc, fiuId, hasTxn));
  }

  function handleReportType(reportType: FilingReportType) {
    if (!doc || doc.fiu.id === "US") return;
    patchDoc(applyReportTypeChange(doc, reportType));
  }

  function handleContactChange(
    field: "contactName" | "contactEmail" | "contactPhone" | "contactTitle" | "portalUrl",
    value: string,
  ) {
    if (!doc) return;
    patchDoc(updateFiuContact(doc, { [field]: value }));
  }

  async function handleSave() {
    if (!doc || readOnly) return;
    setSaving(true);
    setMsg("");
    try {
      const payload = { ...doc, renderedText: composeRenderedText(doc), lastEditedAt: new Date().toISOString() };
      const updated = await apiSaveFilingDraft(draft.id, payload);
      onSaved(updated);
      setDirty(false);
      setMsg("Draft saved");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 3000);
    }
  }

  if (!doc) {
    return <Card className="p-6 text-muted">Loading draft…</Card>;
  }

  const pct = compliance ? Math.round((compliance.score / Math.max(compliance.total, 1)) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line overflow-hidden shadow-xl">
        <div
          className="px-6 py-5 flex flex-wrap gap-4 items-start justify-between"
          style={{ background: "linear-gradient(135deg, #0c1233 0%, #1a1c52 50%, #0f2847 100%)" }}
        >
          <div className="flex gap-4 items-center">
            <div className="w-12 h-12 rounded-xl bg-white/10 grid place-items-center border border-white/15">
              <MalLogo size={36} />
            </div>
            <div>
              <div className="font-display font-bold text-lg text-white tracking-tight">Mal FinCrime OS</div>
              <div className="text-[11px] text-white/70 uppercase tracking-[0.14em] mt-0.5">
                {isCtr
                  ? `CTR · FinCEN Form 104 · ${CTR_FILING_SLA.policyRef}`
                  : "STR / SAR · CBUAE 3354/2022 · FFIEC App L"}
              </div>
              <div className="text-[10px] text-white/50 mt-1 mono">{doc.caseNumber ?? draft.id}</div>
            </div>
          </div>
          <div className="text-right text-[11px] text-white/80">
            <div className="pill bg-white/10 text-white text-[10px] inline-block mb-1">{doc.reportType}</div>
            <div>{draft.customerName}</div>
            <div className="text-white/50 mono text-[10px]">{draft.customerId}</div>
            {compliance && (
              <div className={`mt-2 font-semibold ${pct >= 80 ? "text-low" : pct >= 50 ? "text-med" : "text-hi"}`}>
                Guidance readiness: {compliance.score}/{compliance.total} ({pct}%)
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-panel2 border-b border-line grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
          <div className="space-y-3">
            {!isCtr && (
            <>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-faint font-semibold block mb-1.5">
                FIU destination
              </label>
              <select
                className="input w-full text-[13px]"
                value={doc.fiu.id}
                disabled={readOnly}
                onChange={(e) => handleFiuSelect(e.target.value as FiuDestinationId)}
              >
                {FIU_LIST.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </div>
            {doc.fiu.id === "UAE" && (
              <div>
                <label className="text-[10px] uppercase tracking-wide text-faint font-semibold block mb-1.5">
                  UAE report type (CBUAE §3.2)
                </label>
                <select
                  className="input w-full text-[13px]"
                  value={doc.reportType}
                  disabled={readOnly}
                  onChange={(e) => handleReportType(e.target.value as FilingReportType)}
                >
                  <option value="STR">STR — executed suspicious transactions</option>
                  <option value="SAR">SAR — non-transaction / attempted activity</option>
                </select>
              </div>
            )}
            <div className="flex flex-wrap gap-3 text-[11px]">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={doc.expeditedFiling ?? false}
                  disabled={readOnly}
                  onChange={(e) => patchDoc(updateDraftFlags(doc, { expeditedFiling: e.target.checked }))}
                />
                Expedited (24h · §4.7)
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={doc.complexInvestigation ?? false}
                  disabled={readOnly}
                  onChange={(e) => patchDoc(updateDraftFlags(doc, { complexInvestigation: e.target.checked }))}
                />
                Complex investigation (15+30 days · §4.5)
              </label>
            </div>
            </>
            )}
            {isCtr && (
              <p className="text-[11px] text-muted m-0">
                FinCEN BSA E-File · file within {CTR_FILING_SLA.deadlineDays} calendar days of transaction date.
                Threshold: ${CTR_FILING_SLA.thresholdUsd.toLocaleString()} USD cash (31 CFR 1010.311).
              </p>
            )}
            {!isCtr && (
            <label className="flex items-start gap-2 text-[11px] text-muted">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={doc.defensiveFilingDenied ?? false}
                disabled={readOnly}
                onChange={(e) => patchDoc(updateDraftFlags(doc, { defensiveFilingDenied: e.target.checked }))}
              />
              <span>
                I confirm this is <b className="text-ink">not a defensive filing</b> — genuine suspicion documented
                (CBUAE §3.3.1 · Thematic Review)
              </span>
            </label>
            )}
          </div>
          <div className="p-3 rounded-xl bg-panel border border-lineSoft text-[11px] space-y-2">
            <div className="font-semibold text-ink">{doc.fiu.regulator}</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-faint text-[9px] uppercase">Contact name</span>
                <input className="input w-full mt-0.5 text-[11px]" value={doc.fiu.contactName} disabled={readOnly}
                  onChange={(e) => handleContactChange("contactName", e.target.value)} />
              </label>
              <label className="block">
                <span className="text-faint text-[9px] uppercase">Title</span>
                <input className="input w-full mt-0.5 text-[11px]" value={doc.fiu.contactTitle} disabled={readOnly}
                  onChange={(e) => handleContactChange("contactTitle", e.target.value)} />
              </label>
              <label className="block">
                <span className="text-faint text-[9px] uppercase">Email</span>
                <input className="input w-full mt-0.5 text-[11px]" type="email" value={doc.fiu.contactEmail} disabled={readOnly}
                  onChange={(e) => handleContactChange("contactEmail", e.target.value)} />
              </label>
              <label className="block">
                <span className="text-faint text-[9px] uppercase">Phone</span>
                <input className="input w-full mt-0.5 text-[11px]" value={doc.fiu.contactPhone} disabled={readOnly}
                  onChange={(e) => handleContactChange("contactPhone", e.target.value)} />
              </label>
            </div>
            <label className="block">
              <span className="text-faint text-[9px] uppercase">Portal URL</span>
              <input className="input w-full mt-0.5 text-[11px] mono" value={doc.fiu.portalUrl} disabled={readOnly}
                onChange={(e) => handleContactChange("portalUrl", e.target.value)} />
            </label>
          </div>
        </div>

        <div className="px-6 py-2 flex flex-wrap gap-2 items-center border-b border-line bg-panel/80">
          <AgentAiTag agent="jana">Guidance-aligned draft</AgentAiTag>
          <div className="flex gap-1 overflow-x-auto">
            {visibleGroups.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => { setActiveGroup(g); setPreview(false); }}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap transition ${
                  activeGroup === g && !preview ? "bg-ai/20 text-white" : "text-muted hover:bg-panel2"
                }`}
              >
                {SECTION_GROUP_LABELS[g].split("·")[0].trim()}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-2 items-center">
            <button type="button" className="btn btn-ghost text-[11px]" onClick={() => setPreview((p) => !p)}>
              {preview ? "Edit sections" : "Preview document"}
            </button>
            {onCopy && <button type="button" className="btn btn-ghost text-[11px]" onClick={onCopy}>Copy</button>}
            {!readOnly && (
              <button type="button" className="btn text-[11px]" disabled={saving || !dirty} onClick={() => void handleSave()}>
                {saving ? "Saving…" : dirty ? "Save draft" : "Saved"}
              </button>
            )}
          </div>
        </div>

        <div className="px-6 py-5 bg-[#f8f9fc] text-[#1a1f36] min-h-[420px]">
          {preview ? (
            <pre className="whitespace-pre-wrap font-body text-[12px] leading-relaxed m-0 p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-sm max-h-[65vh] overflow-y-auto">
              {doc.renderedText}
            </pre>
          ) : (
            <div className="space-y-4 max-w-3xl">
              <h3 className="m-0 font-display text-sm font-semibold border-b border-[#e2e8f0] pb-2">
                {SECTION_GROUP_LABELS[activeGroup]}
              </h3>
              {sectionsInGroup.map((s) => (
                <label key={s.id} className="block">
                  <span className="text-[11px] font-semibold text-[#334155] flex items-center gap-2">
                    {s.label}
                    {s.required && <span className="text-hi text-[9px]">required</span>}
                  </span>
                  {s.guidance && <span className="text-[10px] text-[#64748b] block mt-0.5">{s.guidance}</span>}
                  <textarea
                    className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[12.5px] leading-relaxed min-h-[88px] focus:border-ai focus:outline-none focus:ring-1 focus:ring-ai/30 disabled:opacity-70"
                    value={s.value}
                    disabled={readOnly}
                    placeholder={s.placeholder}
                    onChange={(e) => handleSectionChange(s.id, e.target.value)}
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-panel2 border-t border-line flex flex-wrap gap-3 text-[10px] text-muted">
          <span className="mono">{doc.templateId}</span>
          <span>{doc.fiu.system}</span>
          {msg && <span className="text-low ml-auto font-semibold">{msg}</span>}
          {dirty && !msg && <span className="text-med ml-auto">Unsaved changes</span>}
        </div>
      </div>

      {compliance && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] text-faint uppercase font-semibold">Regulatory compliance map</div>
            <span className={`text-[12px] font-bold ${pct >= 80 ? "text-low" : pct >= 50 ? "text-med" : "text-hi"}`}>
              {compliance.score}/{compliance.total} required fields complete
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
            {compliance.items.map((item) => (
              <div key={item.id} className={`flex gap-2 text-[11px] py-1.5 px-2 rounded-lg ${item.pass ? "bg-low/10" : "bg-hi/10"}`}>
                <span className={item.pass ? "text-low" : "text-hi"}>{item.pass ? "✓" : "○"}</span>
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-[9px] text-faint">{item.sources.join(" · ")}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-faint mb-2">Sources</div>
          <div className="text-[10px] text-muted space-y-0.5 mb-4">
            {(Object.entries(GUIDANCE_FOOTNOTES) as [keyof typeof GUIDANCE_FOOTNOTES, string][]).map(([k, v]) => (
              <div key={k}><span className="mono text-faint">{k}</span> — {v}</div>
            ))}
          </div>
          <div className="text-[10px] text-faint uppercase mb-1">Annex 1 — avoid these deficiencies</div>
          <ul className="text-[10px] text-muted m-0 pl-4 list-disc space-y-0.5">
            {ANNEX1_ANTI_PATTERNS.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </Card>
      )}

      {doc.checklist && doc.checklist.length > 0 && (
        <Card className="p-4">
          <div className="text-[10px] text-faint uppercase mb-2 font-semibold">Pre-filing checklist</div>
          <ul className="text-[11px] text-muted space-y-1 pl-4 list-disc m-0">
            {doc.checklist.map((c) => <li key={c}>{c}</li>)}
          </ul>
        </Card>
      )}
    </div>
  );
}
