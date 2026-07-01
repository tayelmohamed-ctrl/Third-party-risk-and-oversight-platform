import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CORRIDOR_EWRA_PACK,
  effectiveCountryScore,
  isStageComplete,
  riskBandColor,
  type CorridorTheme,
  type ComplianceCountryModule,
} from "../../config/corridorEwraWorkflow";
import { AGENTS } from "../../config/agents";
import AgentAiTag from "../agents/AgentAiTag";
import DriveLink from "./DriveLink";
import PakistanRiskTypologyLibrary from "./PakistanRiskTypologyLibrary";
import { Card } from "../ui";

type View = "pipeline" | "corridors" | "countries" | "riskLibrary";

export default function CorridorEwraWorkflow({ defaultView }: { defaultView?: View } = {}) {
  const [view, setView] = useState<View>(defaultView ?? "pipeline");
  const [selCorridor, setSelCorridor] = useState<string>(CORRIDOR_EWRA_PACK.corridorThemes[0]?.id ?? "");

  const corridor = useMemo(
    () => CORRIDOR_EWRA_PACK.corridorThemes.find((c) => c.id === selCorridor),
    [selCorridor],
  );

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of CORRIDOR_EWRA_PACK.workflowStages) counts[s.id] = 0;
    for (const c of CORRIDOR_EWRA_PACK.corridorThemes) counts[c.workflowStage] = (counts[c.workflowStage] ?? 0) + 1;
    return counts;
  }, []);

  return (
    <div className="space-y-4">
      <Card className="p-4 border-ai/30">
        <AgentAiTag agent="sayed">Sayed — corridor EWRA theme workflow</AgentAiTag>
        <p className="text-[12px] text-muted mt-2 m-0 max-w-3xl leading-relaxed">
          Enterprise corridor themes sit <b className="text-ink">below</b> the board EWRA heat map and <b className="text-ink">above</b> customer CRA scores.
          Each corridor passes through country-module completion, inherent scoring, control mapping, Mohsen TM scenarios, MLRO sign-off (Walid), and Jana board reporting.
          Version <span className="mono">{CORRIDOR_EWRA_PACK.version}</span> · {CORRIDOR_EWRA_PACK.category}
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <DriveLink folderKey="evidenceRisk" docPath={CORRIDOR_EWRA_PACK.driveDoc} label="Corridor themes (Drive)" />
          <Link to="/test-bench" className="text-[11px] text-ai hover:underline self-center">Validate geography in Risk Test Bench →</Link>
          <Link to="/transaction-monitoring" className="text-[11px] text-ai hover:underline self-center">Mohsen TM rules →</Link>
        </div>
      </Card>

      <div className="flex gap-2 flex-wrap">
        {([
          ["pipeline", "Workflow pipeline"],
          ["corridors", "Corridor themes"],
          ["countries", "Compliance country modules"],
          ["riskLibrary", "Risk typology library · PK"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${
              view === id ? "bg-ai/20 border-ai" : "border-line text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "pipeline" && (
        <Card className="p-4">
          <div className="text-sm font-display font-semibold mb-1">Go-live pipeline</div>
          <p className="text-[11px] text-muted m-0 mb-4">
            Identified → Country module → Inherent scored → Controls mapped → TM scenarios (Mohsen) → MLRO approved → Board notified (Jana) → Live → Review due
          </p>
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-1 min-w-max">
              {CORRIDOR_EWRA_PACK.workflowStages.map((stage, i) => (
                <Fragment key={stage.id}>
                  <div className="w-[108px] p-2 rounded-lg border border-line bg-panel2 text-center">
                    <div className="text-[9px] text-faint uppercase">{stage.agent}</div>
                    <div className="text-[11px] font-semibold mt-0.5">{stage.label}</div>
                    <div className="text-lg font-display font-bold mt-1" style={{ color: stageCounts[stage.id] ? "#F6A623" : "#5a6278" }}>
                      {stageCounts[stage.id] ?? 0}
                    </div>
                  </div>
                  {i < CORRIDOR_EWRA_PACK.workflowStages.length - 1 && (
                    <span className="text-faint self-center text-xs">→</span>
                  )}
                </Fragment>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-lineSoft space-y-2">
            {CORRIDOR_EWRA_PACK.workflowStages.map((s) => (
              <div key={s.id} className="text-[11px] text-muted">
                <AgentAiTag agent={s.agent}>{AGENTS[s.agent].name}</AgentAiTag>
                <span className="ml-2">{s.description}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {view === "corridors" && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          <Card className="p-2">
            <div className="px-2 py-2 text-[11px] text-faint uppercase">Corridors ({CORRIDOR_EWRA_PACK.corridorThemes.length})</div>
            {CORRIDOR_EWRA_PACK.corridorThemes.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelCorridor(c.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-[12px] border transition mb-1 ${
                  selCorridor === c.id ? "bg-ai/15 border-ai" : "border-transparent hover:bg-panel2"
                }`}
              >
                <div className="font-semibold">{c.label}</div>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  <BandPill band={c.inherentRisk} prefix="Inh" />
                  <span className="pill text-[9px] bg-panel3 text-muted">{c.status}</span>
                </div>
              </button>
            ))}
          </Card>
          {corridor && <CorridorDetail corridor={corridor} />}
        </div>
      )}

      {view === "countries" && (
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-line">
            <h3 className="m-0 text-sm font-display">Compliance country modules</h3>
            <p className="text-[11px] text-muted m-0 mt-1">
              EWRA overrides extend CRA <span className="mono">country_risk.csv</span> firm scores for corridor and enterprise geography themes.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-faint text-[10px] uppercase">
                  <th className="text-left px-4 py-2">Country</th>
                  <th className="text-left py-2">FATF</th>
                  <th className="text-left py-2">CRA score</th>
                  <th className="text-left py-2">EWRA override</th>
                  <th className="text-left py-2">EDD</th>
                  <th className="text-left py-2">Regulator</th>
                  <th className="text-left py-2 pr-4">Drive</th>
                </tr>
              </thead>
              <tbody>
                {CORRIDOR_EWRA_PACK.complianceCountryModules.map((m) => (
                  <CountryRow key={m.countryCode} mod={m} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {view === "riskLibrary" && <PakistanRiskTypologyLibrary />}
    </div>
  );
}

function CountryRow({ mod }: { mod: ComplianceCountryModule }) {
  const eff = effectiveCountryScore(mod);
  return (
    <tr className="border-t border-lineSoft">
      <td className="px-4 py-2.5">
        <span className="mono text-[10px] text-muted">{mod.countryCode}</span> {mod.countryName}
        {mod.typologyLibraryId && (
          <div className="text-[10px] text-ai mt-0.5">📚 {mod.typologyLibraryId}</div>
        )}
      </td>
      <td className="py-2.5">
        <span className={`pill text-[10px] ${mod.fatfStatus === "grey_list" ? "bg-med/20 text-med" : "bg-panel3 text-muted"}`}>
          {mod.fatfStatus.replace("_", " ")}
        </span>
      </td>
      <td className="py-2.5 mono">{mod.craFirmScore} · {mod.craBand}</td>
      <td className="py-2.5">
        {mod.ewraFirmScoreOverride != null ? (
          <span style={{ color: riskBandColor(eff.band) }} className="font-semibold">
            {mod.ewraFirmScoreOverride} · {mod.ewraBandOverride}
          </span>
        ) : (
          <span className="text-faint">—</span>
        )}
      </td>
      <td className="py-2.5">{mod.eddMandatory ? "Required" : "Standard"}</td>
      <td className="py-2.5 text-muted text-[11px] max-w-[180px]">{mod.localRegulator}</td>
      <td className="py-2.5 pr-4"><DriveLink folderKey="evidenceRisk" docPath={mod.driveDoc} compact /></td>
    </tr>
  );
}

function CorridorDetail({ corridor }: { corridor: CorridorTheme }) {
  const destMod = CORRIDOR_EWRA_PACK.complianceCountryModules.find((m) => m.countryCode === corridor.destinationCountryCode);
  const eff = destMod ? effectiveCountryScore(destMod) : null;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-wrap gap-2 items-baseline">
        <h3 className="m-0 text-sm font-display">{corridor.label}</h3>
        <span className="mono text-[11px] text-ai">{corridor.id}</span>
        <span className="pill text-[10px] bg-panel3 text-muted ml-auto">{corridor.status}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <BandPill band={corridor.inherentRisk} prefix="Inherent" />
        {corridor.corridorScore && (
          <span className="cram-pill cram-pill--prohibited text-[10px]">
            {corridor.corridorScore.rating} · L×I {corridor.corridorScore.likelihoodImpact}
          </span>
        )}
        <span className="pill text-[10px] bg-panel3 text-muted">Control: {corridor.controlRating}</span>
        <span className="pill text-[10px] bg-panel3 text-muted">Residual: {corridor.residualRisk}</span>
        {eff && (
          <span className="pill text-[10px]" style={{ background: `${riskBandColor(eff.band)}22`, color: riskBandColor(eff.band) }}>
            Dest. score {eff.score} ({eff.source === "ewra_override" ? "EWRA" : "CRA"})
          </span>
        )}
      </div>

      <div>
        <div className="text-[10px] text-faint uppercase mb-2">Workflow progress</div>
        <div className="flex flex-wrap gap-1">
          {CORRIDOR_EWRA_PACK.workflowStages.map((s) => {
            const done = isStageComplete(corridor, s.id);
            const current = corridor.workflowStage === s.id;
            return (
              <span
                key={s.id}
                className={`px-2 py-1 rounded text-[10px] border ${
                  current ? "border-ai bg-ai/20 text-ink font-semibold" : done ? "border-low/40 bg-low/10 text-low" : "border-line text-faint"
                }`}
              >
                {s.label}
              </span>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <RiskBlock title="ML typologies" items={corridor.corridorRisks.mlTypologies} />
        <RiskBlock title="TF typologies" items={corridor.corridorRisks.tfTypologies} />
        <RiskBlock title="Illicit finance" items={corridor.corridorRisks.illicitFinanceTypologies} />
        <RiskBlock title="Islamic-specific" items={corridor.corridorRisks.islamicSpecific} />
      </div>
      {corridor.corridorRisks.sanctionsNotes && (
        <p className="text-[11px] text-med m-0">Sanctions: {corridor.corridorRisks.sanctionsNotes}</p>
      )}

      <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1 text-[11px]">
        <MetaList title="Controls" items={corridor.controls} />
        <MetaList title="Workflows" items={corridor.workflows} />
        <MetaList title="Oscilar rules" items={corridor.oscilarRules.length ? corridor.oscilarRules : ["— pending Mohsen"]} />
        <MetaList title="Products" items={corridor.productScope} />
      </div>

      <div className="p-3 rounded-xl border border-line bg-panel2 text-[11px]">
        <div className="flex flex-wrap gap-3">
          <span>MLRO sign-off: <b className={corridor.approval.mlroSignOff ? "text-low" : "text-hi"}>{corridor.approval.mlroSignOff ? "Yes" : "Pending"}</b></span>
          <span>Board notified: <b>{corridor.approval.boardNotified ? "Yes" : "No"}</b></span>
          <span>Target go-live: <b>{corridor.approval.targetGoLive}</b></span>
          <span>Next review: <b>{corridor.nextReview}</b></span>
        </div>
        <div className="flex flex-wrap gap-3 mt-2 pt-2 border-t border-lineSoft">
          <AgentAiTag agent="mohsen">Typologies</AgentAiTag>
          <AgentAiTag agent="jana">{corridor.reportingTemplate}</AgentAiTag>
          {corridor.typologyLibraryId && (
            <span className="text-[10px] text-ai">📚 {corridor.typologyLibraryId} → Risk typology library tab</span>
          )}
          <DriveLink folderKey="evidenceRisk" docPath={corridor.driveDoc} label="Corridor pack (Drive)" />
        </div>
      </div>
    </Card>
  );
}

function BandPill({ band, prefix }: { band: string; prefix?: string }) {
  return (
    <span className="pill text-[10px] font-semibold" style={{ background: `${riskBandColor(band as "Low")}22`, color: riskBandColor(band as "Low") }}>
      {prefix ? `${prefix} ` : ""}{band}
    </span>
  );
}

function RiskBlock({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="text-[10px] text-faint uppercase mb-1">{title}</div>
      <div className="flex flex-wrap gap-1">
        {items.map((t) => (
          <span key={t} className="pill text-[10px] bg-panel3 text-muted">{t.replace(/_/g, " ")}</span>
        ))}
      </div>
    </div>
  );
}

function MetaList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-[10px] text-faint uppercase mb-1">{title}</div>
      <div className="mono text-muted">{items.join(" · ")}</div>
    </div>
  );
}
