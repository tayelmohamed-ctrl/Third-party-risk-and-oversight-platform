import { useMemo, useState } from "react";
import type { Boundary, FinalRating, ScoreResult } from "../../engine/types";
import type { CustomerMode } from "../../engine/cramSuiteConfig";
import type { DataQualityVerdict } from "../../engine/dataQualityGate";
import type { GoldenThreadResult } from "../../engine/goldenThread";
import { OVERRIDES } from "../../engine/data";
import { OUTCOMES } from "../../engine/cram";
import { boundarySetLabel } from "../../config/modelProvenance";
import { usePerimeter } from "../../context/PerimeterContext";
import {
  MASTER_REGISTRY_VERSION,
  nraSourceForPerimeter,
  perimeterLabel,
  registryMeta,
} from "../../registries/master/registryService";
import {
  cramMethodologyDocForPerimeter,
  exportCramMethodologyDocument,
} from "../../lib/cramMethodologyExport";
import {
  exportMalProductRiskWorkbook,
  exportMalServiceRiskWorkbook,
  exportMethodologyWorkbook,
  exportReferenceListWorkbook,
  METHODOLOGY_EXCEL_EXPORTS,
  REFERENCE_LIST_EXPORTS,
  type MethodologyWorkbookKind,
  type ReferenceListWorkbookKind,
} from "../../lib/cramRiskWorkbookExport";
import { policyProfileForPerimeter } from "../../registries/policyProfiles";
import {
  AUDIENCE_INTROS,
  METHODOLOGY_PIPELINE,
  buildMethodologySnapshot,
  customerTypeBreakdown,
  factorRowsFromResult,
  pipelineStepStatus,
  type FactorRowView,
  type MethodologyAudience,
} from "../../config/cramMethodologyContent";

type Props = {
  mode: CustomerMode;
  boundary: Boundary;
  dq: DataQualityVerdict;
  result: ScoreResult | null;
  gt: GoldenThreadResult | null;
  variant?: "rail" | "explorer";
};

