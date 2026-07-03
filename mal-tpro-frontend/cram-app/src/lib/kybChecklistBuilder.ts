import {
  entityTypeToKybCategory,
  KYB_CORE_MATRIX,
  KYB_ENTITY_MATRIX,
  KYB_PRODUCT_LABELS,
  MAL_KYB_GUIDELINES,
  type KybEntityCategory,
  type KybProduct,
  type KybReqLevel,
} from "../config/kybDocumentMatrix";
import { entityTypeProhibited, lookupEntityLegalType } from "../config/entityLegalTypes";

export type KybChecklistStatus = "pending" | "collected" | "waived" | "not_applicable";

export interface KybChecklistItem {
  id: string;
  section: string;
  document: string;
  level: KybReqLevel;
  effectiveLevel: "mandatory" | "conditional";
  status: KybChecklistStatus;
  cramNote: string;
  policyRef: string;
  products: KybProduct[];
}

export interface KybChecklistPackage {
  caseRef: string;
  customerName: string;
  customerId: string;
  entityType: string;
  entityCategory: KybEntityCategory;
  segment: string;
  products: KybProduct[];
  cramRating: string;
  inherentScore: number;
  residualScore: number;
  ddLevel: string;
  reviewMonths: number;
  eddRequired: boolean;
  generatedAt: string;
  prohibited: boolean;
  prohibitedReason?: string;
  coreItems: KybChecklistItem[];
  entityItems: KybChecklistItem[];
  escalations: string[];
  guidelines: typeof MAL_KYB_GUIDELINES;
}

export interface KybCaseContext {
  caseRef: string;
  customerName: string;
  customerId: string;
  entityType: string;
  segment: string;
  products: KybProduct[];
  cramRating: string;
  inherentScore: number;
  residualScore: number;
  ddLevel: string;
  reviewMonths: number;
  eddRequired: boolean;
  /** Foreign | Domestic | IO | None — drives Art. 15 identification vs enhanced checklist */
  pepStatus?: "None" | "Domestic" | "Foreign" | "IO";
  uboLayers?: number;
  hasFinancingFacility?: boolean;
  generatedAt?: string;
}

function levelForProduct(row: { uaeIban: KybReqLevel; globalAccount: KybReqLevel; financing: KybReqLevel }, product: KybProduct): KybReqLevel {
  if (product === "uae_iban") return row.uaeIban;
  if (product === "global_account") return row.globalAccount;
  return row.financing;
}

function maxLevel(a: KybReqLevel, b: KybReqLevel): KybReqLevel {
  const rank: Record<KybReqLevel, number> = { mandatory: 3, conditional: 2, not_required: 1 };
  return rank[a] >= rank[b] ? a : b;
}

function combineProductLevel(
  row: { uaeIban: KybReqLevel; globalAccount: KybReqLevel; financing: KybReqLevel },
  products: KybProduct[],
): KybReqLevel {
  return products.reduce<KybReqLevel>(
    (acc, p) => maxLevel(acc, levelForProduct(row, p)),
    "not_required",
  );
}

function cramEscalationNote(
  rowId: string,
  ctx: KybCaseContext,
  baseLevel: KybReqLevel,
): { level: KybReqLevel; note: string } {
  let level = baseLevel;
  const notes: string[] = [];

  if (ctx.cramRating === "High" || ctx.eddRequired) {
    if (rowId === "sow") {
      level = maxLevel(level, "mandatory");
      notes.push("EDD required — source of wealth mandatory");
    }
    if (rowId === "structure") {
      level = maxLevel(level, "mandatory");
      notes.push("High/EDD — ownership chart to natural-person UBO");
    }
    if (rowId === "bank-stmt") {
      level = maxLevel(level, "mandatory");
      notes.push("EDD — 12-month bank statements");
    }
  }

  if (ctx.products.includes("financing") || ctx.hasFinancingFacility) {
    if (rowId === "audited") {
      level = "mandatory";
      notes.push("Financing product — audited FS last 2 years");
    }
    if (rowId === "resolution") {
      level = maxLevel(level, "mandatory");
      notes.push("Facility mandate / board resolution");
    }
  }

  if (ctx.products.includes("global_account")) {
    if (rowId === "w8" || rowId === "us-tin") level = "mandatory";
    if (rowId === "sig-id") notes.push("Global Account — passport required for signatories");
    if (rowId === "bank-stmt") {
      level = "mandatory";
      notes.push("Zenus programme — 12-month statements");
    }
  }

  if ((ctx.uboLayers ?? 1) > 1 && rowId === "structure") {
    level = maxLevel(level, "mandatory");
    notes.push(`UBO layers ${ctx.uboLayers} — structure chart required`);
  }

  if (ctx.cramRating === "Medium" && rowId === "audited" && !ctx.products.includes("financing")) {
    notes.push("Not required at Medium without financing facility");
  }

  return { level, note: notes.join(" · ") || "Per SME KYB matrix · CRAM profile" };
}

