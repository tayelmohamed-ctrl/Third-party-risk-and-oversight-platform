/**
 * Geography risk floors from consolidated sanctions list alignment:
 * UN Security Council · US OFAC · UAE Executive Office TFS / local list.
 *
 * Floors apply at lookup — firm_score in country library is the base;
 * sanctions nexus never scores below the list-mandated floor.
 */
export type SanctionsListSource = "UN" | "US_OFAC" | "UAE_TFS";

export interface SanctionsCountryFloor {
  /** Minimum firm score (3 = High geography, 4 = Prohibited nexus) */
  firmFloor: number;
  sources: SanctionsListSource[];
  /** Mal sanctions programme category where applicable */
  category?: "A" | "B" | "C";
  rationale: string;
  /** Country names as stored in countries.json / country_risk.csv */
  countries: string[];
}

/** Alias → canonical country name in the library */
export const COUNTRY_NAME_ALIASES: Record<string, string> = {
  "iran, islamic republic of": "Iran",
  "korea, democratic people’s republic of": "North Korea",
  "syrian arab republic": "Syria",
  "russian federation": "Russia",
  "côte d’ivoire": "Cote D’ivoire",
  "cote d’ivoire": "Cote D’ivoire",
  "democratic republic of the congo": "Democratic Republic of the Congo",
  "dr congo": "Democratic Republic of the Congo",
  "congo, dem. rep.": "Democratic Republic of the Congo",
  // Short-form aliases for common country names
  "united states": "United States of America",
  "usa": "United States of America",
  "uk": "United Kingdom and Channel Islands",
  "united kingdom": "United Kingdom and Channel Islands",
  "gb": "United Kingdom and Channel Islands",
};

export const SANCTIONS_COUNTRY_FLOORS: SanctionsCountryFloor[] = [
  {
    firmFloor: 4,
    category: "A",
    sources: ["UN", "US_OFAC", "UAE_TFS"],
    rationale: "Comprehensive UN/US/UAE embargo — no new relationships (Category A)",
    countries: ["Iran", "North Korea", "Syria"],
  },
  {
    firmFloor: 3,
    category: "B",
    sources: ["US_OFAC", "UN", "UAE_TFS"],
    rationale: "Comprehensive or country-wide OFAC programme — High geography floor (Category B)",
    countries: ["Cuba", "Russia", "Sudan", "Yemen", "Venezuela"],
  },
  {
    firmFloor: 3,
    category: "C",
    sources: ["UN", "US_OFAC", "UAE_TFS"],
    rationale: "Targeted financial sanctions / repressive-regime programme — High geography floor (Category C)",
    countries: [
      "Afghanistan",
      "Belarus",
      "Central African Republic",
      "Cote D'ivoire",
      "Democratic Republic of the Congo",
      "Eritrea",
      "Guinea-Bissau",
      "Iraq",
      "Lebanon",
      "Liberia",
      "Libya",
      "Myanmar",
      "Somalia",
      "Zimbabwe",
    ],
  },
  {
    firmFloor: 3,
    sources: ["US_OFAC", "UN"],
    rationale: "OFAC / UN sectoral or heightened country programme",
    countries: ["Nicaragua", "South Sudan"],
  },
];

const floorByCountry = new Map<string, SanctionsCountryFloor>();

function countryKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

for (const entry of SANCTIONS_COUNTRY_FLOORS) {
  for (const c of entry.countries) {
    const key = countryKey(c);
    const prev = floorByCountry.get(key);
    if (!prev || entry.firmFloor > prev.firmFloor) {
      floorByCountry.set(key, entry);
    }
  }
}

for (const [alias, canonical] of Object.entries(COUNTRY_NAME_ALIASES)) {
  const floor = floorByCountry.get(countryKey(canonical));
  if (floor) floorByCountry.set(countryKey(alias), floor);
}

export function normalizeCountryName(name: string): string {
  if (!name) return name;
  return COUNTRY_NAME_ALIASES[countryKey(name)] ?? name;
}

export function sanctionsFloorForCountry(name: string): SanctionsCountryFloor | undefined {
  if (!name) return undefined;
  const key = countryKey(name);
  const direct = floorByCountry.get(key);
  if (direct) return direct;
  const canonical = normalizeCountryName(name);
  return floorByCountry.get(countryKey(canonical));
}

export function applySanctionsCountryFloor(countryName: string, baseFirm: number): number {
  const floor = sanctionsFloorForCountry(countryName);
  if (!floor) return baseFirm;
  return Math.max(baseFirm, floor.firmFloor);
}

export function firmScoreToBand(firm: number): string {
  if (firm >= 4) return "Prohibited";
  if (firm > 2.15) return "High";
  if (firm > 1.5) return "Medium";
  return "Low";
}

export function sanctionsSourcesLabel(name: string): string | undefined {
  const floor = sanctionsFloorForCountry(name);
  if (!floor) return undefined;
  return floor.sources.join(" · ");
}
