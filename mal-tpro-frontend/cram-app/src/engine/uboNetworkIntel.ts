/**
 * UBO network intelligence — open-source / registry links to other companies
 * the beneficial owner controls. Supporting evidence only (no scoring impact).
 * Surfaces online-search hits (adverse media, opacity flags, sanctions mentions).
 */
import type { AdverseResult, ScreenResult } from "./types";

export type OnlineHitKind =
  | "adverse_media"
  | "sanctions_mention"
  | "shell_indicator"
  | "pep_connection"
  | "regulatory_action";

export interface OnlineSearchHit {
  kind: OnlineHitKind;
  summary: string;
  source: string;
  severity: "Low" | "Medium" | "High";
  at?: string;
}

export interface ExternalHolding {
  id: string;
  company: string;
  country: string;
  ownershipPct: number;
  role: string;
  parentOf?: string;
  hits: OnlineSearchHit[];
}

/** Registry keyed by UBO display name (matches corporateStructureGraph personas). */
const UBO_HOLDINGS: Record<string, ExternalHolding[]> = {
  "Ahmed Hassan Al-Mansoori": [
    {
      id: "ext-desert-tech",
      company: "Desert Tech FZE",
      country: "United Arab Emirates",
      ownershipPct: 45,
      role: "Director & shareholder",
      hits: [],
    },
  ],
  "Sarah Chen": [
    {
      id: "ext-pacific-trade",
      company: "Pacific Trade Pte Ltd",
      country: "Singapore",
      ownershipPct: 60,
      role: "Managing director",
      hits: [{
        kind: "adverse_media",
        summary: "2024 cross-border trade dispute — compliance review opened",
        source: "Adverse media OSINT · Reuters archive",
        severity: "Medium",
        at: "2024-11-12",
      }],
    },
    {
      id: "ext-chen-holdings",
      company: "Chen Family Holdings Ltd",
      country: "Hong Kong",
      ownershipPct: 80,
      role: "Beneficial owner",
      parentOf: "ext-pacific-trade",
      hits: [],
    },
  ],
  "Rajesh Mehta": [
    {
      id: "ext-mehta-trading",
      company: "Mehta Global Trading DMCC",
      country: "United Arab Emirates",
      ownershipPct: 55,
      role: "Shareholder",
      hits: [{
        kind: "regulatory_action",
        summary: "DMCC renewal flagged — additional UBO docs requested (resolved)",
        source: "Free-zone registry · OpenCorporates",
        severity: "Low",
        at: "2025-03-01",
      }],
    },
  ],
  "Michael Ali Black": [
    {
      id: "ext-black-capital",
      company: "Black Capital Advisors Ltd",
      country: "Cayman Islands",
      ownershipPct: 100,
      role: "Sole director & UBO",
      parentOf: "ext-mercury-shell",
      hits: [{
        kind: "sanctions_mention",
        summary: "Named in jurisdictional risk intelligence — not a list match",
        source: "Regulatory intelligence feed · Sayed OSINT",
        severity: "High",
        at: "2025-09-18",
      }],
    },
    {
      id: "ext-mercury-shell",
      company: "Mercury Shell Co Ltd",
      country: "British Virgin Islands",
      ownershipPct: 50,
      role: "Controlling shareholder",
      hits: [{
        kind: "shell_indicator",
        summary: "Opacity flag — nominee director pattern, no operating substance",
        source: "Corporate registry OSINT · ICIJ-style link analysis",
        severity: "High",
        at: "2026-01-04",
      }],
    },
  ],
  "Jane Smith": [
    {
      id: "ext-smith-advisory",
      company: "Smith Advisory Partners LLP",
      country: "United Kingdom",
      ownershipPct: 40,
      role: "Partner",
      hits: [],
    },
  ],
  "Emily X Whit": [
    {
      id: "ext-whit-consulting",
      company: "Whit Consulting FZE",
      country: "United Arab Emirates",
      ownershipPct: 100,
      role: "Owner",
      hits: [{
        kind: "pep_connection",
        summary: "Former government adviser — domestic PEP nexus (historical)",
        source: "PEP database cross-reference",
        severity: "Medium",
        at: "2023-06-20",
      }],
    },
  ],
};