export default function CramMethodologyPanel({
  mode,
  boundary,
  dq,
  result,
  gt,
  variant = "explorer",
}: Props) {
  const { perimeter } = usePerimeter();
  const [audience, setAudience] = useState<MethodologyAudience>("regulator");
  const [exporting, setExporting] = useState(false);
  const [exportingKind, setExportingKind] = useState<string | null>(null);
  const snap = useMemo(() => buildMethodologySnapshot(boundary), [boundary]);
  const ctBreakdown = useMemo(() => customerTypeBreakdown(mode), [mode]);
  const factorRows = useMemo(() => factorRowsFromResult(result, boundary), [result, boundary]);
  const methodologyDoc = useMemo(() => cramMethodologyDocForPerimeter(perimeter), [perimeter]);
  const policyProfile = useMemo(() => policyProfileForPerimeter(perimeter), [perimeter]);
  const reviewLegend = useMemo(() => {
    const cycles = policyProfile.reviewCycles.filter((c) => ["Low", "Medium", "High"].includes(c.band));
    return cycles.map((c) => `${c.band} ${c.months}`).join(" · ");
  }, [policyProfile]);

  if (variant === "rail") {
    return (
      <div className="cram-method cram-method--rail cram-method--analyst">
        <div className="cram-method-rail-simple">
          <h3 className="cram-method-rail-simple__title">Methodology</h3>
          <ul className="cram-method-rail-simple__tags">
            <li>{perimeter === "global_account" ? "US Global Account" : "UAE MAL Bank"}</li>
            <li>{perimeter === "global_account" ? "FinCEN aligned" : "CBUAE aligned"}</li>
            <li>{perimeter === "global_account" ? "OFAC compliant" : "UAE NRA aligned"}</li>
            <li>6-factor model</li>
            <li>Version 7.1</li>
          </ul>
        </div>
        <PipelineTrack dq={dq} result={result} compact timeline />
        <FactorMini rows={factorRows} boundary={boundary} result={result} />
        {gt && (
          <div className="cram-method-rail-audit">
            <div className="cram-method-rail-audit__row">
              <span>Residual</span>
              <strong>{gt.residual.residualScore.toFixed(2)} · {String(gt.residual.residualLevel)}</strong>
            </div>
          </div>
        )}
        <details className="cram-method-tech-details">
          <summary>Technical details</summary>
          <div className="cram-method-tech-details__body">
            <div className="cram-method__hero-meta">
              <span className="cram-method__meta-chip mono">{methodologyDoc.modelVersionId}</span>
              <span className="cram-method__meta-chip mono">{MASTER_REGISTRY_VERSION}</span>
              <span className="cram-method__meta-chip">{boundarySetLabel(boundary)}</span>
            </div>
            <p className="cram-method-tech-details__note">{nraSourceForPerimeter(perimeter)}</p>
            <p className="cram-method-tech-details__note">{registryMeta().sourceDocument}</p>
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="cram-method cram-method--explorer">
      <MethodologyHeader mode={mode} snap={snap} perimeter={perimeter} />

      <div className="cram-method__registry-banner">
        <span className="cram-method__meta-chip">{perimeterLabel(perimeter)}</span>
        <span className="cram-method__meta-chip mono">Master Registry {MASTER_REGISTRY_VERSION}</span>
        <span className="text-[11px] text-muted">{nraSourceForPerimeter(perimeter)}</span>
      </div>

      <div className="cram-method__export-section">
        <div className="cram-method__export-row">
          <button
            type="button"
            className="cram-method__export-btn"
            disabled={!!exportingKind || exporting}
            onClick={async () => {
              setExporting(true);
              try {
                await exportCramMethodologyDocument(perimeter);
              } finally {
                setExporting(false);
              }
            }}
          >
            {exporting ? "Downloading…" : "Download full methodology"}
          </button>
          <span className="cram-method__export-meta mono">
            {methodologyDoc.modelVersionId} · {methodologyDoc.filename} · Excel workbooks with live formulas
          </span>
        </div>

        {(["product", "country", "customer", "operations"] as const).map((group) => {
          const items = [
            ...METHODOLOGY_EXCEL_EXPORTS.filter((e) => e.group === group),
            ...REFERENCE_LIST_EXPORTS.filter((e) => e.group === group),
            ...(group === "product"
              ? [
                  { kind: "product-risk" as const, label: "Product risk" },
                  { kind: "service-risk" as const, label: "Service risk" },
                ]
              : []),
          ];
          if (!items.length) return null;
          const title = group === "product" ? `Product & service · ${perimeter === "mal_bank" ? "UAE" : "US"} ratings`
            : group === "country" ? "Country risk pillars"
            : group === "customer" ? `Customer profile · ${perimeter === "mal_bank" ? "CBUAE" : "FinCEN/BSA"}`
            : "Operations";
          return (
            <div key={group} className="cram-method__export-group">
              <div className="cram-method__export-group-title">{title}</div>
              <div className="cram-method__export-row">
                {items.map((item) => (
                  <button
                    key={item.kind}
                    type="button"
                    className="cram-method__export-btn cram-method__export-btn--secondary"
                    disabled={!!exportingKind || exporting}
                    onClick={async () => {
                      setExportingKind(item.kind);
                      try {
                        if (item.kind === "product-risk") await exportMalProductRiskWorkbook();
                        else if (item.kind === "service-risk") await exportMalServiceRiskWorkbook();
                        else if (item.kind === "nob-list" || item.kind === "country-list") {
                          await exportReferenceListWorkbook(item.kind as ReferenceListWorkbookKind, mode);
                        } else await exportMethodologyWorkbook(item.kind as MethodologyWorkbookKind);
                      } finally {
                        setExportingKind(null);
                      }
                    }}
                  >
                    {exportingKind === item.kind ? "Exporting…" : `${item.label} (Registry)`}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="cram-method__audience-tabs">
        {(["regulator", "auditor", "product"] as MethodologyAudience[]).map((a) => (
          <button
            key={a}
            type="button"
            className={audience === a ? "cram-method__audience-tab cram-method__audience-tab--on" : "cram-method__audience-tab"}
            onClick={() => setAudience(a)}
          >
            {a === "regulator" ? "Regulator" : a === "auditor" ? "Auditor" : "Product"}
          </button>
        ))}
      </div>
      <div className="cram-method__audience-lead">
        <b>{AUDIENCE_INTROS[audience].title}</b>
        <p>{AUDIENCE_INTROS[audience].lead}</p>
      </div>

      <PipelineTrack dq={dq} result={result} />

      <section className="cram-method__block">
        <div className="cram-method__block-head">
          <span className="cram-method__block-icon">⚖️</span>
          <div>
            <h3>Six-factor composite</h3>
            <p className="cram-method__block-sub">Each parameter scored 1 (Low) · 2 (Medium) · 3 (High). Weights sum to 100%.</p>
          </div>
        </div>
        <div className="cram-method__scale-legend">
          <span><i className="cram-dot cram-dot--low" /> 1 Low</span>
          <span><i className="cram-dot cram-dot--med" /> 2 Medium</span>
          <span><i className="cram-dot cram-dot--high" /> 3 High</span>
        </div>
        <div className="cram-method__factor-list">
          {factorRows.map((row) => (
            <FactorBar key={row.key} row={row} live={!!result} />
          ))}
        </div>
        {result && (
          <div className="cram-method__composite-box">
            <div>
              <div className="cram-method__composite-label">Composite (math)</div>
              <div className="cram-method__composite-val mono">{result.composite.toFixed(3)}</div>
            </div>
            <div>
              <div className="cram-method__composite-label">Math band · {boundarySetLabel(boundary)}</div>
              <div className={`cram-method__pill cram-method__pill--${result.mathBand.toLowerCase()}`}>{result.mathBand}</div>
            </div>
            <div>
              <div className="cram-method__composite-label">Final rating</div>
              <div className={`cram-method__pill cram-method__pill--${String(result.finalRating).toLowerCase()}`}>{result.finalRating}</div>
            </div>
          </div>
        )}
        <div className="cram-method__rules-grid">
          <RuleCard title="Worst-of pillars" items={["Product & service → max(product, service)", "Channel → max(initiation, delivery)", "Geography → max(country attributes)"]} />
          <RuleCard
            title={perimeter === "global_account" ? "PEP treatment (FinCEN / BSA)" : "PEP treatment (CBUAE Art. 15(14))"}
            items={perimeter === "global_account"
              ? ["PEP score excluded from composite", "Foreign PEP → OVR-008 High floor · FinCEN CDD Rule EDD", "Domestic / IO PEP → identify + enhanced monitoring when high-risk relationship"]
              : ["PEP score excluded from composite", "Foreign PEP → OVR-008 High floor · automatic EDD", "Domestic / IO PEP → identify first; OVR-016 only when high-risk relationship or cross-border"]}
          />
        </div>
      </section>

      <section className="cram-method__block">
        <div className="cram-method__block-head">
          <span className="cram-method__block-icon">{mode === "entity" ? "🏢" : "🧑"}</span>
          <div>
            <h3>Customer-type factor — {mode === "entity" ? "Legal person (LP/MER)" : "Natural person (NP)"}</h3>
            <p className="cram-method__block-sub">25% of composite · internal sub-weights below</p>
          </div>
        </div>
        <div className="cram-method__ct-grid">
          {ctBreakdown.map((row) => (
            <div key={row.key} className="cram-method__ct-row">
              <span className="cram-method__ct-label">{row.label}</span>
              <div className="cram-method__ct-bar-wrap">
                <div className="cram-method__ct-bar" style={{ width: `${row.weightPct}%` }} />
              </div>
              <span className="cram-method__ct-pct mono">{row.weightPct}%</span>
            </div>
          ))}
        </div>
      </section>

      <section className="cram-method__block">
        <div className="cram-method__block-head">
          <span className="cram-method__block-icon">📏</span>
          <div>
            <h3>Band boundaries</h3>
            <p className="cram-method__block-sub">Active set: {boundarySetLabel(boundary)}</p>
          </div>
        </div>
        <div className="cram-method__bands">
          {(["calculator", "cram"] as Boundary[]).map((b) => {
            const set = snap.allBandBoundaries[b];
            const active = b === boundary;
            return (
              <div key={b} className={`cram-method__band-card ${active ? "cram-method__band-card--active" : ""}`}>
                <div className="cram-method__band-title">{set.label}{active ? " · active" : ""}</div>
                <div className="cram-method__band-rows">
                  <span>Low ≤ {set.lowMax}</span>
                  <span>Medium ≤ {set.mediumMax}</span>
                  <span>High &gt; {set.mediumMax}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="cram-method__block">
        <div className="cram-method__block-head">
          <span className="cram-method__block-icon">🚫</span>
          <div>
            <h3>Override registry</h3>
            <p className="cram-method__block-sub">{OVERRIDES.length} rules · final rating cannot fall below floor</p>
          </div>
        </div>
        {result && result.overrides.length > 0 && (
          <div className="cram-method__live-ovr">
            <b>Active on this case:</b>
            {result.overrides.map((o) => (
              <span key={o.id} className="cram-method__ovr-chip">{o.id} · {o.cls}</span>
            ))}
          </div>
        )}
        <div className="cram-method__ovr-table-wrap">
          <table className="cram-method__ovr-table">
            <thead>
              <tr><th>ID</th><th>Trigger</th><th>Outcome</th></tr>
            </thead>
            <tbody>
              {OVERRIDES.slice(0, audience === "auditor" ? OVERRIDES.length : 8).map((o) => (
                <tr key={o.id}>
                  <td className="mono">{o.id}</td>
                  <td>{o.trigger}</td>
                  <td>{o.outcome}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {audience !== "auditor" && OVERRIDES.length > 8 && (
            <div className="cram-method__footnote">Switch to Auditor lens for full {OVERRIDES.length}-rule registry.</div>
          )}
        </div>
      </section>

      <section className="cram-method__block">
        <div className="cram-method__block-head">
          <span className="cram-method__block-icon">🧵</span>
          <div>
            <h3>Golden thread & residual</h3>
            <p className="cram-method__block-sub">Operational outcomes after inherent rating</p>
          </div>
        </div>
        <div className="cram-method__gt-grid">
          <GtCard title="Review cycle" value={gt ? (gt.reviewMonths ? `${gt.reviewMonths} months` : "N/A") : "—"} sub={reviewLegend} />
          <GtCard title="Due diligence" value={gt?.dueDiligence ?? "—"} sub={gt?.eddRequired ? "EDD — High rating only" : "Standard CDD path"} />
          <GtCard title="Approval" value={gt?.approval.who ?? "—"} sub={gt?.approval.cls ?? ""} />
          <GtCard title="Residual" value={gt ? gt.residual.residualScore.toFixed(2) : "—"} sub={gt ? `${Math.round(gt.residual.effectiveness * 100)}% control effectiveness` : "Set controls §04"} />
        </div>
        <div className="cram-method__outcome-row">
          {(["Low", "Medium", "High", "Prohibited"] as FinalRating[]).map((k) => (
            <div key={k} className={`cram-method__outcome cram-method__outcome--${k.toLowerCase()}`}>
              <div className="cram-method__outcome-rating">{k}</div>
              <div className="cram-method__outcome-review">{OUTCOMES[k].review}</div>
            </div>
          ))}
        </div>
      </section>

      {audience === "auditor" && (
        <section className="cram-method__block cram-method__block--audit">
          <div className="cram-method__block-head">
            <span className="cram-method__block-icon">📋</span>
            <div>
              <h3>Model provenance</h3>
              <p className="cram-method__block-sub">Reproducibility snapshot</p>
            </div>
          </div>
          <dl className="cram-method__provenance">
            <dt>Model version</dt><dd className="mono">{snap.modelVersionId}</dd>
            <dt>Activity library</dt><dd className="mono">{snap.activityLibrary}</dd>
            <dt>Factor weights</dt><dd className="mono">{JSON.stringify(snap.factorWeights)}</dd>
            <dt>Residual cap</dt><dd>{snap.residual.maxReduction}% max reduction · {snap.residual.oneBandCap}-band step cap</dd>
            <dt>Control weights</dt><dd className="mono">{JSON.stringify(snap.controlWeights)}</dd>
          </dl>
        </section>
      )}
    </div>
  );
}

function MethodologyHeader({
  mode,
  snap,
  compact,
  perimeter,
}: {
  mode: CustomerMode;
  snap: ReturnType<typeof buildMethodologySnapshot>;
  compact?: boolean;
  perimeter: import("../../config/perimeters").CompliancePerimeter;
}) {
  const methodologyDoc = cramMethodologyDocForPerimeter(perimeter);
  return (
    <header className={`cram-method__hero ${compact ? "cram-method__hero--compact" : ""}`}>
      <div className="cram-method__hero-badge">CRAM Methodology</div>
      <h2 className="cram-method__hero-title">
        {mode === "entity" ? "Entity" : "Individual"} risk scoring engine
      </h2>
      {!compact && (
        <p className="cram-method__hero-lead">
          {perimeter === "mal_bank"
            ? "CBUAE-aligned · UAE NRA · Master Risk Registries · golden thread · non-dilution overrides"
            : "US BaaS/MSB · US NRA 2022 · Master Risk Registries · FinCEN/OFAC · golden thread"}
        </p>
      )}
      <div className="cram-method__hero-meta">
        <span className="cram-method__meta-chip mono">{methodologyDoc.modelVersionId}</span>
        <span className="cram-method__meta-chip">{perimeterLabel(perimeter)}</span>
        <span className="cram-method__meta-chip mono">{MASTER_REGISTRY_VERSION}</span>
        <span className="cram-method__meta-chip">{boundarySetLabel(snap.boundary)}</span>
      </div>
    </header>
  );
}

const PIPELINE_SHORT: Record<string, string> = {
  dq: "Data Quality",
  map: "Library Resolution",
  composite: "Six Factors",
  override: "Overrides",
  golden: "Golden Thread",
  residual: "Residual",
};

const PIPELINE_NUM = ["①", "②", "③", "④", "⑤", "⑥"];

function PipelineTrack({
  dq,
  result,
  compact,
  timeline,
}: {
  dq: DataQualityVerdict;
  result: ScoreResult | null;
  compact?: boolean;
  timeline?: boolean;
}) {
  return (
    <section className={`cram-method__pipeline ${compact ? "cram-method__pipeline--compact" : ""} ${timeline ? "cram-method__pipeline--timeline" : ""}`}>
      {!compact && !timeline && <div className="cram-method__pipeline-label">Scoring quest · live case progress</div>}
      {timeline && <div className="cram-method__pipeline-label">Calculation flow</div>}
      <div className={`cram-method__pipeline-track ${timeline ? "cram-method__pipeline-track--timeline" : ""}`}>
        {METHODOLOGY_PIPELINE.map((step, i) => {
          const status = pipelineStepStatus(step.id, dq, result);
          const title = timeline ? (PIPELINE_SHORT[step.id] ?? step.title) : step.title;
          return (
            <div key={step.id} className={`cram-method__quest cram-method__quest--${status} ${timeline ? "cram-method__quest--timeline" : ""}`}>
              {timeline ? (
                <>
                  <div className="cram-method__timeline-node">
                    <span className="cram-method__timeline-num">{PIPELINE_NUM[i]}</span>
                    <span className="cram-method__timeline-title">{title}</span>
                    <span className={`cram-method__timeline-status cram-method__timeline-status--${status}`}>
                      {status === "done" ? "Done" : status === "active" ? "Active" : "Pending"}
                    </span>
                  </div>
                  {i < METHODOLOGY_PIPELINE.length - 1 && <div className="cram-method__timeline-arrow" aria-hidden>↓</div>}
                </>
              ) : (
                <>
                  <div className="cram-method__quest-node">
                    <span className="cram-method__quest-icon">{step.icon}</span>
                    <span className="cram-method__quest-num">{step.step}</span>
                  </div>
                  {!compact && (
                    <div className="cram-method__quest-body">
                      <div className="cram-method__quest-title">{title}</div>
                      <div className="cram-method__quest-code">{step.code}</div>
                      <div className="cram-method__quest-detail">{step.detail}</div>
                    </div>
                  )}
                  {compact && !timeline && <div className="cram-method__quest-mini">{title}</div>}
                  {i < METHODOLOGY_PIPELINE.length - 1 && !timeline && <div className="cram-method__quest-line" aria-hidden />}
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FactorBar({
  row,
  live,
}: {
  row: FactorRowView;
  live: boolean;
}) {
  const pct = row.weight * 100;
  const scorePct = row.score != null ? (row.score / 3) * 100 : 0;
  return (
    <div className="cram-method__factor">
      <div className="cram-method__factor-head">
        <span>{row.name}</span>
        <span className="mono cram-method__factor-weight">{pct.toFixed(0)}%</span>
      </div>
      <div className="cram-method__factor-bar">
        <div className="cram-method__factor-weight-fill" style={{ width: `${pct}%` }} />
        {live && row.score != null && (
          <div className="cram-method__factor-score-fill" style={{ width: `${(row.contribution! / 3) * 100}%` }} title={`Score ${row.score} · contrib ${row.contribution?.toFixed(3)}`} />
        )}
      </div>
      {live && row.score != null && (
        <div className="cram-method__factor-meta mono">
          score {row.score} · contrib {row.contribution!.toFixed(3)}
          {row.note ? ` · ${row.note}` : ""}
        </div>
      )}
    </div>
  );
}

function FactorMini({
  rows,
  boundary,
  result,
}: {
  rows: FactorRowView[];
  boundary: Boundary;
  result: ScoreResult | null;
}) {
  return (
    <div className="cram-method__mini-factors">
      <div className="cram-method__mini-title">Six factors · {boundarySetLabel(boundary)}</div>
      {rows.map((r) => (
        <div key={r.key} className="cram-method__mini-row">
          <span>{r.name}</span>
          <span className="mono">{result && r.score != null ? r.score : "—"}</span>
        </div>
      ))}
      {result && (
        <div className="cram-method__mini-composite mono">
          {result.composite.toFixed(2)} → {result.finalRating}
        </div>
      )}
    </div>
  );
}

function RuleCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="cram-method__rule-card">
      <div className="cram-method__rule-title">{title}</div>
      <ul>{items.map((it) => <li key={it}>{it}</li>)}</ul>
    </div>
  );
}

function GtCard({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="cram-method__gt-card">
      <div className="cram-method__gt-label">{title}</div>
      <div className="cram-method__gt-value">{value}</div>
      <div className="cram-method__gt-sub">{sub}</div>
    </div>
  );
}
