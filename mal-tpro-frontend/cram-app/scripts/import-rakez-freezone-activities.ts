/**
 * Import RAKEZ Free Zone business activity list → rakez_freezone_activities.csv + JSON
 * Source: seed/data/rakez_freezone_activities.pdf (official RAKEZ publication)
 * Usage: npx tsx scripts/import-rakez-freezone-activities.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(root, "seed/data/rakez_freezone_activities_source.txt");
const isicPath = join(root, "src/data/isic.json");
const rulesPath = join(root, "src/data/isic_rule_library.json");
const nobPath = join(root, "src/data/nature_of_business.json");

const LICENCE_TYPES = [
  "Individual / Professional",
  "Higher Education Provider",
  "Business Invest",
  "Educational",
  "Commercial",
  "Industrial",
  "Service",
  "Media",
] as const;

type LicenceType = (typeof LICENCE_TYPES)[number];

interface IsicRow {
  code: string;
  level: string;
  title: string;
  rating: string;
  score: number;
  theme: string;
}

interface RuleRow {
  rule_id: string;
  keyword_regex: string;
  risk_score: string;
  risk_theme: string;
}

export interface RakezActivityRow {
  rakez_code: string;
  activity_name: string;
  description: string;
  licence_type: LicenceType | string;
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

const CODE_RE = /(?:^|\n|\s)((?:\d{4,6}(?:-\d{2})?|RAKEZ\s*\/\d{4}\/\d+))\s+/g;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === "," && !inQ) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function csvEscape(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function normalizeSpace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function findLicenceTail(text: string): { licence: string; group: string; body: string } | null {
  const normalized = text.replace(/Individual\s*\/\s*\n\s*Professional/g, "Individual / Professional");

  // Media / Educational blocks (100xxx series) — licence token before activity group
  for (const lic of ["Media", "Educational", "Higher Education Provider"] as const) {
    const needle = ` ${lic} `;
    const idx = normalized.lastIndexOf(needle);
    if (idx > 0) {
      const group = normalizeSpace(normalized.slice(idx + needle.length));
      const body = normalizeSpace(normalized.slice(0, idx));
      if (body.length >= 2 && group.length >= 2) {
        return { licence: lic, group, body };
      }
    }
  }

  for (const lic of LICENCE_TYPES) {
    const idx = normalized.lastIndexOf(lic);
    if (idx === -1) continue;
    const after = normalizeSpace(normalized.slice(idx + lic.length));
    const group = after.split(/\s{2,}/)[0]?.trim() ?? after;
    const body = normalizeSpace(normalized.slice(0, idx));
    if (body.length < 2) continue;
    return { licence: lic, group, body };
  }
  return null;
}

function parseActivities(raw: string): { code: string; chunk: string }[] {
  const hits: { code: string; index: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(CODE_RE.source, "g");
  while ((m = re.exec(raw)) !== null) {
    hits.push({ code: normalizeSpace(m[1]), index: m.index + m[0].length - m[1].length - (m[0].startsWith("\n") || m[0].startsWith(" ") ? 1 : 0), end: m.index + m[0].length });
  }
  const out: { code: string; chunk: string }[] = [];
  for (let i = 0; i < hits.length; i += 1) {
    const start = hits[i].end;
    const end = i + 1 < hits.length ? hits[i + 1].index : raw.length;
    out.push({ code: hits[i].code, chunk: raw.slice(start, end) });
  }
  return out;
}

function isicCandidatesFromRakezCode(code: string): string[] {
  const c = code.replace(/\s+/g, "");
  if (c.startsWith("RAKEZ/")) return [];
  const m = c.match(/^(\d{4,6})(?:-(\d{2}))?$/);
  if (!m) return [];
  const base = m[1];
  const sub = m[2];
  const out: string[] = [];
  if (sub) {
    out.push(base + sub);
    out.push(base.slice(0, 4) + sub);
  }
  if (base.length >= 4) out.push(base.slice(0, 4));
  if (base.length >= 3) out.push(base.slice(0, 3));
  if (base.length >= 2) out.push(base.slice(0, 2));
  out.push(base);
  return [...new Set(out.filter(Boolean))];
}

function loadIsic(): IsicRow[] {
  return JSON.parse(readFileSync(isicPath, "utf8")) as IsicRow[];
}

function findIsic(isic: IsicRow[], code: string): IsicRow | undefined {
  const c = code.trim();
  const exact = isic.find((i) => i.code === c);
  if (exact) return exact;
  for (let len = c.length - 1; len >= 1; len -= 1) {
    const parent = isic.find((i) => i.code === c.slice(0, len));
    if (parent) return parent;
  }
  return undefined;
}

function ruleMatch(text: string, rules: RuleRow[]): { score: number; ids: string[] } {
  let best = 0;
  const ids: string[] = [];
  for (const r of rules) {
    try {
      if (new RegExp(r.keyword_regex, "i").test(text)) {
        const s = parseInt(r.risk_score, 10) || 0;
        if (s >= best) {
          if (s > best) { best = s; ids.length = 0; }
          ids.push(r.rule_id);
        }
      }
    } catch { /* ignore bad regex */ }
  }
  return { score: best, ids };
}

