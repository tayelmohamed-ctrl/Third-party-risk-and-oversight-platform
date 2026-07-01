import pack from "../data/ewra_regulatory_pack.json";

export type EwraSection = {
  id: string;
  heading: string;
  body: string;
  bullets?: string[];
  scoringTable?: { rating: string; criteria: string }[];
  matrix?: {
    rows: string[];
    cols: string[];
    cells: number[][];
    legend?: Record<string, string>;
  };
  governance?: string;
};

export type EwraRegulatoryPack = typeof pack;

export const EWRA_REGULATORY_PACK: EwraRegulatoryPack = pack;

export function heatCellColor(row: number, col: number, val: number): string {
  if (row === 0 && col === 0) return "#FF5C77";
  if (row === 0 && col === 1) return "#F6A623";
  if (val >= 20) return "#2FD8A6";
  if (val >= 10) return "#F6A623";
  return "#FF5C77";
}
