/**
 * Entity legal type register — 28 forms aligned with CRAM Suite reference (CBUAE entity Appendix).
 * Score 1–3 feeds customer-type factor; score 4 triggers absolute prohibition.
 */
import type { CustomerLegalForm } from "../engine/activityProfile";
import type { Score } from "../engine/types";
import { clampScore } from "../engine/data";
import raw from "../data/entity_legal_types.json";

export interface EntityLegalType {
  name: string;
  score: number;
  rating: "Low" | "Medium" | "High" | "Prohibited";
  legalForm: CustomerLegalForm;
  rationale: string;
  tag?: string;
  prohibited?: boolean;
  npoFlag?: boolean;
  eddTrigger?: boolean;
}

export const ENTITY_LEGAL_TYPES: EntityLegalType[] = raw as EntityLegalType[];

const BY_NAME = new Map(ENTITY_LEGAL_TYPES.map((e) => [e.name, e]));

export function lookupEntityLegalType(name: string | undefined): EntityLegalType | undefined {
  if (!name?.trim()) return undefined;
  return BY_NAME.get(name.trim());
}

/** Composite customer-type score (1–3). Score 4 prohibited types return 3 for math but trigger OVR separately. */
export function entityTypeScore(label: string | undefined): Score {
  const row = lookupEntityLegalType(label);
  if (!row) return 2;
  return clampScore(Math.min(row.score, 3)) as Score;
}

export function entityTypeProhibited(label: string | undefined): boolean {
  const row = lookupEntityLegalType(label);
  return row?.prohibited === true || row?.score === 4;
}

export function entityTypeNpoFlag(label: string | undefined): boolean {
  return lookupEntityLegalType(label)?.npoFlag === true;
}

export function entityTypeRequiresEdd(label: string | undefined): boolean {
  const row = lookupEntityLegalType(label);
  return !!row?.eddTrigger || !!row?.npoFlag;
}

export function entityTypeToLegalForm(entityType: string): CustomerLegalForm {
  return lookupEntityLegalType(entityType)?.legalForm ?? "legal";
}

export const ENTITY_TYPE_OPTIONS = ENTITY_LEGAL_TYPES.map((e) => e.name);

export const ENTITY_LEGAL_TYPE_GROUPS = [
  { label: "Score 1 — Low inherent legal-form risk", options: ENTITY_LEGAL_TYPES.filter((e) => e.score === 1).map((e) => e.name) },
  { label: "Score 2 — Medium", options: ENTITY_LEGAL_TYPES.filter((e) => e.score === 2).map((e) => e.name) },
  { label: "Score 3 — High (EDD pathway)", options: ENTITY_LEGAL_TYPES.filter((e) => e.score === 3).map((e) => e.name) },
  { label: "Score 4 — Prohibited", options: ENTITY_LEGAL_TYPES.filter((e) => e.score === 4).map((e) => e.name) },
] as const;

export function entityLegalTypeSummary(label: string | undefined) {
  const row = lookupEntityLegalType(label);
  if (!row) return null;
  return {
    name: row.name,
    score: row.score,
    rating: row.rating,
    rationale: row.rationale,
    prohibited: entityTypeProhibited(label),
    npoFlag: row.npoFlag ?? false,
    eddTrigger: entityTypeRequiresEdd(label),
    legalForm: row.legalForm,
    tag: row.tag,
  };
}