const PROHIBITED_KEYWORDS = [
  /\bgambl/i, /\bbetting\b/i, /\bcasino/i, /\blotter/i,
  /\bnarcotic/i, /\billegal\b/i, /\bescort\b/i,
  /\bunregulated money service/i, /\bhawala\b/i,
];

const HIGH_RISK_GROUPS = new Set([
  "Fuel and petroleum products trading",
  "Precious metals and stones trading",
  "Waste trading",
  "Financial services",
  "Money exchange",
  "Jewellery trading",
]);

function scoreActivity(
  name: string,
  description: string,
  group: string,
  licence: string,
  rakezCode: string,
  isicLib: IsicRow[],
  rules: RuleRow[],
  nobProhibited: Set<string>,
): Omit<RakezActivityRow, "rakez_code" | "activity_name" | "description" | "licence_type" | "activity_group"> {
  const blob = `${name} ${description} ${group}`.toLowerCase();
  const matched = ruleMatch(blob, rules);

  for (const re of PROHIBITED_KEYWORDS) {
    if (re.test(blob)) {
      return {
        isic_code: "—",
        isic_title: "Prohibited / not licensed by RAKEZ",
        isic_level: "Policy",
        aml_rating: "Prohibited",
        risk_score: 4,
        risk_theme: "Prohibited activity",
        cdd_edd: "Reject / Exit",
        matched_rules: matched.ids.join("; "),
        prohibited: true,
        zone: "freezone",
        source: "RAKEZ FZ list + CBUAE / RAKEZ illegal activities policy",
        mapping_basis: "Prohibited keyword / RAKEZ policy note",
      };
    }
  }

  for (const p of nobProhibited) {
    if (blob.includes(p.toLowerCase()) || name.toLowerCase().includes(p.toLowerCase())) {
      return {
        isic_code: "—",
        isic_title: p,
        isic_level: "Legacy NOB",
        aml_rating: "Prohibited",
        risk_score: 4,
        risk_theme: "Prohibited activity",
        cdd_edd: "Reject / Exit",
        matched_rules: matched.ids.join("; "),
        prohibited: true,
        zone: "freezone",
        source: "nature_of_business.csv score 4",
        mapping_basis: `Legacy prohibition match: ${p}`,
      };
    }
  }

  let hit: IsicRow | undefined;
  let basis = "";
  for (const hint of isicCandidatesFromRakezCode(rakezCode)) {
    hit = findIsic(isicLib, hint);
    if (hit) {
      basis = `RAKEZ code ${rakezCode} → ISIC ${hit.code} (${hit.level})`;
      break;
    }
  }

  if (!hit) {
    const titleHit = isicLib.find((i) =>
      i.title.toLowerCase().includes(name.toLowerCase().slice(0, 12))
      || name.toLowerCase().includes(i.title.toLowerCase().slice(0, 10)),
    );
    if (titleHit) {
      hit = titleHit;
      basis = `Activity name title match → ISIC ${hit.code}`;
    }
  }

  let base = hit?.score ?? 2;
  let rating = hit?.rating ?? "Medium";
  let theme = hit?.theme ?? (group || "General trading / services");
  let isicCode = hit?.code ?? "?";
  let isicTitle = hit?.title ?? "Unresolved — manual ISIC mapping";
  let level = hit?.level ?? "Unresolved";

  if (!hit) basis = "Theme / group heuristic — ISIC parent not resolved";

  const ruleScore = matched.score;
  const finalScore = Math.min(3, Math.max(base, ruleScore > 0 ? ruleScore : base));

  if (HIGH_RISK_GROUPS.has(group) && finalScore < 2) {
    base = 2;
  }
  if (licence === "Business Invest" && /holding|investment fund|spv|trust/i.test(blob) && finalScore < 3) {
    base = Math.max(base, 3);
    theme = "Investment / holding structures";
  }
  if (/general trading|trading(?! company)/i.test(name) && finalScore < 2) {
    base = Math.max(base, 2);
  }
  if (/money exchange|currency exchange|remittance|financial/i.test(blob) && finalScore < 3) {
    base = 3;
    theme = "Financial services / MSB typology";
  }
  if (/crypto|virtual asset|blockchain|bitcoin/i.test(blob)) {
    base = 3;
    theme = "Virtual assets / crypto";
  }
  if (/real estate broker|property broker/i.test(blob) && !/self owned|self-owned/i.test(blob)) {
    base = Math.max(base, 2);
  }
  if (/precious|bullion|gold|diamond|jewell/i.test(blob)) {
    base = Math.max(base, 3);
  }
  if (/weapon|firearm|ammunition|defence|defense|military/i.test(blob)) {
    base = Math.max(base, 3);
  }

  const score = Math.min(3, Math.max(base, ruleScore, finalScore));
  rating = score >= 3 ? "High" : score === 2 ? "Medium" : "Low";
  let cdd = score >= 3 ? "Enhanced Due Diligence (EDD)" : score === 2 ? "Standard CDD + monitoring" : "Standard CDD";
  if (hit?.rating === "High" && score >= 3) cdd = "Enhanced Due Diligence (EDD)";

  return {
    isic_code: isicCode,
    isic_title: isicTitle,
    isic_level: level,
    aml_rating: rating,
    risk_score: score,
    risk_theme: theme,
    cdd_edd: cdd,
    matched_rules: matched.ids.join("; "),
    prohibited: false,
    zone: "freezone",
    source: "RAKEZ FZ list + ISIC Rev.5 AML mapping + rule library",
    mapping_basis: basis,
  };
}

