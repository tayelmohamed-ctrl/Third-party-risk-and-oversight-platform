import { useMemo, useState, type ReactNode } from "react";
import AgentBanner from "../components/agents/AgentBanner";
import AgentAiTag from "../components/agents/AgentAiTag";
import { Card } from "../components/ui";
import { ModuleCard, ModuleGrid } from "../components/modern/ModernUI";
import { UserCheck, ShieldAlert, Users, Newspaper } from "lucide-react";
import {
  EDD_DEMO_PROFILES, EDD_SECTION_LABELS, MAL_EDD_GUIDELINES,
  eddRequiredFor, resolveEddPack, triggerActive,
  type EddSection, type EddTrigger,
} from "../config/eddIndividualMatrix";

const PROFILE_CARDS: Record<string, { icon: ReactNode; iconBg: string }> = {
  "edd-low":     { icon: <UserCheck size={20} />,   iconBg: "#2FD8A6" },
  "edd-fpep":    { icon: <ShieldAlert size={20} />, iconBg: "#FF5C77" },
  "edd-rca":     { icon: <Users size={20} />,       iconBg: "#A953DF" },
  "edd-adverse": { icon: <Newspaper size={20} />,   iconBg: "#F6A623" },
};

const RATING_STYLE: Record<string, string> = {
  Low: "bg-low/15 text-low", Medium: "bg-med/15 text-med", High: "bg-hi/15 text-hi", Prohibited: "bg-hi/15 text-hi",
};

const REQ_STYLE: Record<string, string> = {
  baseline: "bg-panel2 text-muted",
  edd: "bg-hi/15 text-hi",
  conditional: "bg-med/15 text-med",
};

const ALL_TRIGGERS: EddTrigger[] = ["pep_any", "pep_domestic_io", "pep_enhanced", "rca", "sanctions_potential", "adverse", "behaviour"];

