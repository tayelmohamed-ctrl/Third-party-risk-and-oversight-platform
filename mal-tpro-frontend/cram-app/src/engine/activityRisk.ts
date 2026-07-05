/**
 * ISIC Rev.5 activity & profession risk resolution — docs/06-ACTIVITY-RISK-ISIC.md
 * Inherent industry risk only (1–3); prohibition (4) handled in override layer.
 */
import isicLookup from "../data/isic_activity_lookup.json";
import professionGuidance from "../data/isic_profession_guidance.json";
import riskThemes from "../data/isic_risk_themes.json";
import riskLegend from "../data/isic_risk_legend.json";
import {
  ISIC, NATURE_OF_BUSINESS, PROFESSIONS, RULE_LIB, lookupProfession as lookupProfessionScore,
  clampScore,
} from "./data";
import { typologyProfessionScore } from "./professionRiskIntelligence";
import type { CompliancePerimeter } from "../config/perimeters";
import type { CustomerMode } from "../config/activityRiskConfig";
import { ACTIVITY_LIBRARY_VERSION } from "../config/activityRiskConfig";
import type { Score } from "./types";
import {
  matchRakezActivity,
  RAKEZ_REGISTER_VERSION,
  scoreFromRakezEntry,
  type RakezActivityEntry,
} from "./rakezActivityRegister";

export interface ActivityLookupRow {
  activity: string;
  primary_isic: string;
  primary_isic_title: string;
  aml_rating: string;
  risk_score: string;
  cdd_edd: string;
  rationale: string;
  controls: string;
}

export interface ActivityResolution {
  declaredText: string;
  providedIsicCode?: string;
  mode: CustomerMode;
  code: string;
  level: string;
  title: string;
  theme: string;
  rating: string;
  score: Score;
  baseScore: Score;
  ruleScore: Score;
  matchedRules: string[];
  basis: string;
  cddEdd: string;
  suggestedControls: string;
  prohibited: boolean;
  remediationRequired: boolean;
  libraryVersion: string;
  sourceUrl: string;
}

export interface ProfessionResolution {
  declaredText: string;
  score: Score;
  professionLibraryScore: Score;
  guidanceScore: Score;
  ruleScore: Score;
  matchedRules: string[];
  basis: string;
  cddTreatment: string;
  remediationRequired: boolean;
  libraryVersion: string;
}

const LOOKUP = isicLookup as ActivityLookupRow[];
const GUIDANCE = professionGuidance as { profession_customer_profile: string; indicative_aml_risk: string; primary_risk_drivers: string; suggested_cra_treatment: string }[];
const THEMES = riskThemes as { risk_theme_activity_cluster: string; indicative_aml_risk: string; primary_risk_rationale: string; cdd_edd_focus: string; indicative_isic_codes_prefixes: string }[];
const LEGEND = riskLegend as { risk_rating: string; score: string; cdd_level: string }[];

const ISIC_SOURCE = "https://unstats.un.org/unsd/classifications/Econ/Download/In%20Text/ISIC_Rev_5_english_structure.csv";

function legendCdd(score: number): string {
  return LEGEND.find((l) => +l.score === score)?.cdd_level ?? "Standard CDD";
}

function findIsicByCode(code: string) {
  const c = code.trim();
  if (!c) return undefined;
  const exact = ISIC.find((i) => i.code === c);
  if (exact) return { entry: exact, level: exact.level };
  for (let len = c.length - 1; len >= 1; len--) {
    const parent = ISIC.find((i) => i.code === c.slice(0, len));
    if (parent) return { entry: parent, level: `${parent.level} (parent of ${c})` };
  }
  return undefined;
}

function matchTypology(text: string): ActivityLookupRow | undefined {
  const t = text.toLowerCase().trim();
  if (!t) return undefined;
  return LOOKUP.find((row) => t.includes(row.activity.toLowerCase()) || row.activity.toLowerCase().split(/[\s/]+/).some((w) => w.length > 4 && t.includes(w)));
}

function matchTheme(text: string): typeof THEMES[0] | undefined {
  const t = text.toLowerCase().trim();
  if (!t) return undefined;
  return THEMES.find((th) => {
    const cluster = th.risk_theme_activity_cluster.toLowerCase();
    return t.includes(cluster.split("/")[0].trim()) || cluster.split(/[\s,/]+/).some((w) => w.length > 5 && t.includes(w));
  });
}

