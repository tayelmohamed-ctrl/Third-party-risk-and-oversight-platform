/**
 * Global Account (US MSB/BaaS) corridor set for the Execution Dashboard corridor
 * typology board. These are the corridors the coach watches and into which the
 * team uploads new risk typologies (collected from Slack) on a weekly basis.
 *
 * This is the board's own corridor list — deliberately independent of the global
 * `CorridorFilter` perimeter dropdown (config/perimeters.ts), so extending the
 * watch-list here does not ripple into RBM/registry filtering.
 */

export interface GlobalAccountCorridor {
  code: string;   // display + storage key (e.g. "PK")
  name: string;   // full country name
  flag: string;   // emoji flag
  region: string; // short grouping label
}

export const GLOBAL_ACCOUNT_CORRIDORS: GlobalAccountCorridor[] = [
  { code: "PK", name: "Pakistan", flag: "🇵🇰", region: "South Asia" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩", region: "South Asia" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", region: "Southeast Asia" },
  { code: "PH", name: "Philippines", flag: "🇵🇭", region: "Southeast Asia" },
  { code: "EG", name: "Egypt", flag: "🇪🇬", region: "MENA" },
  { code: "UAE", name: "United Arab Emirates", flag: "🇦🇪", region: "GCC" },
  { code: "TR", name: "Turkey", flag: "🇹🇷", region: "MENA / Europe" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", region: "GCC" },
  { code: "JO", name: "Jordan", flag: "🇯🇴", region: "MENA" },
];

export const CORRIDOR_BY_CODE: Record<string, GlobalAccountCorridor> = Object.fromEntries(
  GLOBAL_ACCOUNT_CORRIDORS.map((c) => [c.code, c]),
);

export function corridorLabel(code: string): string {
  const c = CORRIDOR_BY_CODE[code];
  return c ? `${c.flag} ${c.name} (${c.code})` : code;
}

/** Typology taxonomy shared by the upload form and the TM investigator guide. */
export const TYPOLOGY_CATEGORIES = ["ML", "TF", "TBML", "Cyber", "PEP", "Sanctions", "Fraud", "Other"] as const;
export type TypologyCategory = (typeof TYPOLOGY_CATEGORIES)[number];

export const TYPOLOGY_SEVERITIES = ["Critical", "High", "Medium", "Low"] as const;
export type TypologySeverity = (typeof TYPOLOGY_SEVERITIES)[number];
