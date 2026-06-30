/**
 * Dropdown / register options — sourced from seed libraries (docs/06).
 * Keeps UI lists in sync with isic_activity_lookup, isic_profession_guidance, isic_risk_themes.
 */
import isicLookup from "../data/isic_activity_lookup.json";
import professionGuidance from "../data/isic_profession_guidance.json";
import riskThemes from "../data/isic_risk_themes.json";
import { NATURE_OF_BUSINESS, PROFESSIONS } from "../engine/data";
import {
  isProfessionCompatibleWithEmployment,
  suggestedActivitiesForProfession,
} from "../engine/professionRiskIntelligence";

export { isProfessionCompatibleWithEmployment, suggestedActivitiesForProfession };

export const TYPOLOGY_OPTIONS = (isicLookup as { activity: string }[]).map((r) => r.activity);

export const PROFESSION_GUIDANCE_OPTIONS = (
  professionGuidance as { profession_customer_profile: string }[]
).map((r) => r.profession_customer_profile);

export const RISK_THEME_OPTIONS = (
  riskThemes as { risk_theme_activity_cluster: string }[]
).map((r) => r.risk_theme_activity_cluster);

export const NATURE_OF_BUSINESS_OPTIONS = [...NATURE_OF_BUSINESS]
  .sort((a, b) => a.activity.localeCompare(b.activity))
  .map((a) => a.activity);

export const PROFESSION_CSV_OPTIONS = [...PROFESSIONS]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((p) => p.name);

/** Activity dropdown — all 6 typologies + 169 NOB + 12 theme clusters (187 selectable). */
export const ACTIVITY_DROPDOWN_GROUPS = [
  { label: `High-risk typologies (ISIC shortcuts · ${TYPOLOGY_OPTIONS.length})`, options: TYPOLOGY_OPTIONS },
  { label: `Nature of business register (${NATURE_OF_BUSINESS_OPTIONS.length})`, options: NATURE_OF_BUSINESS_OPTIONS },
  { label: `Risk theme clusters (${RISK_THEME_OPTIONS.length})`, options: RISK_THEME_OPTIONS },
] as const;

/** Profession dropdown — 16 AML guidance profiles + 736 profession.csv entries. */
export const PROFESSION_DROPDOWN_GROUPS = [
  { label: `AML profession guidance (${PROFESSION_GUIDANCE_OPTIONS.length} profiles)`, options: PROFESSION_GUIDANCE_OPTIONS },
  { label: `Profession register (${PROFESSION_CSV_OPTIONS.length})`, options: PROFESSION_CSV_OPTIONS },
] as const;

export const LIBRARY_COUNTS = {
  typologies: TYPOLOGY_OPTIONS.length,
  professionGuidance: PROFESSION_GUIDANCE_OPTIONS.length,
  riskThemes: RISK_THEME_OPTIONS.length,
    natureOfBusiness: NATURE_OF_BUSINESS_OPTIONS.length,
    professions: PROFESSION_CSV_OPTIONS.length,
    entityLegalTypes: 28,
  } as const;

/** Filter profession dropdown groups by employment status (1=salaried … 3=atypical). */
export function professionGroupsForEmployment(employmentScore: number) {
  return PROFESSION_DROPDOWN_GROUPS.map((g) => ({
    label: g.label,
    options: g.options.filter((p) => isProfessionCompatibleWithEmployment(p, employmentScore)),
  })).filter((g) => g.options.length > 0);
}
