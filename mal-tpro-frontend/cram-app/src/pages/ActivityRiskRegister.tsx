import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2, ChevronRight, Globe2, Building2, User, Briefcase,
  Package, Route, Target, Activity,
} from "lucide-react";
import { Card, RatingPill } from "../components/ui";
import ActivitySearchCombobox from "../components/activityRegister/ActivitySearchCombobox";
import RbmScoreBreakdown from "../components/rbm/RbmScoreBreakdown";
import StructuredActivityPanel from "../components/rbm/StructuredActivityPanel";
import type { ActivityRegisterOption } from "../lib/activityRegisterIndex";
import type { CompliancePerimeter, CorridorFilter } from "../config/perimeters";
import {
  corridorOptionsForPerimeter,
  isCorridorValidForPerimeter,
  PERIMETERS,
} from "../config/perimeters";
import type { CustomerMode } from "../config/activityRiskConfig";
import { policyProfileForPerimeter } from "../registries/policyProfiles";
import {
  corridorsForPerimeter,
  defaultProductForPerimeter,
  USE_CASE_REGISTRY,
} from "../registries/rbmRegistries";
import { scoreFromActivityRegister } from "../engine/rbm/scoreRbm";
import { corridorFilterToRegistryId } from "../lib/rbmCorridorMap";
import { demoActualBehaviourMismatch } from "../engine/rbm/behaviourEngine";
import { rakezRegisterStats } from "../engine/rakezActivityRegister";

const STEPS = [
  { n: 1, title: "Product & policy" },
  { n: 2, title: "Business activity" },
  { n: 3, title: "Use case" },
  { n: 4, title: "Corridor" },
  { n: 5, title: "Risk result" },
] as const;

