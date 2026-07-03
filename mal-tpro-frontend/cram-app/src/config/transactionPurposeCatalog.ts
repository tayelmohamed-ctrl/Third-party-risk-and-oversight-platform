import catalog from "../data/transaction_purpose_code_catalog.json";
import corridorPack from "../data/corridor_ewra_themes.json";
import pkTypology from "../data/pakistan_risk_typology_library.json";

export type PurposeFlowId = "C2C" | "C2B" | "B2C" | "B2B" | "Mal2Mal";

export type PurposeCatalogEntry = {
  purpose_code: string;
  customer_facing_label: string;
  description_shown_to_customer: string;
  acceptable_use_compliance_definition: string;
  not_acceptable_misuse_indicators: string;
  cbuae_pop_mapping_indicative_validate: string;
  risk_tier: string;
  evidence_edd_trigger: string;
  tm_screening_relevance: string;
  sub_flow?: string;
};

export type PurposeFlow = {
  title: string;
  subtitle: string;
  headers: string[];
  entries: PurposeCatalogEntry[];
};

export const TRANSACTION_PURPOSE_CATALOG = catalog as {
  version: string;
  sourceFile: string;
  importedAt?: string;
  readme: string[];
  flows: Record<PurposeFlowId, PurposeFlow>;
};

export const CATALOG_GUIDANCE = {
  documentId: "MAL-TM-PPC-CATALOG-v1.0",
  version: TRANSACTION_PURPOSE_CATALOG.version,
  title: "Transaction Purpose Code Catalog",
  subtitle: "Product & Operations Guide — acceptable use cases, scenarios, corridors, and country typologies",
  documentType: "Operational guidance — Transaction Monitoring & Screening",
  owner: "Head of Compliance / MLRO",
  preparedBy: "Mal FinCrime OS · Product · Compliance · Mohsen (TM)",
  approvalForum: "MLRO · Product · Payment Operations · Compliance Committee",
  confidentiality: "Confidential — internal use only. Validate CBUAE POP mappings before production freeze.",
  effectiveDate: "2026-06-29",
  modelVersion: "CRAM-CBUAE-2026-05-FREEZE-01",
  catalogVersion: "Mal_Transaction_Purpose_Code_Catalog_v1.xlsx",
} as const;

export const FLOW_IDS: PurposeFlowId[] = ["C2C", "C2B", "B2C", "B2B", "Mal2Mal"];

export const FLOW_LABELS: Record<PurposeFlowId, string> = {
  C2C: "Individual → Individual (off-us)",
  C2B: "Individual → Business",
  B2C: "Business → Individual",
  B2B: "Business → Business",
  Mal2Mal: "On-us (Mal → Mal)",
};

export function catalogStats() {
  const byFlow = Object.fromEntries(
    FLOW_IDS.map((id) => [id, TRANSACTION_PURPOSE_CATALOG.flows[id]?.entries.length ?? 0]),
  ) as Record<PurposeFlowId, number>;
  const total = FLOW_IDS.reduce((n, id) => n + byFlow[id], 0);
  const all = allCatalogEntries();
  const byTier = {
    Low: all.filter((e) => e.risk_tier === "Low").length,
    Medium: all.filter((e) => e.risk_tier === "Medium").length,
    High: all.filter((e) => e.risk_tier === "High").length,
    Other: all.filter((e) => !["Low", "Medium", "High"].includes(e.risk_tier)).length,
  };
  return { total, byFlow, byTier };
}

export function allCatalogEntries(): (PurposeCatalogEntry & { flowId: PurposeFlowId })[] {
  return FLOW_IDS.flatMap((flowId) =>
    (TRANSACTION_PURPOSE_CATALOG.flows[flowId]?.entries ?? []).map((e) => ({
      ...e,
      flowId,
      sub_flow: (e as PurposeCatalogEntry).sub_flow,
    })),
  );
}

/** Corridor EWRA themes for annex */
export const CORRIDOR_GUIDANCE = corridorPack.corridorThemes.map((c) => ({
  id: c.id,
  label: c.label,
  origin: c.originCountryCode,
  destination: c.destinationCountryCode,
  inherentRisk: c.inherentRisk,
  status: c.status,
  workflowStage: c.workflowStage,
  corridorScore: c.corridorScore,
  productScope: c.productScope,
  mlTypologies: c.corridorRisks?.mlTypologies ?? [],
  tfTypologies: c.corridorRisks?.tfTypologies ?? [],
  illicitFinance: c.corridorRisks?.illicitFinanceTypologies ?? [],
  islamicSpecific: c.corridorRisks?.islamicSpecific ?? [],
  sanctionsNotes: c.corridorRisks?.sanctionsNotes ?? "",
  oscilarRules: c.oscilarRules ?? [],
  typologyLibraryId: c.typologyLibraryId,
  targetGoLive: c.approval?.targetGoLive,
}));

