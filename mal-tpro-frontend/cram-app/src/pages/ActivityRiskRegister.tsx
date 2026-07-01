import { useMemo, useState } from "react";
import { Card, Sec } from "../components/ui";
import { ACTIVITY_RISK_CONFIG, registerStats, type CustomerMode } from "../config/activityRiskConfig";
import {
  ACTIVITY_DROPDOWN_GROUPS, LIBRARY_COUNTS, PROFESSION_GUIDANCE_OPTIONS, TYPOLOGY_OPTIONS,
} from "../config/activityRegisterOptions";
import { ISIC, RULE_LIB } from "../engine/data";
import { resolveActivityRisk, resolveProfessionRisk } from "../engine/activityRisk";
import { ENTITY_LEGAL_TYPES } from "../config/entityLegalTypes";
import isicLookup from "../data/isic_activity_lookup.json";
import professionGuidance from "../data/isic_profession_guidance.json";
import riskThemes from "../data/isic_risk_themes.json";

export default function ActivityRiskRegister() {
  const [mode, setMode] = useState<CustomerMode>("individual");
  const [query, setQuery] = useState("money services business remittance");
  const [isicCode, setIsicCode] = useState("");

  const stats = registerStats();
  const config = ACTIVITY_RISK_CONFIG[mode];
  const preview = useMemo(() => {
    const activity = resolveActivityRisk(query, mode, isicCode || undefined);
    const profession = resolveProfessionRisk(mode === "individual" ? query : "Director");
    return { activity, profession };
  }, [query, mode, isicCode]);

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["individual", "entity"] as CustomerMode[]).map((m) => (
          <button key={m} type="button"
            className={`px-4 py-2 rounded-xl text-[12px] font-semibold capitalize border ${mode === m ? "bg-ai/20 border-ai text-ink" : "border-line text-muted"}`}
            onClick={() => setMode(m)}>
            {m === "individual" ? "Individual (NP)" : "Entity (LP/MER)"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5 max-lg:grid-cols-1">
        {Object.entries(stats).map(([k, v]) => (
          <Card key={k} className="p-3">
            <div className="text-[10px] text-faint uppercase">{k.replace(/([A-Z])/g, " $1")}</div>
            <div className="font-mono font-bold text-lg">{v}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        <Card className="p-4">
          <Sec>Methodology — {config.segmentLabel}</Sec>
          <p className="text-[12px] text-muted m-0 mb-3">Library <b className="mono text-ink">{config.libraryVersion}</b> · segment <b>{config.segmentCode}</b></p>
          <div className="text-[11px] font-semibold mb-1">Resolution order</div>
          <ol className="text-[11px] text-muted m-0 pl-4 mb-4">{config.resolutionOrder.map((s) => <li key={s}>{s}</li>)}</ol>
          <div className="text-[11px] font-semibold mb-1">Customer-type parameters</div>
          <div className="space-y-2">
            {config.parameters.map((p) => (
              <div key={p.key} className="flex justify-between gap-2 py-1.5 border-b border-lineSoft text-[11px]">
                <span>{p.label}</span>
                <span className="text-muted shrink-0">{(p.weightInCustomerType * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-faint mt-3 m-0">Prohibition: {config.prohibitionSource}</p>
        </Card>

        <Card className="p-4">
          <Sec>Live resolver preview</Sec>
          <div className="space-y-2 mb-3">
            <label className="field-label">Activity / profession text</label>
            <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} />
            <label className="field-label">ISIC code (optional)</label>
            <input className="input mono" value={isicCode} onChange={(e) => setIsicCode(e.target.value)} placeholder="6419" />
          </div>
          <div className="rounded-xl bg-panel2 p-3 text-[11px] space-y-2">
            <div><span className="text-faint">ISIC</span> <b>{preview.activity.code}</b> · {preview.activity.title}</div>
            <div className="text-muted">{preview.activity.basis}</div>
            <div>Score <b>{preview.activity.score}/3</b> · {preview.activity.rating} · {preview.activity.cddEdd}</div>
            {preview.activity.matchedRules.length > 0 && <div className="mono text-[10px]">Rules: {preview.activity.matchedRules.join(", ")}</div>}
            {mode === "individual" && (
              <div className="pt-2 border-t border-lineSoft">
                Profession score <b>{preview.profession.score}/3</b> · {preview.profession.basis}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Sec>Reference registers</Sec>
      <p className="text-[11px] text-muted m-0 mb-3">
        Libraries loaded: {LIBRARY_COUNTS.typologies} typologies · {LIBRARY_COUNTS.professionGuidance} profession guidance ·{" "}
        {LIBRARY_COUNTS.riskThemes} risk themes · {LIBRARY_COUNTS.natureOfBusiness} nature-of-business · {ISIC.length} ISIC codes · {RULE_LIB.length} rules
      </p>
      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        <Card className="p-4">
          <h3 className="m-0 mb-2 text-sm font-display">Typology shortcuts ({TYPOLOGY_OPTIONS.length})</h3>
          <div className="max-h-48 overflow-y-auto text-[11px] space-y-2">
            {(isicLookup as { activity: string; primary_isic: string; aml_rating: string; risk_score: string }[]).map((r) => (
              <div key={r.activity} className="py-1 border-b border-lineSoft">
                <b>{r.activity}</b> → ISIC {r.primary_isic} · {r.aml_rating} ({r.risk_score})
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="m-0 mb-2 text-sm font-display">Profession guidance ({PROFESSION_GUIDANCE_OPTIONS.length})</h3>
          <div className="max-h-48 overflow-y-auto text-[11px] space-y-2">
            {(professionGuidance as { profession_customer_profile: string; indicative_aml_risk: string }[]).map((r) => (
              <div key={r.profession_customer_profile} className="py-1 border-b border-lineSoft">
                {r.profession_customer_profile} · <b>{r.indicative_aml_risk}</b>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="m-0 mb-2 text-sm font-display">Risk theme clusters ({LIBRARY_COUNTS.riskThemes})</h3>
          <div className="max-h-48 overflow-y-auto text-[11px] space-y-2">
            {(riskThemes as { risk_theme_activity_cluster: string; indicative_aml_risk: string }[]).map((r) => (
              <div key={r.risk_theme_activity_cluster} className="py-1 border-b border-lineSoft">
                {r.risk_theme_activity_cluster} · <b>{r.indicative_aml_risk}</b>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="m-0 mb-2 text-sm font-display">
            {mode === "entity" ? `Entity legal types (${ENTITY_LEGAL_TYPES.length})` : "Activity dropdown coverage"}
          </h3>
          {mode === "entity" ? (
            <div className="max-h-64 overflow-y-auto text-[11px] space-y-1">
              {ENTITY_LEGAL_TYPES.map((e) => (
                <div key={e.name} className="py-1 border-b border-lineSoft flex justify-between gap-2">
                  <span className="min-w-0">{e.name}</span>
                  <span className={`shrink-0 font-mono ${e.prohibited ? "text-proh" : e.score >= 3 ? "text-hi" : e.score === 1 ? "text-low" : "text-med"}`}>
                    {e.score}{e.prohibited ? " PROH" : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : (
          <div className="text-[11px] space-y-1">
            {ACTIVITY_DROPDOWN_GROUPS.map((g) => (
              <div key={g.label} className="py-1 border-b border-lineSoft">{g.label}</div>
            ))}
            <div className="text-faint pt-1">Full ISIC Rev.5 ({ISIC.length} codes) resolved via ISIC code field or title match at scoring.</div>
          </div>
          )}
        </Card>
        <Card className="p-4">
          <h3 className="m-0 mb-2 text-sm font-display">ISIC mapping sample ({ISIC.length} total)</h3>
          <div className="max-h-48 overflow-y-auto text-[11px] font-mono space-y-1">
            {ISIC.filter((i) => i.level === "Class").slice(0, 15).map((i) => (
              <div key={i.code}>{i.code} · {i.rating} ({i.score}) · {i.title.slice(0, 50)}…</div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="m-0 mb-2 text-sm font-display">Rule library ({RULE_LIB.length} rules)</h3>
          <div className="max-h-48 overflow-y-auto text-[11px] space-y-1">
            {RULE_LIB.map((r) => (
              <div key={r.rule_id}><b>{r.rule_id}</b> · {r.risk_theme} · score {r.risk_score}</div>
            ))}
          </div>
        </Card>
      </div>
      <p className="text-[11px] text-muted mt-4">Full methodology: docs/06-ACTIVITY-RISK-ISIC.md · config: src/config/activityRiskConfig.ts</p>
    </div>
  );
}
