/**
 * Searchable activity index for Activity Register — RAKEZ (UAE FZ) + ISIC libraries.
 */
import { ISIC, NATURE_OF_BUSINESS } from "../engine/data";
import { RAKEZ_ACTIVITIES, type RakezActivityEntry } from "../engine/rakezActivityRegister";
import isicLookup from "../data/isic_activity_lookup.json";
import riskThemes from "../data/isic_risk_themes.json";
import type { CompliancePerimeter } from "../config/perimeters";

export type ActivitySource = "rakez" | "typology" | "nob" | "isic_class" | "theme";

export interface ActivityRegisterOption {
  id: string;
  label: string;
  subtitle: string;
  searchText: string;
  source: ActivitySource;
  group: string;
  rakezCode?: string;
  isicCode?: string;
  /** Which account perimeter this entry is primary for */
  perimeters: CompliancePerimeter[];
}

function rakezOption(row: RakezActivityEntry): ActivityRegisterOption {
  const label = row.activity_name;
  return {
    id: `rakez:${row.rakez_code}`,
    label,
    subtitle: `${row.rakez_code} · ${row.licence_type} · ISIC ${row.isic_code}`,
    searchText: `${row.rakez_code} ${label} ${row.activity_group} ${row.description} ${row.isic_code} ${row.isic_title}`.toLowerCase(),
    source: "rakez",
    group: row.activity_group || row.licence_type,
    rakezCode: row.rakez_code,
    isicCode: row.isic_code !== "?" ? row.isic_code : undefined,
    perimeters: ["mal_bank"],
  };
}

function buildIndex(): ActivityRegisterOption[] {
  const out: ActivityRegisterOption[] = [];
  const seen = new Set<string>();

  for (const row of RAKEZ_ACTIVITIES) {
    out.push(rakezOption(row));
    seen.add(row.activity_name.toLowerCase());
  }

  for (const row of isicLookup as { activity: string; primary_isic: string; primary_isic_title: string }[]) {
    out.push({
      id: `typology:${row.activity}`,
      label: row.activity,
      subtitle: `High-risk typology · ISIC ${row.primary_isic}`,
      searchText: `${row.activity} ${row.primary_isic} ${row.primary_isic_title} typology`.toLowerCase(),
      source: "typology",
      group: "High-risk typologies",
      isicCode: row.primary_isic,
      perimeters: ["global_account", "mal_bank"],
    });
  }

  for (const row of NATURE_OF_BUSINESS) {
    if (seen.has(row.activity.toLowerCase())) continue;
    out.push({
      id: `nob:${row.activity}`,
      label: row.activity,
      subtitle: `Nature of business · score ${row.score}/4`,
      searchText: `${row.activity} nature of business`.toLowerCase(),
      source: "nob",
      group: "Nature of business",
      perimeters: ["global_account", "mal_bank"],
    });
  }

  for (const row of ISIC.filter((i) => i.level === "Class" && i.score >= 2)) {
    out.push({
      id: `isic:${row.code}`,
      label: row.title,
      subtitle: `ISIC ${row.code} · ${row.rating} (${row.score}/3)`,
      searchText: `${row.code} ${row.title} ${row.theme} isic`.toLowerCase(),
      source: "isic_class",
      group: "ISIC Rev.5 classes",
      isicCode: row.code,
      perimeters: ["global_account", "mal_bank"],
    });
  }

  for (const row of riskThemes as { risk_theme_activity_cluster: string; indicative_aml_risk: string }[]) {
    out.push({
      id: `theme:${row.risk_theme_activity_cluster}`,
      label: row.risk_theme_activity_cluster,
      subtitle: `Risk theme · ${row.indicative_aml_risk}`,
      searchText: `${row.risk_theme_activity_cluster} theme cluster`.toLowerCase(),
      source: "theme",
      group: "Risk theme clusters",
      perimeters: ["global_account", "mal_bank"],
    });
  }

  return out;
}

let _index: ActivityRegisterOption[] | null = null;

function getIndex(): ActivityRegisterOption[] {
  if (!_index) _index = buildIndex();
  return _index;
}

export const ACTIVITY_REGISTER_INDEX: ActivityRegisterOption[] = [];

export function activitiesForPerimeter(perimeter: CompliancePerimeter): ActivityRegisterOption[] {
  const idx = getIndex();
  if (perimeter === "global_account") {
    return idx.filter((a) => a.source !== "rakez");
  }
  return idx;
}

export function searchActivities(
  query: string,
  perimeter: CompliancePerimeter,
  limit = 12,
): ActivityRegisterOption[] {
  const pool = activitiesForPerimeter(perimeter);
  const q = query.trim().toLowerCase();
  if (!q) {
    return pool.slice(0, limit);
  }

  const scored = pool
    .map((item) => {
      let score = 0;
      const label = item.label.toLowerCase();
      if (label === q) score += 100;
      else if (label.startsWith(q)) score += 60;
      else if (label.includes(q)) score += 40;
      if (item.searchText.includes(q)) score += 20;
      if (item.rakezCode?.toLowerCase().includes(q)) score += 50;
      if (item.isicCode === q) score += 45;
      return { item, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label));

  return scored.slice(0, limit).map((x) => x.item);
}

export function getActivityById(id: string): ActivityRegisterOption | undefined {
  return getIndex().find((a) => a.id === id);
}