function extractNameAndDescription(body: string): { name: string; description: string } {
  const b = normalizeSpace(body);
  if (!b) return { name: "Unknown", description: "" };

  // Media licence rows often repeat the activity name twice before licence token
  const dup = b.match(/^(.+?)\s+\1$/i);
  if (dup) return { name: dup[1].trim(), description: dup[1].trim() };

  const includesIdx = b.search(/\bIncludes\b|\bMembership entity\b|\bA membership entity\b/i);
  if (includesIdx > 0) {
    return {
      name: b.slice(0, includesIdx).trim(),
      description: b.slice(includesIdx).trim(),
    };
  }

  const words = b.split(" ");
  if (words.length <= 8) return { name: b, description: "" };

  let splitAt = Math.min(12, Math.floor(words.length * 0.35));
  for (let i = 4; i < Math.min(20, words.length); i += 1) {
    if (/^(Includes|Manufacturing|Trading|Producing|Reselling|Designing|Operating|Providing|Agency|Consultancy)/i.test(words[i])) {
      splitAt = i;
      break;
    }
  }
  return {
    name: words.slice(0, splitAt).join(" "),
    description: words.slice(splitAt).join(" "),
  };
}

// --- main ---
const raw = readFileSync(sourcePath, "utf8")
  .replace(/Individual\s*\/\s*\n\s*Professional/g, "Individual / Professional")
  .replace(/RAKEZ BUSINESS ACTIVITY LIST - FREE ZONE/g, "")
  .replace(/Activity Code Activity Name Description Licence Type Activity Group/g, "")
  .replace(/\b\d+\/64\b/g, " ");

