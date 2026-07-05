import type { CompliancePerimeter, CorridorFilter } from "../config/perimeters";
import type { CorridorRiskEntry } from "../engine/rbm/types";

export function corridorFilterToRegistryId(
  perimeter: CompliancePerimeter,
  corridor: CorridorFilter,
): string {
  if (perimeter === "mal_bank") return "uae_uae";
  switch (corridor) {
    case "PK": return "uae_pk";
    case "US": return "us_global";
    case "UAE": return "uae_uae";
    case "DE":
    case "EG":
    case "BD": return "uae_high_risk";
    default: return "us_global";
  }
}

export function corridorLabel(entry: CorridorRiskEntry): string {
  return `${entry.origin} → ${entry.destination} · ${entry.finalScore}/100 (${entry.finalBand})`;
}