export interface UboNetworkContext {
  uboName: string;
  uboNodeId: string;
  holdings: ExternalHolding[];
}

export interface UboNetworkScan {
  enabled: boolean;
  reason: string;
  contexts: UboNetworkContext[];
  totalExternalCompanies: number;
  totalHits: number;
  highSeverityHits: number;
}

function hitFromScreening(
  sanctions: ScreenResult,
  watchlist: string,
  adverse: AdverseResult,
): OnlineSearchHit[] {
  const extra: OnlineSearchHit[] = [];
  if (adverse === "True Match") {
    extra.push({
      kind: "adverse_media",
      summary: "Entity-level adverse media true match — network scan expanded",
      source: "CRAM screening · adverse media",
      severity: "High",
    });
  }
  if (watchlist === "True Match") {
    extra.push({
      kind: "sanctions_mention",
      summary: "Internal watchlist hit — linked entities flagged for review",
      source: "CRAM screening · internal watchlist",
      severity: "High",
    });
  }
  if (sanctions === "True Match") {
    extra.push({
      kind: "sanctions_mention",
      summary: "Sanctions true match — exit all connected structures",
      source: "CRAM screening · sanctions/TFS",
      severity: "High",
    });
  }
  return extra;
}

/** Resolve external holdings for UBO persons; auto-expand when screening hits exist. */
export function scanUboNetwork(args: {
  uboPersons: { id: string; name: string }[];
  ownership: string;
  sanctions: ScreenResult;
  watchlist: "Clear" | "True Match";
  adverse: AdverseResult;
  forceScan?: boolean;
}): UboNetworkScan {
  const screeningHits = hitFromScreening(args.sanctions, args.watchlist, args.adverse);
  const hasScreeningHit = screeningHits.length > 0;
  const complex = args.ownership.includes("complex") || args.ownership.includes("Nominee");
  const enabled = args.forceScan ?? (hasScreeningHit || complex || args.uboPersons.length > 0);

  if (!enabled) {
    return {
      enabled: false,
      reason: "No UBO network scan triggered",
      contexts: [],
      totalExternalCompanies: 0,
      totalHits: 0,
      highSeverityHits: 0,
    };
  }

  const reason = hasScreeningHit
    ? "Screening hit — expanded UBO corporate network search"
    : complex
      ? "Complex / opaque structure — registry & OSINT link analysis"
      : "Standard UBO ownership registry cross-check";

  const contexts: UboNetworkContext[] = [];
  for (const person of args.uboPersons) {
    const holdings = UBO_HOLDINGS[person.name] ?? [];
    if (!holdings.length && !hasScreeningHit) continue;
    const enriched = holdings.map((h) => ({
      ...h,
      hits: [...h.hits, ...(hasScreeningHit ? screeningHits.map((x) => ({ ...x, summary: `${x.summary} (via ${person.name})` })) : [])],
    }));
    contexts.push({ uboName: person.name, uboNodeId: person.id, holdings: enriched });
  }

  const allHits = contexts.flatMap((c) => c.holdings.flatMap((h) => h.hits));
  return {
    enabled: true,
    reason,
    contexts,
    totalExternalCompanies: contexts.reduce((n, c) => n + c.holdings.length, 0),
    totalHits: allHits.length,
    highSeverityHits: allHits.filter((h) => h.severity === "High").length,
  };
}

export function holdingRiskBand(holding: ExternalHolding): "Low" | "Medium" | "High" {
  if (holding.hits.some((h) => h.severity === "High")) return "High";
  if (holding.hits.length > 0) return "Medium";
  return "Low";
}
