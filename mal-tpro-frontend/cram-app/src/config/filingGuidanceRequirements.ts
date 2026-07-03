/**
 * STR/SAR draft requirements mapped from:
 * - CBUAE Notice 3354/2022 (Guidance for LFIs on Suspicious Transaction Reporting)
 * - Supervisory Authority Thematic Review — STR Framework (Jan 2023)
 * - FFIEC BSA/AML Examination Manual — Appendix L: SAR Quality Guidance
 * - FinCEN SAR Electronic Filing Instructions (Form 111 / Part IV narrative)
 */

export type GuidanceSource =
  | "CBUAE-3354"
  | "CBUAE-THEMATIC-2023"
  | "FFIEC-APP-L"
  | "FINCEN-SAR";

export interface DraftRequirement {
  id: string;
  label: string;
  sectionIds: string[];
  sources: GuidanceSource[];
  fiu: "UAE" | "US" | "both";
  reportTypes?: ("STR" | "SAR" | "SAR_US")[];
  required: boolean;
}

/** Maps editor section IDs to regulatory expectations */
export const FILING_DRAFT_REQUIREMENTS: DraftRequirement[] = [
  {
    id: "goaml-cover",
    label: "goAML Report Cover complete (summary, RFR, action taken, location)",
    sectionIds: ["summaryOneLine", "rfrCodes", "actionTaken", "incidentLocation", "reportingBranch"],
    sources: ["CBUAE-3354"],
    fiu: "UAE",
    required: true,
  },
  {
    id: "intro-structure",
    label: "Introduction: purpose, subjects, red flags, prior reports, sanctions nexus",
    sectionIds: ["introduction", "redFlagsSummary", "priorReports", "sanctionsGeoFlag"],
    sources: ["CBUAE-3354", "CBUAE-THEMATIC-2023"],
    fiu: "both",
    required: true,
  },
  {
    id: "who-complete",
    label: "WHO: subject IDs, occupation, addresses, UBO/directors, party relationships",
    sectionIds: ["whoNarrative", "uboDirectors", "partyRelationships", "identificationNumbers"],
    sources: ["CBUAE-3354", "FFIEC-APP-L"],
    fiu: "both",
    required: true,
  },
  {
    id: "what-instruments",
    label: "WHAT: instruments/mechanisms, products, delivery channels",
    sectionIds: ["whatInstruments"],
    sources: ["CBUAE-3354", "FFIEC-APP-L"],
    fiu: "both",
    required: true,
  },
  {
    id: "when-chronological",
    label: "WHEN: first observed, duration, chronological txn dates (not aggregates only)",
    sectionIds: ["whenTimeline", "firstObservedDate", "reviewPeriod"],
    sources: ["CBUAE-3354", "CBUAE-THEMATIC-2023", "FFIEC-APP-L"],
    fiu: "both",
    reportTypes: ["STR", "SAR_US"],
    required: true,
  },
  {
    id: "where-jurisdictions",
    label: "WHERE: branches, foreign jurisdictions, full transaction chain",
    sectionIds: ["whereNarrative", "foreignJurisdictions"],
    sources: ["CBUAE-3354", "FFIEC-APP-L"],
    fiu: "both",
    required: true,
  },
  {
    id: "why-customer-context",
    label: "WHY: unusual vs expected for this customer — not defensive filing",
    sectionIds: ["whySuspicious", "expectedVsObserved", "tmRuleTriggered"],
    sources: ["CBUAE-3354", "CBUAE-THEMATIC-2023", "FFIEC-APP-L"],
    fiu: "both",
    required: true,
  },
  {
    id: "how-modus",
    label: "HOW: modus operandi with dates, amounts, destinations, beneficiaries",
    sectionIds: ["howModusOperandi"],
    sources: ["CBUAE-3354", "FFIEC-APP-L"],
    fiu: "both",
    required: true,
  },
  {
    id: "txn-schedule",
    label: "Transaction schedule: specific dates, amounts, counterparties, banks, accounts",
    sectionIds: ["transactionTable", "counterpartyAnalysis"],
    sources: ["CBUAE-3354", "CBUAE-THEMATIC-2023"],
    fiu: "both",
    reportTypes: ["STR"],
    required: true,
  },
  {
    id: "sof-sod",
    label: "Source and destination of funds documented",
    sectionIds: ["sowSof", "fundsOrigin", "fundsDestination"],
    sources: ["CBUAE-3354", "FFIEC-APP-L"],
    fiu: "both",
    required: true,
  },
  {
    id: "screening-counterparty",
    label: "Sanctions/PEP/adverse media on subject and counterparties (Thematic Review §2.5)",
    sectionIds: ["screeningResults", "counterpartyScreening"],
    sources: ["CBUAE-THEMATIC-2023"],
    fiu: "both",
    required: true,
  },
  {
    id: "conclusion-actions",
    label: "Conclusion / action taken: mitigating steps, follow-up, law enforcement contacts",
    sectionIds: ["conclusionActions", "actionTaken"],
    sources: ["CBUAE-3354"],
    fiu: "both",
    required: true,
  },
  {
    id: "sla-timelines",
    label: "SLA documented (35 business days / 24h expedited / complex 15+30)",
    sectionIds: ["slaTiming", "alertGeneratedDate", "businessDaysJustification"],
    sources: ["CBUAE-3354", "CBUAE-THEMATIC-2023"],
    fiu: "UAE",
    required: true,
  },
  {
    id: "post-str",
    label: "Post-STR/SAR: related accounts, high-risk reclass, EDD, watchlist, retain/exit rationale",
    sectionIds: ["postStrActions", "relatedAccountsReview", "retainExitRationale"],
    sources: ["CBUAE-3354", "CBUAE-THEMATIC-2023"],
    fiu: "both",
    required: true,
  },
  {
    id: "no-tipping-off",
    label: "No tipping-off confirmation",
    sectionIds: ["noTippingOff"],
    sources: ["CBUAE-3354"],
    fiu: "both",
    required: true,
  },
  {
    id: "fincen-part-iv",
    label: "FinCEN Part IV narrative: activity types, complete Who/What/When/Where/Why/How",
    sectionIds: ["fincenActivityTypes", "whySuspicious", "howModusOperandi", "supportingDocsPartV"],
    sources: ["FFIEC-APP-L", "FINCEN-SAR"],
    fiu: "US",
    reportTypes: ["SAR_US"],
    required: true,
  },
  {
    id: "mlro-signoff",
    label: "MLRO/BSA Officer details match registration; maker-checker complete",
    sectionIds: ["mlroName", "mlroEmail", "checkerName", "mlroDeclaration"],
    sources: ["CBUAE-3354", "FFIEC-APP-L"],
    fiu: "both",
    required: true,
  },
];