function ruleMatches(text: string): { score: number; ids: string[] } {
  let best = 0;
  const ids: string[] = [];
  for (const r of RULE_LIB) {
    try {
      if (new RegExp(r.keyword_regex, "i").test(text)) {
        const s = parseInt(r.risk_score, 10) || 0;
        if (s >= best) {
          if (s > best) { best = s; ids.length = 0; }
          ids.push(r.rule_id);
        }
      }
    } catch { /* ignore */ }
  }
  return { score: best, ids };
}

function titleMatchIsic(text: string) {
  const t = text.toLowerCase().trim();
  if (!t) return undefined;
  return ISIC.find((i) => i.title.toLowerCase().includes(t) || t.includes(i.title.toLowerCase().slice(0, 12)));
}

function legacyNatureOfBusiness(text: string) {
  const t = text.toLowerCase();
  return NATURE_OF_BUSINESS.find((a) => a.activity.toLowerCase() === t || t.includes(a.activity.toLowerCase()));
}

/** Full ISIC resolution pipeline for LP/MER activity and NP self-employed activity. */
export function resolveActivityRisk(
  declaredText: string,
  mode: CustomerMode = "individual",
  providedIsicCode?: string,
  providedRakezCode?: string,
  perimeter: CompliancePerimeter = "mal_bank",
): ActivityResolution {
  const text = declaredText?.trim() ?? "";
  const matchedRules: string[] = [];
  let code = "?";
  let level = "Unresolved";
  let title = "Unmapped — pending classification";
  let theme = "Manual review";
  let rating = "Medium";
  let baseScore: Score = 2;
  let basis = text || providedIsicCode
    ? "Theme fallback — manual ISIC classification required"
    : "No activity declared — pending capture";
  let cddEdd = legendCdd(2);
  let suggestedControls = "Route to Compliance for ISIC mapping";
  let prohibited = false;
  let remediationRequired = !text && !providedIsicCode;

  if (!text && !providedIsicCode) {
    return {
      declaredText: "",
      providedIsicCode,
      mode,
      code,
      level,
      title,
      theme,
      rating,
      score: 2,
      baseScore: 2,
      ruleScore: 1,
      matchedRules,
      basis,
      cddEdd,
      suggestedControls,
      prohibited,
      remediationRequired,
      libraryVersion: ACTIVITY_LIBRARY_VERSION,
      sourceUrl: ISIC_SOURCE,
    };
  }

  const rules = ruleMatches(text);
  if (rules.ids.length) matchedRules.push(...rules.ids);

  function applyRakezMatch(rakez: RakezActivityEntry) {
    if (rakez.prohibited) {
      prohibited = true;
      baseScore = 3;
      rating = "Prohibited";
      basis = `RAKEZ FZ prohibited: ${rakez.activity_name} (${rakez.rakez_code})`;
      cddEdd = "Reject / Exit";
      theme = rakez.risk_theme;
      title = rakez.isic_title;
      code = rakez.isic_code !== "?" ? rakez.isic_code : rakez.rakez_code;
      level = rakez.isic_level;
      remediationRequired = false;
      if (rakez.matched_rules) matchedRules.push(...rakez.matched_rules.split("; ").filter(Boolean));
      return;
    }
    code = rakez.isic_code !== "?" ? rakez.isic_code : rakez.rakez_code;
    level = rakez.isic_level;
    title = rakez.isic_title !== "Unresolved — manual ISIC mapping" ? rakez.isic_title : rakez.activity_name;
    theme = rakez.risk_theme || rakez.activity_group;
    rating = rakez.aml_rating;
    baseScore = scoreFromRakezEntry(rakez);
    basis = `RAKEZ FZ ${rakez.rakez_code}: ${rakez.activity_name} → ${rakez.mapping_basis}`;
    cddEdd = rakez.cdd_edd || legendCdd(baseScore);
    suggestedControls = `RAKEZ ${rakez.licence_type} · ${rakez.activity_group} · ISIC ${code}`;
    remediationRequired = rakez.isic_code === "?";
    if (rakez.matched_rules) matchedRules.push(...rakez.matched_rules.split("; ").filter(Boolean));
  }

  // 1. Provided ISIC code
  if (providedIsicCode) {
    const hit = findIsicByCode(providedIsicCode);
    if (hit) {
      code = hit.entry.code;
      level = hit.level;
      title = hit.entry.title;
      theme = hit.entry.theme;
      rating = hit.entry.rating;
      baseScore = clampScore(hit.entry.score) as Score;
      basis = `ISIC code ${providedIsicCode} → ${level} ${code}`;
      cddEdd = legendCdd(baseScore);
      remediationRequired = false;
    }
  }

  // 2. RAKEZ Free Zone register (UAE FZ licence — mal_bank only)
  if (perimeter === "mal_bank" && (code === "?" || remediationRequired)) {
    const rakez = matchRakezActivity(text, providedRakezCode);
    if (rakez) {
      applyRakezMatch(rakez);
    }
  }

  // 3. Typology shortcut
  if (code === "?" || remediationRequired) {
    const typo = matchTypology(text);
    if (typo) {
      code = typo.primary_isic;
      title = typo.primary_isic_title;
      rating = typo.aml_rating;
      baseScore = clampScore(+typo.risk_score) as Score;
      theme = typo.activity;
      basis = `Typology lookup: ${typo.activity} → ISIC ${code}`;
      cddEdd = typo.cdd_edd;
      suggestedControls = typo.controls;
      level = "Class";
      remediationRequired = false;
    }
  }

  // 4. Title match
  if (code === "?" || remediationRequired) {
    const hit = titleMatchIsic(text);
    if (hit) {
      code = hit.code;
      level = hit.level;
      title = hit.title;
      theme = hit.theme;
      rating = hit.rating;
      baseScore = clampScore(hit.score) as Score;
      basis = `ISIC title match → ${code}`;
      cddEdd = legendCdd(baseScore);
      remediationRequired = false;
    }
  }

  // 5. Legacy nature_of_business (incl. prohibition 4)
  const legacy = legacyNatureOfBusiness(text);
  if (legacy) {
    if (legacy.score >= 4) {
      prohibited = true;
      baseScore = 3;
      basis = `Prohibited activity list: ${legacy.activity}`;
      cddEdd = "Reject / Exit";
    } else if (code === "?") {
      baseScore = clampScore(legacy.score) as Score;
      title = legacy.activity;
      basis = `Legacy nature_of_business: ${legacy.activity}`;
      rating = baseScore === 3 ? "High" : baseScore === 2 ? "Medium" : "Low";
      cddEdd = legendCdd(baseScore);
      remediationRequired = false;
    }
  }

  // 6. Theme fallback
  if (code === "?" && !legacy) {
    const th = matchTheme(text);
    if (th) {
      theme = th.risk_theme_activity_cluster;
      rating = th.indicative_aml_risk;
      baseScore = (th.indicative_aml_risk === "High" ? 3 : th.indicative_aml_risk === "Low" ? 1 : 2) as Score;
      basis = `Theme fallback: ${th.risk_theme_activity_cluster}`;
      cddEdd = th.cdd_edd_focus;
      remediationRequired = true;
    }
  }

  // Rule-only uplift when no ISIC base
  if (code === "?" && rules.score > 0 && !legacy) {
    baseScore = clampScore(rules.score) as Score;
    title = "(matched by typology rule)";
    basis = `Rule library: ${rules.ids.join(", ")}`;
    cddEdd = legendCdd(baseScore);
  }

  const ruleScore = clampScore(rules.score) as Score;
  const finalScore = clampScore(Math.max(baseScore, ruleScore)) as Score;

  if (code === "?" && !prohibited) remediationRequired = true;

  return {
    declaredText: text,
    providedIsicCode,
    mode,
    code,
    level,
    title,
    theme,
    rating,
    score: finalScore,
    baseScore,
    ruleScore,
    matchedRules,
    basis,
    cddEdd,
    suggestedControls,
    prohibited,
    remediationRequired,
    libraryVersion: ACTIVITY_LIBRARY_VERSION,
    sourceUrl: ISIC_SOURCE,
  };
}

