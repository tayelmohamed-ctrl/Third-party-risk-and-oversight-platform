/**
 * RAKEZ Free Zone business activity register — compact lookup for runtime scoring.
 * Full register: src/data/rakez_freezone_activities.json (regenerate via npm run import:rakez)
 */
import compactRows from "../data/rakez_lookup_compact.json";
import { clampScore } from "./data";
import type { Score } from "./types";

export const RAKEZ_REGISTER_VERSION = "RAKEZ-FZ-2026-07";
export const RAKEZ_REGISTER_SOURCE =
  "https://rakez.com/en/start-a-business/license-activity-list";

export interface RakezActivityEntry {
  rakez_code: string;
  activity_name: string;
  description: string;
  licence_type: string;
  activity_group: string;
  isic_code: string;
  isic_title: string;
  isic_level: string;
  aml_rating: string;
  risk_score: number;
  risk_theme: string;
  cdd_edd: string;
  matched_rules: string;
  prohibited: boolean;
  zone: "freezone";
  source: string;
  mapping_basis: string;
}

type CompactRow = {
  c: string;
  n: string;
  g: string;
  l: string;
  i: string;
  t: string;
  s: number;
  p: boolean;
  a: string;
  th: string;
  d: string;
  b: string;
  m: string;
};

function expand(row: CompactRow): RakezActivityEntry {
  return {
    rakez_code: row.c,
    activity_name: row.n,
    description: "",
    licence_type: row.l,
    activity_group: row.g,
    isic_code: row.i,
    isic_title: row.t,
    isic_level: row.i !== "?" ? "Mapped" : "Unresolved",
    aml_rating: row.a,
    risk_score: row.s,
    risk_theme: row.th,
    cdd_edd: row.d,
    matched_rules: row.m,
    prohibited: row.p,
    zone: "freezone",
    source: "RAKEZ FZ list + ISIC Rev.5 AML mapping",
    mapping_basis: row.b,
  };
}

export const RAKEZ_ACTIVITIES: RakezActivityEntry[] = (compactRows as CompactRow[]).map(expand);

const BY_CODE = new Map<string, RakezActivityEntry>();
const BY_NAME = new Map<string, RakezActivityEntry>();

for (const row of RAKEZ_ACTIVITIES) {
  BY_CODE.set(normalizeRakezCode(row.rakez_code), row);
  BY_NAME.set(row.activity_name.toLowerCase().trim(), row);
}

export function normalizeRakezCode(code: string): string {
  return code.replace(/\s+/g, "").toUpperCase();
}

export function isRakezCodeToken(token: string): boolean {
  const t = token.trim();
  return /^\d{4,6}(?:-\d{2})?$/.test(t) || /^RAKEZ\/\d{4}\/\d+$/i.test(t.replace(/\s+/g, ""));
}

export function extractRakezCodeFromText(text: string): string | undefined {
  const t = text.trim();
  const rakez = t.match(/^(RAKEZ\s*\/\d{4}\/\d+)\b/i);
  if (rakez) return rakez[1].replace(/\s+/g, " ").trim();
  const num = t.match(/^(\d{4,6}(?:-\d{2})?)\b/);
  return num?.[1];
}

export function matchRakezActivity(
  declaredText: string,
  explicitCode?: string,
): RakezActivityEntry | undefined {
  const code = explicitCode ?? extractRakezCodeFromText(declaredText);
  if (code) {
    const hit = BY_CODE.get(normalizeRakezCode(code));
    if (hit) return hit;
  }

  const t = declaredText.toLowerCase().trim();
  if (!t) return undefined;

  const exact = BY_NAME.get(t);
  if (exact) return exact;

  let best: RakezActivityEntry | undefined;
  for (const row of RAKEZ_ACTIVITIES) {
    const name = row.activity_name.toLowerCase();
    if (name.length < 6) continue;
    if (t === name || t.includes(name)) {
      if (!best || name.length > best.activity_name.length) best = row;
    }
  }
  return best;
}

export function rakezRegisterStats() {
  return {
    total: RAKEZ_ACTIVITIES.length,
    high: RAKEZ_ACTIVITIES.filter((r) => r.risk_score >= 3 && !r.prohibited).length,
    medium: RAKEZ_ACTIVITIES.filter((r) => r.risk_score === 2).length,
    low: RAKEZ_ACTIVITIES.filter((r) => r.risk_score === 1).length,
    prohibited: RAKEZ_ACTIVITIES.filter((r) => r.prohibited).length,
    unresolvedIsic: RAKEZ_ACTIVITIES.filter((r) => r.isic_code === "?").length,
  };
}

export function scoreFromRakezEntry(entry: RakezActivityEntry): Score {
  if (entry.prohibited) return 3;
  return clampScore(entry.risk_score) as Score;
}