export const GUIDANCE_FOOTNOTES: Record<GuidanceSource, string> = {
  "CBUAE-3354": "CBUAE Notice 3354/2022 · Guidance for LFIs on Suspicious Transaction Reporting",
  "CBUAE-THEMATIC-2023": "Supervisory Authority Thematic Review — STR Framework (Jan 2023)",
  "FFIEC-APP-L": "FFIEC BSA/AML Examination Manual · Appendix L: SAR Quality Guidance",
  "FINCEN-SAR": "FinCEN SAR Form 111 · Electronic Filing Instructions · Part IV narrative",
};

const PLACEHOLDER_RE = /^(TBD|—|-|Pending|\s*$)/i;

export function sectionValueOk(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  const v = value.trim();
  if (PLACEHOLDER_RE.test(v)) return false;
  if (v.toLowerCase().startsWith("tbd —")) return false;
  if (v.length < 8 && !/^\d/.test(v)) return false;
  return true;
}

export function evaluateDraftCompliance(input: {
  sections: { id: string; value: string }[];
  reportType: string;
  fiuId: "UAE" | "US";
  defensiveFilingDenied?: boolean;
}): {
  score: number;
  total: number;
  items: { id: string; label: string; pass: boolean; sources: GuidanceSource[] }[];
  blockers: string[];
} {
  if (input.reportType === "CTR_US") {
    return { score: 0, total: 0, items: [], blockers: ["Use CTR compliance panel for Form 104 drafts"] };
  }
  const sectionMap = Object.fromEntries(input.sections.map((s) => [s.id, s.value]));
  const applicable = FILING_DRAFT_REQUIREMENTS.filter((r) => {
    if (r.fiu === "UAE" && input.fiuId === "US") return false;
    if (r.fiu === "US" && input.fiuId === "UAE") return false;
    if (r.reportTypes && !r.reportTypes.includes(input.reportType as "STR" | "SAR" | "SAR_US")) return false;
    return true;
  });

  const items = applicable.map((r) => {
    const pass = r.sectionIds.every((id) => sectionValueOk(sectionMap[id]));
    return { id: r.id, label: r.label, pass, sources: r.sources };
  });

  const requiredItems = applicable.filter((r) => r.required);
  const requiredPass = requiredItems.filter((r) =>
    r.sectionIds.every((id) => sectionValueOk(sectionMap[id])),
  ).length;

  const blockers: string[] = [];
  if (input.defensiveFilingDenied === false) {
    blockers.push("Confirm this is not a defensive filing (CBUAE §3.3.1)");
  }
  for (const r of requiredItems) {
    if (!r.sectionIds.every((id) => sectionValueOk(sectionMap[id]))) {
      blockers.push(r.label);
    }
  }

  return {
    score: requiredPass,
    total: requiredItems.length,
    items,
    blockers,
  };
}

/** Annex 1 anti-patterns — draft must NOT resemble these */
export const ANNEX1_ANTI_PATTERNS = [
  "Missing subject identifying details (name, occupation, address, account numbers)",
  "Aggregated amounts only — no specific transaction dates and amounts",
  "Missing counterparty names, banks, account numbers, jurisdictions",
  "No explanation of why activity is suspicious for this customer",
  "No relationship between parties explained",
  "Generic alert closure language without discounting red flags",
  "Defensive filing without genuine suspicion",
] as const;