export function buildKybChecklist(ctx: KybCaseContext): KybChecklistPackage {
  const generatedAt = ctx.generatedAt ?? new Date().toISOString();
  const entityCategory = entityTypeToKybCategory(ctx.entityType);
  const entityMeta = lookupEntityLegalType(ctx.entityType);

  if (entityTypeProhibited(ctx.entityType)) {
    return {
      ...ctx,
      entityCategory,
      generatedAt,
      prohibited: true,
      prohibitedReason: entityMeta?.rationale ?? "Prohibited entity type (OVR-006)",
      coreItems: [],
      entityItems: [],
      escalations: ["Relationship prohibited — do not onboard. Exit if existing."],
      guidelines: MAL_KYB_GUIDELINES,
    };
  }

  const coreItems: KybChecklistItem[] = [];
  for (const row of KYB_CORE_MATRIX) {
    const base = combineProductLevel(row, ctx.products);
    if (base === "not_required") continue;
    const { level, note } = cramEscalationNote(row.id, ctx, base);
    if (level === "not_required") continue;
    coreItems.push({
      id: row.id,
      section: row.section,
      document: row.document,
      level: base,
      effectiveLevel: level === "mandatory" ? "mandatory" : "conditional",
      status: "pending",
      cramNote: note,
      policyRef: row.policyRef,
      products: ctx.products.filter((p) => levelForProduct(row, p) !== "not_required"),
    });
  }

  const entityItems: KybChecklistItem[] = KYB_ENTITY_MATRIX
    .filter((row) => row.categories.includes(entityCategory))
    .map((row) => ({
      id: row.id,
      section: "entity_type",
      document: row.document,
      level: row.level,
      effectiveLevel: row.level === "mandatory" ? "mandatory" : "conditional",
      status: "pending" as const,
      cramNote: row.triggerNote,
      policyRef: "Entity-type matrix",
      products: ctx.products,
    }));

  const escalations: string[] = [];
  if (ctx.cramRating === "High" || ctx.eddRequired) {
    escalations.push(`CRAM ${ctx.cramRating} · ${ctx.ddLevel} — enhanced documentation depth`);
  }
  if (ctx.products.includes("financing")) {
    escalations.push("Financing column active — audited financials and facility resolution");
  }
  if (ctx.products.includes("global_account")) {
    escalations.push("Global Account (Zenus) — W-8, US TIN, 12-month statements, programme attestation");
  }
  if (entityMeta?.eddTrigger) {
    escalations.push(`Entity type EDD trigger: ${entityMeta.name}`);
  }
  if (ctx.pepStatus === "Foreign") {
    escalations.push("Foreign PEP (CBUAE Art. 15 First) — senior approval, SoF/wealth, enhanced monitoring mandatory");
  } else if (ctx.pepStatus === "Domestic" || ctx.pepStatus === "IO") {
    if (ctx.eddRequired) {
      escalations.push(`${ctx.pepStatus === "IO" ? "International-organization" : "Domestic"} PEP — high-risk relationship · Art. 15(b–d) enhanced KYB`);
    } else {
      escalations.push(`${ctx.pepStatus === "IO" ? "International-organization" : "Domestic"} PEP identified — identification complete; standard KYB unless relationship escalates`);
    }
  }
  escalations.push(`Review cycle: ${ctx.reviewMonths} months per CRAM residual band`);

  return {
    ...ctx,
    entityCategory,
    generatedAt,
    prohibited: false,
    coreItems,
    entityItems,
    escalations,
    guidelines: MAL_KYB_GUIDELINES,
  };
}

export function kybProductSummary(products: KybProduct[]): string {
  return products.map((p) => KYB_PRODUCT_LABELS[p]).join(" · ");
}

export const KYB_DEMO_CASES: KybCaseContext[] = [
  {
    caseRef: "ONB-2026-0042",
    customerName: "Pearl Mart Grocery",
    customerId: "ACT00033",
    entityType: "Sole Proprietorship",
    segment: "SME · Retail grocery",
    products: ["uae_iban"],
    cramRating: "Medium",
    inherentScore: 2.1,
    residualScore: 1.8,
    ddLevel: "Standard CDD",
    reviewMonths: 36,
    eddRequired: false,
    uboLayers: 1,
  },
  {
    caseRef: "ONB-2026-0018",
    customerName: "Gulf Bullion DMCC",
    customerId: "ACT00021",
    entityType: "Commercial Free Zone Establishment (FZE / FZ-LLC)",
    segment: "SME · Precious metals",
    products: ["uae_iban", "financing"],
    cramRating: "High",
    inherentScore: 3.4,
    residualScore: 2.9,
    ddLevel: "Enhanced (EDD)",
    reviewMonths: 12,
    eddRequired: true,
    uboLayers: 2,
    hasFinancingFacility: true,
  },
  {
    caseRef: "ONB-2026-0067",
    customerName: "NovaTrade Logistics GmbH",
    customerId: "ACT-US-8812",
    entityType: "Branch of a Foreign Company",
    segment: "SME · Cross-border logistics",
    products: ["uae_iban", "global_account"],
    cramRating: "High",
    inherentScore: 3.1,
    residualScore: 2.7,
    ddLevel: "Enhanced (EDD)",
    reviewMonths: 12,
    eddRequired: true,
    uboLayers: 3,
  },
];
