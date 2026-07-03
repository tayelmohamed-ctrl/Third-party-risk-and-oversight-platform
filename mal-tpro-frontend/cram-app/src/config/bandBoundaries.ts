import type { Boundary } from "../engine/types";

export interface BandBoundarySet {
  id: Boundary;
  label: string;
  lowMax: number;
  mediumMax: number;
}

export const DEFAULT_BAND_BOUNDARIES: Record<Boundary, BandBoundarySet> = {
  calculator: {
    id: "calculator",
    label: "Calculator (>2.15 bank-wide default)",
    lowMax: 1.5,
    mediumMax: 2.15,
  },
  cram: {
    id: "cram",
    label: "CRAM set (documented sensitivity)",
    lowMax: 1.0,
    mediumMax: 2.0,
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

export function bandFromScore(score: number, boundary: Boundary): "Low" | "Medium" | "High" {
  const set = getBandBoundarySet(boundary);
  if (score <= set.lowMax) return "Low";
  if (score <= set.mediumMax) return "Medium";
  return "High";
}
