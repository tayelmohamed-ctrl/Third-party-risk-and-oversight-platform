import type { Boundary } from "../engine/types";

export interface BandBoundarySet {
  id: Boundary;
  label: string;
  lowMax: number;
  mediumMax: number;
}

// UAE Methodology §3.1 & US Methodology §3.1 — identical threshold table in both docs:
// Low 1.0000–1.5000 · Medium 1.5001–2.1500 · High 2.1501–3.0000
// Override-only tiers (Prohibited/Critical) cannot be reached by weighted score alone.
export const DEFAULT_BAND_BOUNDARIES: Record<Boundary, BandBoundarySet> = {
  calculator: {
    id: "calculator",
    label: "CRAM methodology band set (both perimeters) — Low ≤1.5000, Medium ≤2.1500, High >2.1500",
    lowMax: 1.5,
    mediumMax: 2.15,
  },
  cram: {
    id: "cram",
    label: "CRAM methodology band set (both perimeters) — Low ≤1.5000, Medium ≤2.1500, High >2.1500",
    lowMax: 1.5,
    mediumMax: 2.15,
  },
};

let activeBandBoundaries: Record<Boundary, BandBoundarySet> = { ...DEFAULT_BAND_BOUNDARIES };

export function getBandBoundarySet(boundary: Boundary): BandBoundarySet {
  return activeBandBoundaries[boundary] ?? DEFAULT_BAND_BOUNDARIES[boundary];
}

export function getAllBandBoundaries(): Record<Boundary, BandBoundarySet> {
  return { ...activeBandBoundaries };
}

export function setActiveBandBoundaries(next: Record<Boundary, BandBoundarySet>): void {
  activeBandBoundaries = { ...next };
}

/**
 * A-1 — Precision rule (UAE Methodology §3.1 / US Methodology §3.1, §3.2, §3.3):
 *   "Threshold decisions use the unrounded raw score. Display rounding must never drive the final rating."
 * Chosen interpretation: full-precision `score > 2.1500` is the operative test.
 *   At 4-decimal granularity this is equivalent to ≥ 2.1501 (per the doc's literal boundary table).
 *   At finer precision, a score of 2.15004 is correctly classified as Medium (not High) — which is
 *   stricter than the 4-decimal table alone, and therefore the more conservative choice.
 * Scores must be stored/compared at ≥ 4 decimal places; never round to 2dp before this call.
 */
export function bandFromScore(score: number, boundary: Boundary): "Low" | "Medium" | "High" {
  const set = getBandBoundarySet(boundary);
  if (score <= set.lowMax) return "Low";
  if (score <= set.mediumMax) return "Medium";
  return "High";
}
