import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Globe, Plus, Upload, X, Trash2, Slack, ArrowRight } from "lucide-react";
import { Card } from "../ui";
import {
  GLOBAL_ACCOUNT_CORRIDORS,
  TYPOLOGY_CATEGORIES,
  TYPOLOGY_SEVERITIES,
  type GlobalAccountCorridor,
  type TypologyCategory,
  type TypologySeverity,
} from "../../config/globalAccountCorridors";
import {
  addCorridorTypology,
  currentIsoWeek,
  removeCorridorTypology,
  useCorridorTypologies,
  type CorridorTypology,
} from "../../store/corridorTypologyStore";

const SEV_PILL: Record<TypologySeverity, string> = {
  Critical: "bg-proh/20 text-[#ff7ea0]",
  High: "bg-med/15 text-med",
  Medium: "bg-ai/15 text-ai",
  Low: "bg-low/15 text-low",
};

export default function CorridorTypologyBoard() {
  const all = useCorridorTypologies();
  const [openCode, setOpenCode] = useState<string | null>(null);

  const countByCode = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of all) m[t.corridorCode] = (m[t.corridorCode] ?? 0) + 1;
    return m;
  }, [all]);

  const latestWeekByCode = useMemo(() => {
    const m: Record<string, string> = {};
    for (const t of all) {
      if (!m[t.corridorCode] || t.week > m[t.corridorCode]) m[t.corridorCode] = t.week;
    }
    return m;
  }, [all]);

  const openCorridor = openCode
    ? GLOBAL_ACCOUNT_CORRIDORS.find((c) => c.code === openCode) ?? null
    : null;

  return (
    <Card className="p-0 overflow-hidden mb-4">
      <div className="px-4 py-3 border-b border-line flex items-center gap-2 flex-wrap">
        <Globe size={16} className="text-ai" />
        <h2 className="m-0 text-[15px] font-display font-bold">Global Account corridors — typology intelligence</h2>
        <span className="pill bg-panel2 text-muted text-[10px]">Oversight &amp; control</span>
        <span className="ml-auto text-[11px] text-muted inline-flex items-center gap-1">
          <Slack size={12} /> Click a corridor to upload weekly typologies from Slack
        </span>
      </div>

      <div className="p-4">
        <p className="text-[11px] text-muted mt-0 mb-3 max-w-3xl">
          Each week, drop the risk typologies the team gathered in Slack into the relevant corridor. The corridor's
          intelligence grows with every entry and feeds the Transaction Monitoring investigator guide —{" "}
          <b>Corridor guidance</b> (#13) and <b>Country typologies</b> (#14).
        </p>

        <div className="grid grid-cols-3 gap-3 max-md:grid-cols-2 max-sm:grid-cols-1">
          {GLOBAL_ACCOUNT_CORRIDORS.map((c) => (
            <CorridorSign
              key={c.code}
              corridor={c}
              count={countByCode[c.code] ?? 0}
              latestWeek={latestWeekByCode[c.code]}
              onClick={() => setOpenCode(c.code)}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
          <span className="text-[10px] text-faint">
            {all.length} typolog{all.length === 1 ? "y" : "ies"} logged across {Object.keys(countByCode).length} corridor(s) · saved on this device
          </span>
          <Link to="/transaction-monitoring" className="text-[11px] text-ai hover:underline inline-flex items-center gap-1">
            View in TM investigator guide <ArrowRight size={11} />
          </Link>
        </div>
      </div>

      {openCorridor && (
        <CorridorDrawer
          corridor={openCorridor}
          typologies={all.filter((t) => t.corridorCode === openCorridor.code)}
          onClose={() => setOpenCode(null)}
        />
      )}
    </Card>
  );
}

function CorridorSign({
  corridor,
  count,
  latestWeek,
  onClick,
}: {
  corridor: GlobalAccountCorridor;
  count: number;
  latestWeek?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left p-3 rounded-xl border border-line bg-panel2 hover:border-ai/50 hover:bg-ai/5 transition group focus-visible:outline focus-visible:outline-2 focus-visible:outline-ai"
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl leading-none" aria-hidden>{corridor.flag}</span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[13px] truncate">{corridor.name}</div>
          <div className="text-[10px] text-faint">{corridor.code} · {corridor.region}</div>
        </div>
        <span className={`shrink-0 grid place-items-center w-7 h-7 rounded-full text-[12px] font-bold ${count ? "bg-ai/15 text-ai" : "bg-panel3 text-faint"}`}>
          {count}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-muted">
          {count ? `${count} typolog${count === 1 ? "y" : "ies"}${latestWeek ? ` · latest ${latestWeek}` : ""}` : "No typologies yet"}
        </span>
        <span className="text-[10px] text-ai inline-flex items-center gap-0.5 opacity-70 group-hover:opacity-100">
          <Plus size={11} /> Upload
        </span>
      </div>
    </button>
  );
}

const EMPTY_FORM = () => ({
  week: currentIsoWeek(),
  title: "",
  category: "ML" as TypologyCategory,
  severity: "High" as TypologySeverity,
  description: "",
  indicators: "",
  oscilar: "",
  source: "Slack",
  addedBy: "",
});

function CorridorDrawer({
  corridor,
  typologies,
  onClose,
}: {
  corridor: GlobalAccountCorridor;
  typologies: CorridorTypology[];
  onClose: () => void;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saved, setSaved] = useState("");

  function set<K extends keyof ReturnType<typeof EMPTY_FORM>>(k: K, v: ReturnType<typeof EMPTY_FORM>[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  const canSave = form.title.trim().length >= 3 && form.description.trim().length >= 5;

  function splitList(v: string): string[] {
    return v.split(/[\n;,]+/).map((s) => s.trim()).filter(Boolean);
  }

  function save() {
    if (!canSave) return;
    addCorridorTypology({
      corridorCode: corridor.code,
      week: form.week.trim() || currentIsoWeek(),
      title: form.title.trim(),
      category: form.category,
      severity: form.severity,
      description: form.description.trim(),
      indicators: splitList(form.indicators),
      oscilar: splitList(form.oscilar),
      source: form.source.trim() || "Slack",
      addedBy: form.addedBy.trim() || "Unattributed",
    });
    setSaved(`Added to ${corridor.code} · ${form.week} — now live in TM #13/#14`);
    setForm(EMPTY_FORM());
    setTimeout(() => setSaved(""), 4000);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`${corridor.name} typologies`}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[540px] h-full bg-panel border-l border-line overflow-y-auto shadow-2xl">
        <div className="sticky top-0 z-10 bg-panel/95 backdrop-blur border-b border-line px-5 py-3.5 flex items-center gap-3">
          <span className="text-2xl leading-none" aria-hidden>{corridor.flag}</span>
          <div className="min-w-0 flex-1">
            <h3 className="m-0 text-sm font-display truncate">{corridor.name} corridor — typologies</h3>
            <div className="text-[11px] text-muted">{corridor.code} · {corridor.region} · {typologies.length} on file</div>
          </div>
          <button type="button" className="btn btn-ghost text-[11px] px-2 py-1 flex items-center gap-1" onClick={onClose}>
            <X size={13} /> Close
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Upload form */}
          <div className="rounded-xl border border-ai/30 bg-ai/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Upload size={14} className="text-ai" />
              <div className="text-[12px] font-semibold text-ink">Upload new typology (from Slack)</div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Week">
                <input className="input" value={form.week} onChange={(e) => set("week", e.target.value)} placeholder="2026-W29" />
              </Field>
              <Field label="Source">
                <input className="input" value={form.source} onChange={(e) => set("source", e.target.value)} placeholder="Slack #corridor-intel" />
              </Field>
              <Field label="Category">
                <select className="input" value={form.category} onChange={(e) => set("category", e.target.value as TypologyCategory)}>
                  {TYPOLOGY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Severity">
                <select className="input" value={form.severity} onChange={(e) => set("severity", e.target.value as TypologySeverity)}>
                  {TYPOLOGY_SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Typology title">
              <input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Hawala settlement via trade over-invoicing" />
            </Field>
            <Field label="Description">
              <textarea className="input min-h-[68px]" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What the typology looks like in this corridor and why it matters." />
            </Field>
            <Field label="Red-flag indicators (one per line or comma-separated)">
              <textarea className="input min-h-[52px]" value={form.indicators} onChange={(e) => set("indicators", e.target.value)} placeholder="Rapid pass-through; round-number FX; new beneficiary in <7 days" />
            </Field>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Linked Oscilar rules (comma-separated)">
                <input className="input" value={form.oscilar} onChange={(e) => set("oscilar", e.target.value)} placeholder="OSC-PASSTHRU-01, OSC-FX-ROUND" />
              </Field>
              <Field label="Added by">
                <input className="input" value={form.addedBy} onChange={(e) => set("addedBy", e.target.value)} placeholder="Analyst name" />
              </Field>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button type="button" className="btn btn-primary text-[12px] flex items-center gap-1.5" disabled={!canSave} onClick={save}>
                <Plus size={13} /> Add to {corridor.code} corridor
              </button>
              {!canSave && <span className="text-[10px] text-faint">Title (3+ chars) and description (5+ chars) required</span>}
            </div>
            {saved && <div className="text-[11px] mt-2 px-2 py-1 rounded bg-low/15 text-low">{saved}</div>}
          </div>

          {/* Existing typologies */}
          <div>
            <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-faint mb-2">
              Corridor intelligence — {typologies.length} logged
            </div>
            {typologies.length === 0 ? (
              <div className="text-[11px] text-muted p-3 rounded-lg border border-lineSoft bg-panel2">
                No typologies logged for {corridor.name} yet. Add the first one above — it will appear here and in the
                TM investigator guide immediately.
              </div>
            ) : (
              <div className="space-y-2">
                {typologies.map((t) => (
                  <div key={t.id} className="p-3 rounded-lg border border-lineSoft bg-panel2">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className={`pill text-[10px] ${SEV_PILL[t.severity]}`}>{t.severity}</span>
                      <span className="pill bg-panel3 text-muted text-[9px]">{t.category}</span>
                      <span className="pill bg-panel3 text-faint text-[9px]">{t.week}</span>
                      <span className="font-semibold text-[12px]">{t.title}</span>
                      <button type="button" className="ml-auto text-faint hover:text-hi" aria-label="Remove typology" onClick={() => removeCorridorTypology(t.id)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <p className="text-[11px] text-muted mt-1.5 mb-1">{t.description}</p>
                    {t.indicators.length > 0 && (
                      <div className="text-[10px] text-faint"><b className="text-muted">Indicators:</b> {t.indicators.join(" · ")}</div>
                    )}
                    {t.oscilar.length > 0 && (
                      <div className="text-[10px] text-faint mt-0.5"><b className="text-muted">Oscilar:</b> {t.oscilar.join(", ")}</div>
                    )}
                    <div className="text-[9px] text-faint mt-1 italic">{t.source} · {t.addedBy} · {t.addedAt.slice(0, 10)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-2.5">
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