export default function ActivityRiskRegister() {
  const [perimeter, setPerimeter] = useState<CompliancePerimeter>("mal_bank");
  const [corridor, setCorridor] = useState<CorridorFilter>("UAE");
  const [corridorId, setCorridorId] = useState("uae_uae");
  const [mode, setMode] = useState<CustomerMode>("entity");
  const [activity, setActivity] = useState<ActivityRegisterOption | null>(null);
  const [useCaseId, setUseCaseId] = useState("operating_expenses");
  const [showBehaviourDemo, setShowBehaviourDemo] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);

  const policy = useMemo(() => policyProfileForPerimeter(perimeter), [perimeter]);
  const product = useMemo(() => defaultProductForPerimeter(perimeter), [perimeter]);
  const corridorOptions = useMemo(() => corridorOptionsForPerimeter(perimeter), [perimeter]);
  const corridorRegistry = useMemo(() => corridorsForPerimeter(perimeter), [perimeter]);
  const rakezStats = rakezRegisterStats();

  useEffect(() => {
    if (perimeter === "mal_bank") {
      setCorridor("UAE");
      setCorridorId("uae_uae");
      setActivity(null);
    } else if (!isCorridorValidForPerimeter(perimeter, corridor)) {
      setCorridor("all");
      setCorridorId("us_global");
      setActivity(null);
    }
  }, [perimeter, corridor]);

  useEffect(() => {
    setCorridorId(corridorFilterToRegistryId(perimeter, corridor));
  }, [perimeter, corridor]);

  const assessment = useMemo(() => {
    if (!activity) return null;
    return scoreFromActivityRegister({
      perimeter,
      mode,
      activityLabel: activity.label,
      isicCode: activity.isicCode,
      rakezCode: activity.rakezCode,
      useCaseId,
      corridorId,
      productId: product.id,
      actualBehaviour: showBehaviourDemo ? demoActualBehaviourMismatch() : undefined,
    });
  }, [activity, perimeter, mode, useCaseId, corridorId, product.id, showBehaviourDemo]);

  const stepComplete = {
    1: true,
    2: !!activity,
    3: !!activity && !!useCaseId,
    4: !!activity && !!corridorId,
    5: !!assessment,
  };

  const selectedCorridor = corridorRegistry.find((c) => c.id === corridorId);

  return (
    <div className="act-reg">
      <header className="act-reg__hero">
        <div>
          <h1 className="act-reg__title">Activity & Risk Register</h1>
          <p className="act-reg__lead">
            Multi-factor risk-based methodology — product, structured business activity, use case, corridor, and policy profile.
            ISIC is one input (~5% of activity logic).
          </p>
        </div>
        <div className="act-reg__meta">
          <span className="act-reg__meta-chip">{policy.label}</span>
          <span className="act-reg__meta-chip">RBM {policy.version}</span>
          {perimeter === "mal_bank" && (
            <span className="act-reg__meta-chip">RAKEZ · {rakezStats.total}</span>
          )}
        </div>
      </header>

      <nav className="act-reg__steps" aria-label="Workflow steps">
        {STEPS.map((s) => (
          <div
            key={s.n}
            className={`act-reg__step ${stepComplete[s.n] ? "act-reg__step--done" : ""} ${s.n === 5 && assessment ? "act-reg__step--current" : ""}`}
          >
            <span className="act-reg__step-num">{stepComplete[s.n] ? "✓" : s.n}</span>
            <span>{s.title}</span>
          </div>
        ))}
      </nav>

      <div className="act-reg__layout act-reg__layout--wide">
        <div className="act-reg__main">
          {/* Step 1 — Product & policy */}
          <Card className="act-reg__panel">
            <PanelHead n={1} title="Product & regulatory profile" hint="Loads policy rules, thresholds, and product risk independently" />
            <div className="act-reg__account-grid">
              {(Object.keys(PERIMETERS) as CompliancePerimeter[]).map((p) => {
                const def = PERIMETERS[p];
                const active = perimeter === p;
                return (
                  <button
                    key={p}
                    type="button"
                    className={`act-reg__account-card ${active ? "act-reg__account-card--on" : ""}`}
                    onClick={() => setPerimeter(p)}
                  >
                    {p === "global_account" ? <Globe2 size={20} /> : <Building2 size={20} />}
                    <span className="act-reg__account-label">{def.label}</span>
                    <span className="act-reg__account-sub">{def.subtitle}</span>
                  </button>
                );
              })}
            </div>

            <div className="rbm-product-card mt-4">
              <div className="flex items-start gap-2">
                <Package size={16} className="text-ai shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold">{product.name}</div>
                  <div className="text-[10px] text-muted mt-0.5">
                    License {product.license} · Cross-border {product.crossBorderPct}% · Product risk {product.inherentScore}/100 ({product.inherentBand})
                  </div>
                  <div className="text-[10px] text-faint mt-1">{product.rationale}</div>
                </div>
                <RatingPill rating={product.inherentBand} />
              </div>
            </div>

            <div className="mt-3 px-3 py-2 rounded-lg bg-panel2 text-[10px] text-muted">
              <span className="text-faint uppercase font-semibold">Policy loaded · </span>
              {policy.regulator} · EDD triggers: {policy.eddTriggers.length} · Monitoring scenarios: {policy.monitoringScenarios.length}
            </div>

            <div className="act-reg__mode-row mt-4">
              <span className="field-label mb-0">Customer type</span>
              <div className="flex gap-2">
                {(["individual", "entity"] as CustomerMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`act-reg__mode-btn ${mode === m ? "act-reg__mode-btn--on" : ""}`}
                    onClick={() => setMode(m)}
                  >
                    {m === "individual" ? <User size={14} /> : <Briefcase size={14} />}
                    {m === "individual" ? "Individual" : "Business / entity"}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Step 2 — Business activity */}
          <Card className="act-reg__panel">
            <PanelHead n={2} title="Business activity" hint="Select from register — resolves to structured risk object, not ISIC-only" icon={<Activity size={16} />} />
            <ActivitySearchCombobox
              perimeter={perimeter}
              value={activity}
              onChange={setActivity}
              placeholder={
                perimeter === "mal_bank"
                  ? "Search RAKEZ activities, ISIC classes, typologies…"
                  : "Search ISIC activities, typologies, nature of business…"
              }
            />
            {assessment?.activity && (
              <div className="mt-4">
                <StructuredActivityPanel activity={assessment.activity} />
              </div>
            )}
          </Card>

          {/* Step 3 — Use case */}
          <Card className={`act-reg__panel ${!activity ? "act-reg__panel--disabled" : ""}`}>
            <PanelHead n={3} title="Intended use case" hint="Payment purpose registry — not free-text reason for payment" icon={<Target size={16} />} />
            <div className="act-reg__applic-grid">
              {USE_CASE_REGISTRY.map((uc) => (
                <button
                  key={uc.id}
                  type="button"
                  disabled={!activity}
                  className={`act-reg__applic-card ${useCaseId === uc.id ? "act-reg__applic-card--on" : ""}`}
                  onClick={() => setUseCaseId(uc.id)}
                >
                  <Target size={16} className="shrink-0 mt-0.5" />
                  <div className="text-left flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[12px]">{uc.label}</span>
                      <RatingPill rating={uc.inherentBand} />
                    </div>
                    <div className="text-[11px] text-muted mt-0.5">{uc.description}</div>
                    <div className="text-[10px] text-faint mt-1">
                      {uc.velocity} velocity · Third party {uc.thirdParty ? "Yes" : "No"} · Cross-border {uc.crossBorder}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Step 4 — Corridor */}
          <Card className={`act-reg__panel ${!activity ? "act-reg__panel--disabled" : ""}`}>
            <PanelHead n={4} title="Payment corridor" hint="Corridor risk engine — sanctions, AML index, nested risk, correspondent exposure" icon={<Route size={16} />} />
            {perimeter === "global_account" && (
              <div className="mb-3">
                <label className="field-label" htmlFor="corridor-select">Partner corridor filter</label>
                <select
                  id="corridor-select"
                  className="input max-w-xs"
                  value={corridor}
                  onChange={(e) => setCorridor(e.target.value as CorridorFilter)}
                >
                  {corridorOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {corridorRegistry.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={!activity}
                  className={`act-reg__corridor-card ${corridorId === c.id ? "act-reg__corridor-card--on" : ""}`}
                  onClick={() => setCorridorId(c.id)}
                >
                  <div className="text-[12px] font-semibold">{c.label}</div>
                  <div className="text-[10px] text-muted mt-1">
                    Sanctions {c.sanctionsScore} · AML {c.amlIndex} · FATF {c.fatfStatus}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-mono text-[13px] font-bold">{c.finalScore}/100</span>
                    <RatingPill rating={c.finalBand} />
                  </div>
                </button>
              ))}
            </div>
            {selectedCorridor && (
              <p className="text-[10px] text-muted mt-3 m-0">{selectedCorridor.monitoringNote}</p>
            )}
          </Card>

          {/* Behaviour demo */}
          {activity && (
            <Card className="act-reg__panel">
              <label className="flex items-center gap-2 cursor-pointer text-[12px]">
                <input
                  type="checkbox"
                  checked={showBehaviourDemo}
                  onChange={(e) => setShowBehaviourDemo(e.target.checked)}
                />
                Simulate expected vs actual behaviour mismatch (TM uplift demo)
              </label>
              {showBehaviourDemo && assessment?.behaviourDeviations && assessment.behaviourDeviations.length > 0 && (
                <div className="mt-3 space-y-2">
                  {assessment.behaviourDeviations.map((d) => (
                    <div key={d.dimension} className="text-[11px] px-2 py-1.5 rounded-lg bg-med/10 border border-med/20">
                      <span className="font-semibold">{d.dimension}</span>: expected {d.expected} · actual {d.actual}
                      <span className="text-med ml-1">(+{d.scoreUplift})</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Step 5 — Result */}
        <aside className="act-reg__result">
          <Card className="act-reg__result-card p-0 overflow-hidden sticky top-[84px]">
            <div className="act-reg__result-head">
              <CheckCircle2 size={18} />
              <span>Composite risk assessment</span>
            </div>

            {!assessment ? (
              <div className="p-5 text-[12px] text-muted">
                Complete steps 1–4 for a fully explainable RBM score.
                <ul className="mt-3 pl-4 space-y-1 m-0">
                  <li>Select product & policy profile</li>
                  <li>Pick a structured business activity</li>
                  <li>Choose intended use case</li>
                  <li>Select payment corridor</li>
                </ul>
              </div>
            ) : (
              <div className="p-5">
                <RbmScoreBreakdown result={assessment} />
                {assessment.prohibited && (
                  <div className="mt-3 text-[11px] px-3 py-2 rounded-lg bg-proh/15 text-proh border border-proh/30">
                    Prohibited — reject / exit per policy override
                  </div>
                )}
              </div>
            )}
          </Card>

          <button
            type="button"
            className="act-reg__method-toggle"
            onClick={() => setShowMethodology((v) => !v)}
          >
            {showMethodology ? "Hide" : "Show"} methodology architecture
            <ChevronRight size={14} className={showMethodology ? "rotate-90" : ""} />
          </button>

          {showMethodology && (
            <Card className="p-4 text-[11px] text-muted">
              <div className="font-semibold text-ink mb-2">RBM pipeline</div>
              <pre className="text-[10px] mono m-0 whitespace-pre-wrap leading-relaxed">
{`Customer → Product → Business Activity → Use Case
         → Corridor → Delivery → Expected Behaviour
                    ↓
           Inherent Risk Engine
                    ↓
           Rules & Overrides
                    ↓
           Residual Risk (− controls)
                    ↓
        Monitoring · EDD · Review frequency`}
              </pre>
              <p className="mt-3 mb-0 text-[10px]">
                Policy: {policy.label} ·{" "}
                <Link to="/regulatory-management" className="text-ai hover:underline">Regulatory Management →</Link>
              </p>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function PanelHead({ n, title, hint, icon }: { n: number; title: string; hint: string; icon?: React.ReactNode }) {
  return (
    <div className="act-reg__panel-head">
      <span className="act-reg__panel-num">{n}</span>
      <div className="flex-1">
        <h2 className="act-reg__panel-title flex items-center gap-1.5">
          {icon}
          {title}
        </h2>
        <p className="act-reg__panel-hint">{hint}</p>
      </div>
    </div>
  );
}