/** NP profession resolution — profession.csv + guidance + rules. */
export function resolveProfessionRisk(declaredText: string): ProfessionResolution {
  const text = declaredText?.trim() ?? "";
  if (!text) {
    return {
      declaredText: "",
      score: 2 as Score,
      professionLibraryScore: 2 as Score,
      guidanceScore: 1 as Score,
      ruleScore: 1 as Score,
      matchedRules: [],
      basis: "No profession declared — pending capture",
      cddTreatment: "Standard CDD",
      remediationRequired: true,
      libraryVersion: ACTIVITY_LIBRARY_VERSION,
    };
  }
  const libScore = lookupProfessionScore(text) as Score;
  let guidanceScore: Score = 1;
  let cddTreatment = "Standard CDD";
  const g = GUIDANCE.find((row) => {
    const p = row.profession_customer_profile.toLowerCase();
    const q = text.toLowerCase();
    if (!q) return false;
    return q.includes(p.split("/")[0].trim()) || (q.length >= 3 && p.includes(q)) || p.split(/[\s/]+/).some((w) => w.length > 5 && q.includes(w));
  });
  if (g) {
    guidanceScore = g.indicative_aml_risk === "High" ? 3 : g.indicative_aml_risk === "Medium" ? 2 : 1;
    cddTreatment = g.suggested_cra_treatment;
  }
  const rules = ruleMatches(text);
  const ruleScore = clampScore(rules.score) as Score;
  const typo = typologyProfessionScore(text);
  const score = clampScore(Math.max(libScore, guidanceScore, ruleScore, typo.score)) as Score;
  const remediationRequired = !PROFESSIONS.some((p) => p.name.toLowerCase() === text.toLowerCase()) && score <= 2;

  return {
    declaredText: text,
    score,
    professionLibraryScore: libScore,
    guidanceScore,
    ruleScore: clampScore(Math.max(rules.score, typo.score)) as Score,
    matchedRules: [...rules.ids, ...(typo.typology ? [`TYP-${typo.typology.category}`] : [])],
    basis: typo.typology
      ? `Typology: ${typo.typology.drivers[0]} (${typo.typology.policyRef})`
      : remediationRequired ? "Unmapped profession — Medium pending mapping" : `profession.csv + guidance max`,
    cddTreatment: typo.typology?.eddTrigger ? "EDD required per typology" : cddTreatment,
    remediationRequired,
    libraryVersion: ACTIVITY_LIBRARY_VERSION,
  };
}