export default function EddIndividualChecklist() {
  const [activeId, setActiveId] = useState(EDD_DEMO_PROFILES[0].id);
  const active = useMemo(
    () => EDD_DEMO_PROFILES.find((p) => p.id === activeId) ?? EDD_DEMO_PROFILES[0],
    [activeId],
  );
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  const pack = useMemo(() => resolveEddPack(active).filter((r) => r.applies), [active]);
  const bySection = useMemo(() => {
    const map = new Map<EddSection, typeof pack>();
    for (const r of pack) {
      if (!map.has(r.section)) map.set(r.section, []);
      map.get(r.section)!.push(r);
    }
    return map;
  }, [pack]);

  // Required = baseline + edd(when EDD fires) + active conditional. Progress tracks captured status.
  const requiredIds = pack.map((r) => r.id);
  const doneCount = requiredIds.filter((id) => checks[id]).length;
  const pct = requiredIds.length ? Math.round((doneCount / requiredIds.length) * 100) : 0;

  function toggle(id: string) {
    setChecks((c) => ({ ...c, [id]: !c[id] }));
  }
  function reset() { setChecks({}); }

  const edd = eddRequiredFor(active);
  const activeTriggers = ALL_TRIGGERS.filter((t) => triggerActive(t, active));

  return (
    <div>
      <AgentBanner agent="sayed" title="Sayed — EDD Individual Capture Checklist">
        Per-case Enhanced Due Diligence pack for natural persons, generated from the live CRAM rating and the golden-thread
        EDD triggers. Baseline CDD is always collected; EDD and conditional items switch on by rating, PEP / RCA, adverse
        media and screening signals.
      </AgentBanner>

      <div className="grid grid-cols-4 gap-3 mt-4 mb-4 max-md:grid-cols-2">
        <Stat n="24" l="Matrix items" />
        <Stat n="7" l="Sections" />
        <Stat n="7" l="Triggers" />
        <Stat n="High" l="EDD fires at" c="text-hi" />
      </div>

      <Card className="p-3 mb-4">
        <AgentAiTag agent="sayed">Policy basis</AgentAiTag>
        <ul className="text-[11px] text-muted mt-2 mb-0 pl-4 space-y-1">
          {MAL_EDD_GUIDELINES.policyBasis.map((line) => <li key={line}>{line}</li>)}
        </ul>
        <p className="text-[10px] text-faint mt-2 mb-0">{MAL_EDD_GUIDELINES.footerNotice}</p>
      </Card>

      <ModuleGrid cols={4}>
        {EDD_DEMO_PROFILES.map((p) => {
          const card = PROFILE_CARDS[p.id] ?? { icon: <UserCheck size={20} />, iconBg: "#39B9ED" };
          return (
            <ModuleCard
              key={p.id}
              icon={card.icon}
              iconBg={card.iconBg}
              title={p.name}
              desc={p.hint}
              meta={p.pepTier !== "None" ? `${p.pepTier} PEP${p.isRca ? " · RCA" : ""}` : "Non-PEP"}
              badge={p.badge}
              badgeVariant={p.rating === "Prohibited" ? "prohibited" : p.rating === "High" ? "high" : p.rating === "Medium" ? "medium" : "low"}
              active={active.id === p.id}
              onClick={() => { setActiveId(p.id); setChecks({}); }}
            />
          );
        })}
      </ModuleGrid>

      <Card className="p-4 mt-4">
        {/* Case header */}
        <div className="flex items-center gap-2 flex-wrap border-b border-line pb-3 mb-3">
          <h3 className="m-0 text-sm font-display">{active.name}</h3>
          <span className={`pill text-[10px] ${RATING_STYLE[active.rating]}`}>{active.rating} risk</span>
          {edd ? (
            <span className="pill bg-hi/15 text-hi text-[10px]">EDD required</span>
          ) : (
            <span className="pill bg-low/15 text-low text-[10px]">Standard CDD</span>
          )}
          {activeTriggers.map((t) => (
            <span key={t} className="pill bg-med/15 text-med text-[10px]">{EDD_TRIGGER_LABEL(t)}</span>
          ))}
          <button type="button" className="btn btn-ghost text-[11px] ml-auto px-2 py-1" onClick={reset}>Reset</button>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-2 rounded-full bg-panel2 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? "#2FD8A6" : "#39B9ED" }} />
          </div>
          <span className="mono text-[11px] text-muted shrink-0">{doneCount}/{requiredIds.length} captured</span>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {[...bySection.entries()].map(([section, rows]) => (
            <div key={section}>
              <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#6E72A6] mb-1.5">
                {EDD_SECTION_LABELS[section]}
              </div>
              <div className="space-y-1.5">
                {rows.map((r) => (
                  <label
                    key={r.id}
                    className="flex items-start gap-3 p-2.5 rounded-lg bg-panel2 border border-lineSoft cursor-pointer hover:border-line transition"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 shrink-0"
                      checked={!!checks[r.id]}
                      onChange={() => toggle(r.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`pill text-[9px] ${REQ_STYLE[r.req]}`}>
                          {r.req === "baseline" ? "Baseline" : r.req === "edd" ? "EDD" : r.reason}
                        </span>
                      </div>
                      <p className={`text-[12px] mt-1 mb-0 ${checks[r.id] ? "text-faint line-through" : "text-ink"}`}>{r.item}</p>
                      <p className="text-[10px] text-faint mt-0.5 mb-0 mono">{r.policyRef}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 mt-4 text-[11px] text-muted">
        <b className="text-ink">Live cases:</b> open the{" "}
        <a href="/test-bench" className="text-ai hover:underline">CRAM Risk Test Bench</a>{" "}
        in Individual mode — after scoring, this EDD pack is driven by the customer's actual rating, PEP tier, RCA flag and
        screening result. Baseline CDD is always collected; EDD switches on when the inherent rating is High or Prohibited.
      </Card>
    </div>
  );
}

function EDD_TRIGGER_LABEL(t: EddTrigger): string {
  const map: Record<EddTrigger, string> = {
    pep_any: "PEP", pep_domestic_io: "Domestic / IO PEP", pep_enhanced: "PEP — enhanced",
    rca: "RCA", sanctions_potential: "Potential sanctions match", adverse: "Adverse media", behaviour: "Expected-vs-actual",
  };
  return map[t];
}

function Stat({ n, l, c }: { n: string; l: string; c?: string }) {
  return (
    <Card className="p-3">
      <div className={`font-display text-xl font-bold ${c ?? ""}`}>{n}</div>
      <div className="text-[11px] text-muted">{l}</div>
    </Card>
  );
}