const isicLib = loadIsic();
const rules = (JSON.parse(readFileSync(rulesPath, "utf8")) as { rules: RuleRow[] }).rules;
const nob = JSON.parse(readFileSync(nobPath, "utf8")) as { activity: string; score: number }[];
const nobProhibited = new Set(nob.filter((n) => n.score >= 4).map((n) => n.activity));

const parsed = parseActivities(raw);
const byCode = new Map<string, RakezActivityRow>();

for (const { code, chunk } of parsed) {
  if (code.length < 3) continue;
  const tail = findLicenceTail(chunk);
  if (!tail) continue;
  const { name, description } = extractNameAndDescription(tail.body);
  if (!name || name.length < 2) continue;

  const scored = scoreActivity(name, description, tail.group, tail.licence, code, isicLib, rules, nobProhibited);
  const row: RakezActivityRow = {
    rakez_code: code.replace(/\s+/g, " ").trim(),
    activity_name: name,
    description,
    licence_type: tail.licence,
    activity_group: tail.group,
    ...scored,
  };

  const key = row.rakez_code;
  const existing = byCode.get(key);
  if (!existing || row.activity_name.length > existing.activity_name.length) {
    byCode.set(key, row);
  }
}

const rows = [...byCode.values()].sort((a, b) => a.activity_name.localeCompare(b.activity_name));

const headers = [
  "rakez_code", "activity_name", "description", "licence_type", "activity_group",
  "isic_code", "isic_title", "isic_level", "aml_rating", "risk_score", "risk_theme",
  "cdd_edd", "matched_rules", "prohibited", "zone", "source", "mapping_basis",
];

const csv = [
  headers.join(","),
  ...rows.map((r) => headers.map((h) => csvEscape(String((r as Record<string, unknown>)[h] ?? ""))).join(",")),
].join("\n");

writeFileSync(join(root, "seed/data/rakez_freezone_activities.csv"), `${csv}\n`);
writeFileSync(join(root, "src/data/rakez_freezone_activities.json"), `${JSON.stringify(rows, null, 2)}\n`);

const compact = rows.map((r) => ({
  c: r.rakez_code,
  n: r.activity_name,
  g: r.activity_group,
  l: r.licence_type,
  i: r.isic_code,
  t: r.isic_title,
  s: r.risk_score,
  p: r.prohibited,
  a: r.aml_rating,
  th: r.risk_theme,
  d: r.cdd_edd,
  b: r.mapping_basis,
  m: r.matched_rules,
}));
writeFileSync(join(root, "src/data/rakez_lookup_compact.json"), `${JSON.stringify(compact)}\n`);

const stats = {
  total: rows.length,
  high: rows.filter((r) => r.risk_score >= 3 && !r.prohibited).length,
  medium: rows.filter((r) => r.risk_score === 2).length,
  low: rows.filter((r) => r.risk_score === 1).length,
  prohibited: rows.filter((r) => r.prohibited).length,
  unresolvedIsic: rows.filter((r) => r.isic_code === "?").length,
};

console.log("RAKEZ Free Zone import complete:", stats);
console.log(`→ seed/data/rakez_freezone_activities.csv`);
console.log(`→ src/data/rakez_freezone_activities.json`);
console.log(`→ src/data/rakez_lookup_compact.json`);