/** Compute customer-type activity/profession scores for individual vs entity. */
export function resolveCustomerTypeActivityScores(opts: {
  mode: CustomerMode;
  declaredProfession: string;
  declaredActivity: string;
  providedIsicCode?: string;
  providedRakezCode?: string;
  entityTypeScore?: Score;
  selfEmployed?: boolean;
  perimeter?: CompliancePerimeter;
}): {
  professionScore: Score;
  natureOfBusinessScore: Score;
  activityResolution: ActivityResolution;
  professionResolution: ProfessionResolution;
} {
  const professionResolution = opts.mode === "entity"
    ? {
        declaredText: "",
        score: 1 as Score,
        professionLibraryScore: 1 as Score,
        guidanceScore: 1 as Score,
        ruleScore: 1 as Score,
        matchedRules: [] as string[],
        basis: "N/A — legal person uses ISIC activity (not profession)",
        cddTreatment: "Per ISIC activity outcome",
        remediationRequired: false,
        libraryVersion: ACTIVITY_LIBRARY_VERSION,
      }
    : resolveProfessionRisk(opts.declaredProfession || opts.declaredActivity);
  const perimeter = opts.perimeter ?? "mal_bank";
  const activityResolution = resolveActivityRisk(
    opts.declaredActivity,
    opts.mode,
    opts.providedIsicCode,
    opts.providedRakezCode,
    perimeter,
  );

  if (opts.mode === "entity") {
    return {
      professionScore: professionResolution.score,
      natureOfBusinessScore: activityResolution.score,
      activityResolution,
      professionResolution,
    };
  }

  // Individual: profession primary; ISIC activity applies when self-employed
  const natureScore = opts.selfEmployed
    ? clampScore(Math.max(activityResolution.score, professionResolution.score)) as Score
    : professionResolution.score;

  return {
    professionScore: professionResolution.score,
    natureOfBusinessScore: natureScore,
    activityResolution,
    professionResolution,
  };
}

/** Backward-compatible wrapper used across engine. */
export function resolveActivity(text: string, providedIsicCode?: string) {
  const r = resolveActivityRisk(text, "individual", providedIsicCode);
  return {
    score: r.score,
    code: r.code,
    title: r.title,
    theme: r.theme,
    rule: r.matchedRules[0],
    basis: r.basis,
    cddEdd: r.cddEdd,
    prohibited: r.prohibited,
  };
}