export const COUNTRY_MODULES = corridorPack.complianceCountryModules.map((m) => ({
  countryCode: m.countryCode,
  countryName: m.countryName,
  fatfStatus: m.fatfStatus,
  craBand: m.craBand,
  ewraOverride: m.ewraBandOverride,
  ewraScore: m.ewraFirmScoreOverride,
  eddMandatory: m.eddMandatory,
  enhancedMonitoring: m.enhancedMonitoring,
  rationale: m.overrideRationale,
  typologyLibraryId: m.typologyLibraryId,
  localReportingNotes: m.localReportingNotes,
}));

/** Full PK typology corpus + corridor-inline typologies for other countries */
export const TYPOLOGY_ANNEX = {
  pakistanCorpus: pkTypology.malTypologyCorpus,
  pakistanRedFlags: pkTypology.redFlags,
  pakistanJurisdictionTypologies: pkTypology.complianceModule.jurisdictionTypologies,
  corridorInlineTypologies: CORRIDOR_GUIDANCE.map((c) => ({
    corridorId: c.id,
    label: c.label,
    typologies: [
      ...c.mlTypologies.map((t) => ({ id: t, category: "ML" as const })),
      ...c.tfTypologies.map((t) => ({ id: t, category: "TF" as const })),
      ...c.illicitFinance.map((t) => ({ id: t, category: "Illicit finance" as const })),
      ...c.islamicSpecific.map((t) => ({ id: t, category: "Islamic-specific" as const })),
    ],
  })),
};

/** Link purpose codes to corridors and typologies for the annex */
export function purposeTypologyLinks(entry: PurposeCatalogEntry & { flowId?: PurposeFlowId }) {
  const text = [
    entry.acceptable_use_compliance_definition,
    entry.not_acceptable_misuse_indicators,
    entry.tm_screening_relevance,
    entry.customer_facing_label,
  ].join(" ").toLowerCase();

  const corridors: string[] = [];
  const typologies: string[] = [];
  const scenarios: string[] = [];

  if (/corridor|remittance|cross-border|fan-in|fan-out|hawala|hundi|ivts|pass-through/.test(text)) {
    corridors.push("COR-AE-PK", "COR-AE-EG", "COR-AE-BD", "COR-AE-PH");
  }
  if (/trade|tbml|invoice|import|export|shipping|goods/.test(text)) {
    corridors.push("COR-AE-PK", "COR-AE-TR", "COR-AE-EG");
    typologies.push("TYP-PK-003", "trade_based_ml");
  }
  if (/hawala|hundi|ivts|informal|fan-out|many-to-one|pass-through/.test(text)) {
    typologies.push("TYP-PK-001", "illegal_mvts_hawala_hundi");
  }
  if (/mule|scam|victim|rapid in-out|salary-mimicry|ghost/.test(text)) {
    typologies.push("TYP-PK-002", "money-muling");
  }
  if (/charit|npo|zakat|waqf|donation/.test(text)) {
    typologies.push("TYP-PK-007", "zakat_misuse", "waqf_charity_abuse", "NGO_charitable_abuse");
    corridors.push("COR-AE-PK", "COR-AE-EG");
  }
  if (/wallet|jazzcash|easypaisa/.test(text)) {
    typologies.push("TYP-PK-014");
    corridors.push("COR-AE-PK");
  }
  if (/service export|intangible|consulting|shell|invoice-cover/.test(text)) {
    typologies.push("TYP-PK-003");
  }
  if (/gambling|pogo|gaming/.test(text)) {
    corridors.push("COR-AE-PH");
  }
  if (/sanction|dual-use|export-control/.test(text)) {
    corridors.push("COR-AE-TR");
  }

  const scenarioMatch = entry.tm_screening_relevance.match(/\(([\d.]+)\)/g);
  if (scenarioMatch) scenarios.push(...scenarioMatch.map((s) => s.replace(/[()]/g, "")));

  if (entry.risk_tier === "High" && corridors.length === 0 && /cross-border|remittance/.test(text)) {
    corridors.push("All active remittance corridors");
  }

  return {
    corridors: [...new Set(corridors)],
    typologies: [...new Set(typologies)],
    scenarios: [...new Set(scenarios)],
  };
}

export const CATALOG_TABLE_OF_CONTENTS = [
  "Document control & catalog metadata",
  "Executive summary for Product & Operations",
  "Developer implementation rules (from catalog README)",
  "Compliance & TM usage rules",
  "Flow overview — C2C · C2B · B2C · B2B · Mal2Mal",
  "Section 1 — C2C purpose codes (Individual → Individual)",
  "Section 2 — C2B purpose codes (Individual → Business)",
  "Section 3 — B2C purpose codes (Business → Individual)",
  "Section 4 — B2B purpose codes (Business → Business)",
  "Section 5 — Mal2Mal purpose codes (on-us transfers)",
  "Section 6 — Corridor EWRA guidance",
  "Appendix A — Country risk typologies by corridor",
  "Appendix B — Purpose code ↔ typology ↔ corridor linkage matrix",
  "MLRO / Product sign-off",
] as const;
