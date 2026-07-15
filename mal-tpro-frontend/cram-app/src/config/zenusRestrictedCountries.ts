/**
 * Zenus Restricted Country Codes — Global Account (US perimeter) country classes.
 * Source: Mal-CRAM-US-01 v1.0 (model CRAM-US-2026-07-FREEZE-03) §7.1–7.2,
 * reconciled with OFAC status and the Mal CRAM jurisdiction tiers under the
 * most-restrictive-standard rule. Zenus list last updated 04/15/2026.
 *
 * Two override classes carry a country-level floor on the US (`global_account`)
 * perimeter only:
 *   - PROHIBITED (§7.1) — absolute: OFAC comprehensive/region embargo (Iran, Cuba,
 *     Syria, North Korea, Crimea/Donetsk/Luhansk/Kherson/Zaporizhzhia) plus the
 *     Mal/Zenus USD-rail absolute prohibitions (Russia, Belarus, Myanmar). Any
 *     residence/SoF/SoW/corridor/IP nexus blocks the relationship (firm floor 4).
 *   - RESTRICTED (§7.2) — non-OFAC restricted-conditional class: residence or an
 *     active corridor to/from these is blocked; a non-OFAC source-of-wealth/funds
 *     origin is workable only under the §7.4 documentation/residency-tenure rule.
 *     Modelled here as a High geography floor (firm floor 3); the §7.4 EDD
 *     documentation exception remains a manual senior-compliance workflow.
 *
 * The country-of-birth carve-out (§7.3–7.4) is a screening/EDD flag, not a scoring
 * input, and is therefore not applied as a firm floor here.
 */
import { normalizeCountryName } from "./sanctionsCountryRegistry";

export type ZenusCountryClass = "prohibited" | "restricted";

export const ZENUS_LIST_LAST_UPDATE = "2026-04-15";

/** §7.1 absolute-prohibited + §7.2 prohibited class (platform-canonical names). */
export const ZENUS_PROHIBITED_COUNTRIES: string[] = [
  "Iran",
  "Cuba",
  "Syria",
  "North Korea",
  "Russia",
  "Belarus",
  "Myanmar",
];

/** §7.2 non-OFAC restricted-conditional class (platform-canonical names). */
export const ZENUS_RESTRICTED_COUNTRIES: string[] = [
  "Afghanistan",
  "Sudan",
  "Central African Republic",
  "Democratic Republic of the Congo",
  "Iraq",
  "Cote D'ivoire",
  "Kazakhstan",
  "Kosovo",
  "Kyrgyzstan",
  "Lebanon",
  "Libya",
  "Mali",
  "Nicaragua",
  "Puerto Rico",
  "Somalia",
  "South Sudan",
  "Tajikistan",
  "Turkmenistan",
  "Ukraine",
  "Uzbekistan",
  "Venezuela",
  "Yemen",
  "Zimbabwe",
  "Burundi",
];

/** Common CRAM/Zenus labels → platform-canonical names for matching. */
const ZENUS_NAME_ALIASES: Record<string, string> = {
  "ivory coast": "Cote D'ivoire",
  "dem. rep. of the congo": "Democratic Republic of the Congo",
  "dr congo": "Democratic Republic of the Congo",
  "darfur": "Sudan",
};

function zkey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const classByKey = new Map<string, ZenusCountryClass>();
for (const c of ZENUS_RESTRICTED_COUNTRIES) classByKey.set(zkey(c), "restricted");
// Prohibited takes precedence — set last so it overrides any overlap.
for (const c of ZENUS_PROHIBITED_COUNTRIES) classByKey.set(zkey(c), "prohibited");
for (const [alias, canonical] of Object.entries(ZENUS_NAME_ALIASES)) {
  const cls = classByKey.get(zkey(canonical));
  if (cls) classByKey.set(zkey(alias), cls);
}

/** Zenus classification for a country on the US perimeter, or undefined if permitted. */
export function zenusCountryClass(name: string): ZenusCountryClass | undefined {
  if (!name) return undefined;
  const direct = classByKey.get(zkey(name));
  if (direct) return direct;
  return classByKey.get(zkey(normalizeCountryName(name)));
}

/** Firm-score floor applied on the US perimeter for a Zenus-classed country. */
export function zenusCountryFirmFloor(name: string): number {
  const cls = zenusCountryClass(name);
  if (cls === "prohibited") return 4;
  if (cls === "restricted") return 3;
  return 0;
}
