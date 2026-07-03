import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  PAKISTAN_RISK_TYPOLOGY_LIBRARY,
  categoryIcon,
  severityColor,
  severityStars,
  tmCoveragePct,
  typologiesByCategory,
  type MalTypologyEntry,
  type TypologyCategory,
} from "../../config/pakistanRiskTypologyLibrary";
import { AGENTS } from "../../config/agents";
import AgentAiTag from "../agents/AgentAiTag";
import DriveLink from "./DriveLink";

type Tab = "corpus" | "nra" | "module" | "redflags";

const CATEGORY_FILTERS: { id: TypologyCategory | "all"; label: string }[] = [
  { id: "all", label: "All typologies" },
  { id: "ML", label: "Money laundering" },
  { id: "TF", label: "Terrorist financing" },
  { id: "Sanctions", label: "Sanctions" },
];

export default function PakistanRiskTypologyLibrary() {
  const [tab, setTab] = useState<Tab>("corpus");
  const [catFilter, setCatFilter] = useState<TypologyCategory | "all">("all");
  const [expanded, setExpanded] = useState<string | null>("TYP-PK-001");

  const lib = PAKISTAN_RISK_TYPOLOGY_LIBRARY;
  const filtered = useMemo(() => typologiesByCategory(catFilter), [catFilter]);
  const criticalCount = lib.malTypologyCorpus.filter((t) => t.severity === "Critical").length;
  const tmPct = tmCoveragePct();
  const aePk = lib.corridorRatings.find((c) => c.corridorId === "COR-AE-PK");

  return (
    <div className="space-y-4">
      {/* Hero card */}
      <div className="cram-card cram-card--entity pk-typo-hero">
        <header className="cram-card__header">
          <div className="cram-card__hero">
            <div className="cram-card__avatar pk-typo-flag" aria-hidden>🇵🇰</div>
            <div className="cram-card__identity">
              <div className="cram-card__eyebrow">RISK TYPOLOGY LIBRARY · {lib.countryCode}</div>
              <h2 className="cram-card__name">{lib.countryName}</h2>
              <div className="cram-card__meta">
                <span>{lib.malTypologyCorpus.length} Mal typologies</span>
                <span className="cram-card__dot">·</span>
                <span>{lib.nra2023.predicateOffencesVeryHigh.length} NRA Very High predicates</span>
                <span className="cram-card__dot">·</span>
                <span className="mono">{lib.version}</span>
              </div>
              <div className="cram-card__badges">
                <span className="cram-pill cram-pill--prohibited">{aePk?.rating ?? "Critical"} corridor</span>
                <span className="cram-pill cram-pill--high">L×I {aePk?.likelihoodImpactScore ?? 25}</span>
                <span className="cram-pill cram-pill--medium">NRA 2023 VH predicates</span>
                <span className="cram-pill cram-pill--muted">EDD mandatory</span>
              </div>
            </div>
          </div>
          <div className="cram-card__gauge-wrap">
            <TypologyCoverageGauge pct={tmPct} />
            <div className="cram-card__gauge-caption">TM rule coverage</div>
          </div>
        </header>

        <div className="cram-card__status-row">
          <StatusChip label="Owner" value={`${AGENTS.sayed.name} · EWRA`} accent="#39B9ED" />
          <StatusChip label="Typologies" value={`${AGENTS.mohsen.name} · TM`} accent="#A953DF" />
          <StatusChip label="Critical typologies" value={String(criticalCount)} accent="#FF5C77" />
          <StatusChip label="CCM status" value="Draft v0.1" accent="#F6A623" />
        </div>

        <div className="cram-card__pipeline">
          <PipelineStep done label="NRA 2023 ingested" />
          <PipelineStep done label="Country module drafted" />
          <PipelineStep done label="GA Workbook §8 mapped" />
          <PipelineStep highlight={tmPct < 100} label={`TM rules ${tmPct}%`} />
        </div>

        <div className="cram-card__alerts">
          <span className="cram-alert cram-alert--hit">⛔ {criticalCount} Critical typologies active on UAE→PK</span>
          <span className="cram-alert cram-alert--tm">⚡ Hawala/hundi · TF/NPO · wallet structuring</span>
        </div>

        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {lib.sources.map((s) => (
            <DriveLink key={s.id} folderKey="evidenceRisk" docPath={s.driveDoc} label={s.title.split("—")[0].trim()} />
          ))}
          <Link to="/transaction-monitoring" className="text-[11px] text-ai hover:underline self-center">Mohsen TM rules →</Link>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          ["corpus", "Mal typology corpus (14)"],
          ["nra", "NRA 2023 summary"],
          ["module", "Compliance country module"],
          ["redflags", "Corridor red flags"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${
              tab === id ? "bg-ai/20 border-ai" : "border-line text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "corpus" && (
        <>
          <div className="flex gap-2 flex-wrap">
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setCatFilter(f.id)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                  catFilter === f.id ? "bg-panel3 border-ai text-ink" : "border-line text-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="grid gap-3">
            {filtered.map((t) => (
              <TypologyCard
                key={t.id}
                typology={t}
                expanded={expanded === t.id}
                onToggle={() => setExpanded(expanded === t.id ? null : t.id)}
              />
            ))}
          </div>
        </>
      )}

      {tab === "nra" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <NraPanel title="Very High ML predicate offences" items={lib.nra2023.predicateOffencesVeryHigh} rating="VH" />
          <NraPanel title="High ML predicate offences" items={lib.nra2023.predicateOffencesHigh} rating="H" />
          <NraPanel title="ML channels (NRA 2023)" items={lib.nra2023.mlChannels} rating="—" />
          <NraPanel title="TF sources — Very High / High" items={[...lib.nra2023.tfSourcesVeryHigh, ...lib.nra2023.tfSourcesHigh]} rating="VH/H" />
          <NraPanel title="TF channels — Very High / High" items={[...lib.nra2023.tfChannelsVeryHigh, ...lib.nra2023.tfChannelsHigh]} rating="VH/H" />
          <NraPanel title="Sector vulnerabilities — Very High" items={lib.nra2023.sectorVulnerabilitiesVeryHigh} rating="VH" />
          <div className="lg:col-span-2 p-4 rounded-2xl border border-line bg-panel2 text-[12px]">
            <AgentAiTag agent="sayed">Context</AgentAiTag>
            <ul className="mt-2 mb-0 pl-4 text-muted space-y-1">
              {lib.nra2023.contextFactors.map((c) => <li key={c}>{c}</li>)}
            </ul>
            <p className="text-[11px] text-faint mt-3 mb-0">{lib.nra2023.npoRiskProfile}</p>
          </div>
        </div>
      )}

      {tab === "module" && (
        <div className="space-y-4">
          <ModuleSection title="Legal basis" items={lib.complianceModule.legalBasis} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lib.complianceModule.supervisors.map((s) => (
              <div key={s.code} className="p-4 rounded-xl border border-line bg-panel2">
                <div className="mono text-ai text-[11px]">{s.code}</div>
                <div className="font-semibold text-[13px] mt-1">{s.name}</div>
                <p className="text-[11px] text-muted m-0 mt-1">{s.role}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
            <MetricBox label="CTR threshold" value={lib.complianceModule.ctrThreshold} />
            <MetricBox label="Record retention" value={`${lib.complianceModule.recordRetentionYears} years`} />
            <MetricBox label="Document" value={lib.complianceModule.documentId} />
            <MetricBox label="FATF status" value="Exited enhanced monitoring Oct 2022" />
          </div>
          <ModuleSection title="Jurisdiction typologies (CCM §7)" items={lib.complianceModule.jurisdictionTypologies} />
          <ModuleSection title="EDD triggers" items={lib.complianceModule.eddTriggers} />
          <ModuleSection title="Mandatory CDD fields" items={lib.complianceModule.mandatoryFields} />
          <ModuleSection title="Acceptable ID" items={lib.complianceModule.acceptableId} />
          <p className="text-[11px] text-med p-3 rounded-lg border border-med/30 bg-med/5 m-0">
            {lib.complianceModule.fatfNote}. Thresholds marked [VERIFY] in source document must be confirmed by Compliance/Legal before production reliance.
          </p>
        </div>
      )}

      {tab === "redflags" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lib.corridorRatings.map((c) => (
              <div key={c.corridorId} className="p-4 rounded-xl border border-hi/30 bg-hi/5">
                <div className="flex items-baseline gap-2">
                  <span className="font-display font-bold text-[15px]">{c.label}</span>
                  <span className="cram-pill cram-pill--prohibited text-[9px]">{c.rating}</span>
                  <span className="mono text-[11px] text-muted ml-auto">L×I {c.likelihoodImpactScore}</span>
                </div>
                <p className="text-[11px] text-muted m-0 mt-2">{c.relevance}</p>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-2xl border border-line bg-panel2">
            <div className="text-sm font-display font-semibold mb-3">Operational red flags</div>
            <ol className="m-0 pl-5 space-y-2 text-[12px] text-muted">
              {lib.redFlags.map((f) => <li key={f}>{f}</li>)}
            </ol>
          </div>
          <p className="text-[11px] text-muted m-0 italic">{lib.nonDiscriminationPolicy}</p>
        </div>
      )}
    </div>
  );
}

function TypologyCard({ typology: t, expanded, onToggle }: { typology: MalTypologyEntry; expanded: boolean; onToggle: () => void }) {
  const color = severityColor(t.severity);
  const stars = severityStars(t.severity);

  return (
    <div
      className={`pk-typo-card border rounded-2xl overflow-hidden transition ${expanded ? "border-ai/50 bg-panel2" : "border-line bg-panel2/60"}`}
    >
      <button type="button" className="w-full text-left p-4 flex gap-3 items-start" onClick={onToggle}>
        <div className="pk-typo-rank" style={{ borderColor: color, color }}>{t.rank}</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px]" aria-hidden>{categoryIcon(t.category)}</span>
            <span className="font-semibold text-[13px] text-ink">{t.name}</span>
            <span className="mono text-[9px] text-faint">{t.id}</span>
            <span className="pk-typo-stars ml-auto" style={{ color }} aria-label={`${t.severity} severity`}>
              {"★".repeat(stars)}{"☆".repeat(5 - stars)}
            </span>
          </div>
          <p className="text-[11px] text-muted m-0 mt-1 line-clamp-2">{t.description}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="pill text-[9px]" style={{ background: `${color}22`, color }}>{t.severity}</span>
            <span className="pill text-[9px] bg-panel3 text-muted">{t.category}</span>
            <span className="pill text-[9px] bg-panel3 text-muted">{t.corridorRelevance}</span>
            {t.oscilarRules.length > 0 && (
              <span className="pill text-[9px] bg-low/15 text-low">
                TM: {t.primaryOscilarRule ?? t.oscilarRules[0]}
                {t.oscilarRules.length > 1 ? ` +${t.oscilarRules.length - 1}` : ""}
              </span>
            )}
          </div>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-lineSoft ml-14 space-y-3">
          <DetailBlock title="Indicators" items={t.indicators} />
          <DetailBlock title="Oscilar rules" items={t.oscilarRules} />
          <DetailBlock title="Primary controls" items={t.primaryControls} />
          <div className="text-[10px] text-faint">Source: {t.source} · Agent: Mohsen (TM) / Sayed (EWRA mapping)</div>
        </div>
      )}
    </div>
  );
}

function DetailBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-[10px] text-faint uppercase mb-1">{title}</div>
      <ul className="m-0 pl-4 text-[11px] text-muted space-y-0.5">
        {items.map((i) => <li key={i}>{i}</li>)}
      </ul>
    </div>
  );
}

function NraPanel({ title, items, rating }: { title: string; items: string[]; rating: string }) {
  return (
    <div className="p-4 rounded-xl border border-line bg-panel2">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[12px] font-semibold">{title}</span>
        {rating !== "—" && <span className="pill text-[9px] bg-hi/15 text-hi">{rating}</span>}
      </div>
      <ul className="m-0 pl-4 text-[11px] text-muted space-y-1">
        {items.map((i) => <li key={i}>{i}</li>)}
      </ul>
    </div>
  );
}

function ModuleSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="p-4 rounded-xl border border-line bg-panel2">
      <div className="text-[12px] font-semibold mb-2">{title}</div>
      <ul className="m-0 pl-4 text-[11px] text-muted space-y-1">
        {items.map((i) => <li key={i}>{i}</li>)}
      </ul>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg border border-line bg-panel2">
      <div className="text-[9px] text-faint uppercase">{label}</div>
      <div className="text-[11px] font-semibold mt-1">{value}</div>
    </div>
  );
}

function StatusChip({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="cram-status-chip">
      <div className="cram-status-chip__label">{label}</div>
      <div className="cram-status-chip__value" style={{ color: accent }}>{value}</div>
    </div>
  );
}

function PipelineStep({ done, label, highlight }: { done?: boolean; label: string; highlight?: boolean }) {
  return (
    <div className={`cram-pipe-step ${done ? "cram-pipe-step--done" : ""} ${highlight ? "cram-pipe-step--alert" : ""}`}>
      <span className="cram-pipe-step__dot" aria-hidden>{done ? "✓" : highlight ? "!" : "○"}</span>
      <span className="cram-pipe-step__label">{label}</span>
    </div>
  );
}

function TypologyCoverageGauge({ pct }: { pct: number }) {
  const color = pct >= 70 ? "#2FD8A6" : pct >= 40 ? "#F6A623" : "#FF5C77";
  return (
    <div className="cram-gauge" style={{ ["--gauge-color" as string]: color, ["--gauge-pct" as string]: `${pct}%` }}>
      <div className="cram-gauge__ring" />
      <div className="cram-gauge__value">{pct}<small>%</small></div>
    </div>
  );
}
