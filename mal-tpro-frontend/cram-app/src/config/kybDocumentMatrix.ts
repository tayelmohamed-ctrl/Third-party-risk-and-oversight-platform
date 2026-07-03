/**
 * SME KYB document matrix — UAE IBAN · Global Accounts (Zenus) · Financing.
 * Source: Mal SME KYB matrix (July 2026) + CRAM entity Appendix B + CDD Policy 1.3.
 */

export type KybProduct = "uae_iban" | "global_account" | "financing";
export type KybReqLevel = "mandatory" | "conditional" | "not_required";

export type KybEntityCategory =
  | "llc_mainland"
  | "free_zone"
  | "sole_proprietorship"
  | "civil_professional"
  | "private_jsc"
  | "public_jsc"
  | "partnership"
  | "foreign_branch"
  | "trust"
  | "npo_charity"
  | "government";

export interface KybMatrixRow {
  id: string;
  document: string;
  section: "core" | "ownership" | "financial" | "tax" | "activity";
  uaeIban: KybReqLevel;
  globalAccount: KybReqLevel;
  financing: KybReqLevel;
  policyRef: string;
}

export interface KybEntityRow {
  id: string;
  document: string;
  categories: KybEntityCategory[];
  level: KybReqLevel;
  triggerNote: string;
}

export const KYB_PRODUCT_LABELS: Record<KybProduct, string> = {
  uae_iban: "UAE IBAN",
  global_account: "Global Account (Zenus)",
  financing: "Financing",
};

export const MAL_KYB_GUIDELINES = {
  documentTitle: "KYB Document Checklist",
  confidentiality: "CONFIDENTIAL — FOR INTERNAL AML/CFT USE ONLY",
  preparedBy: "Sayed · Mal FinCrime OS",
  modelVersion: "CRAM-CBUAE-2026-05",
  policyBasis: [
    "Mal CDD Policy 1.3 · Enhanced Due Diligence Policy 1.3 (EDD)",
    "CBUAE Rulebook · AML-CFT Law · Cabinet Decision 10/2019",
    "Mal SME KYB Document Matrix — UAE IBAN · Global Accounts · Financing",
    "CRAM Entity Appendix B — legal-form scoring & EDD triggers",
    "Zenus Bank Programme Services Agreement · CBDDQ (Global Accounts only)",
  ],
  footerNotice:
    "This checklist is generated from live CRAM scoring and must not be relied upon without MLRO or compliance review. "
    + "Collect originals or certified copies per CDD Policy retention (5 years minimum).",
};

export const KYB_CORE_MATRIX: KybMatrixRow[] = [
  { id: "app", section: "core", document: "Account-opening application (signed / e-signed by authorised signatory)", uaeIban: "mandatory", globalAccount: "mandatory", financing: "mandatory", policyRef: "CDD 1.3 §4.1" },
  { id: "licence", section: "core", document: "Trade / commercial / professional licence (current, valid)", uaeIban: "mandatory", globalAccount: "mandatory", financing: "mandatory", policyRef: "CBUAE Rulebook · CDD 1.3" },
  { id: "incorp", section: "core", document: "Certificate of incorporation / commercial registration OR recent registry extract", uaeIban: "mandatory", globalAccount: "mandatory", financing: "mandatory", policyRef: "CDD 1.3 §4.2" },
  { id: "moa", section: "core", document: "Memorandum & Articles of Association (MOA/AOA), latest", uaeIban: "mandatory", globalAccount: "mandatory", financing: "mandatory", policyRef: "CDD 1.3" },
  { id: "address", section: "core", document: "Registered-office evidence: Ejari / tenancy OR utility bill OR registry confirmation", uaeIban: "mandatory", globalAccount: "mandatory", financing: "mandatory", policyRef: "Substance · Thematic Review" },
  { id: "sig-id", section: "core", document: "Authorised-signatory ID (Emirates ID OR passport)", uaeIban: "mandatory", globalAccount: "mandatory", financing: "mandatory", policyRef: "CDD 1.3 · IDV" },
  { id: "ubo", section: "ownership", document: "UBO declaration + ID per UBO (Emirates ID OR passport) / UBO Register", uaeIban: "mandatory", globalAccount: "mandatory", financing: "mandatory", policyRef: "UBO Policy · Wolfsberg" },
  { id: "activity", section: "activity", document: "Business-activity evidence (contracts / invoices / profile / website / VAT cert / business plan)", uaeIban: "mandatory", globalAccount: "mandatory", financing: "mandatory", policyRef: "CRAM · nature-of-business" },
  { id: "sof", section: "financial", document: "Source of funds (bank statements / financials / contracts / shareholder funding)", uaeIban: "mandatory", globalAccount: "mandatory", financing: "mandatory", policyRef: "CDD 1.3 · SoF/SoW" },
  { id: "audited", section: "financial", document: "Audited financial statements for last 2 years", uaeIban: "not_required", globalAccount: "not_required", financing: "mandatory", policyRef: "Credit policy · matrix" },
  { id: "fatca", section: "tax", document: "FATCA/CRS self-certification (+ TIN/GIIN where applicable)", uaeIban: "mandatory", globalAccount: "mandatory", financing: "mandatory", policyRef: "CRS · FATCA policy" },
  { id: "w8", section: "tax", document: "FATCA W-8BEN-E (US persons / Global Account)", uaeIban: "conditional", globalAccount: "mandatory", financing: "not_required", policyRef: "Zenus · FinCEN" },
  { id: "us-tin", section: "tax", document: "Tax document (TIN / EIN / TRN as applicable)", uaeIban: "conditional", globalAccount: "mandatory", financing: "conditional", policyRef: "IRS · CBUAE TRN" },
  { id: "profile", section: "activity", document: "Expected activity profile (volumes, counterparties, geographies, payment pattern)", uaeIban: "mandatory", globalAccount: "mandatory", financing: "mandatory", policyRef: "TM 1.5 · Oscilar baseline" },
  { id: "bank-stmt", section: "financial", document: "Bank statements / balance sheet (12 months where applicable)", uaeIban: "conditional", globalAccount: "mandatory", financing: "mandatory", policyRef: "Credit · Zenus programme" },
  { id: "resolution", section: "ownership", document: "Board / shareholder resolution (if not in MOA)", uaeIban: "conditional", globalAccount: "conditional", financing: "conditional", policyRef: "Governance" },
  { id: "structure", section: "ownership", document: "Ownership structure chart tracing to natural-person UBO(s)", uaeIban: "conditional", globalAccount: "conditional", financing: "conditional", policyRef: "UBO Policy" },
  { id: "sow", section: "financial", document: "Source of wealth evidence", uaeIban: "conditional", globalAccount: "conditional", financing: "conditional", policyRef: "EDD 1.3 · Policy 8.2" },
  { id: "zenus-attest", section: "core", document: "Zenus prohibited-customer category attestation", uaeIban: "not_required", globalAccount: "mandatory", financing: "not_required", policyRef: "Zenus PSA Sch. 3" },
];

export const KYB_ENTITY_MATRIX: KybEntityRow[] = [
  { id: "e-shreg", document: "Shareholder register / ownership evidence at each layer", categories: ["llc_mainland"], level: "conditional", triggerNote: "If not fully disclosed in MOA" },
  { id: "e-mgr", document: "Manager(s) appointment evidence + ID", categories: ["llc_mainland"], level: "conditional", triggerNote: "LLC mainland" },
  { id: "e-agent", document: "Local service / corporate agent agreement", categories: ["llc_mainland"], level: "conditional", triggerNote: "Where licence type requires agent" },
  { id: "e-fz-lic", document: "Free-zone licence + incorporation certificate", categories: ["free_zone"], level: "mandatory", triggerNote: "FZE / FZ-LLC" },
  { id: "e-fz-reg", document: "Free-zone registry extract / share certificate", categories: ["free_zone"], level: "mandatory", triggerNote: "Free Zone" },
  { id: "e-fz-sub", document: "Establishment card OR office lease OR flexi-desk (substance)", categories: ["free_zone"], level: "conditional", triggerNote: "EDD substance check" },
  { id: "e-fz-mand", document: "Free-zone mandate / board resolution", categories: ["free_zone"], level: "conditional", triggerNote: "Free Zone" },
  { id: "e-sole-id", document: "Owner ID — Emirates ID + passport + residency evidence", categories: ["sole_proprietorship"], level: "mandatory", triggerNote: "Sole establishment" },
  { id: "e-poa", document: "Power of attorney", categories: ["sole_proprietorship"], level: "conditional", triggerNote: "Non-owner operates account" },
  { id: "e-civil", document: "Civil / professional licence + partners' agreement", categories: ["civil_professional"], level: "mandatory", triggerNote: "Civil / professional company" },
  { id: "e-civil-part", document: "Partner IDs + UBO declaration where partner is legal person", categories: ["civil_professional"], level: "mandatory", triggerNote: "Civil / professional" },
  { id: "e-pjsc-bd", document: "Board-of-directors list + resolution", categories: ["private_jsc", "public_jsc"], level: "conditional", triggerNote: "Private / Public JSC" },
  { id: "e-pjsc-aud", document: "Audited financial statements", categories: ["private_jsc"], level: "conditional", triggerNote: "Medium/High risk or facility" },
  { id: "e-pub-list", document: "Listing / regulatory-disclosure evidence + latest annual report", categories: ["public_jsc"], level: "conditional", triggerNote: "Listed entity" },
  { id: "e-pub-dir", document: "Director & authorised-signatory IDs", categories: ["public_jsc"], level: "mandatory", triggerNote: "Public JSC" },
  { id: "e-part-ag", document: "Partnership agreement + partner register", categories: ["partnership"], level: "mandatory", triggerNote: "General / limited partnership" },
  { id: "e-part-id", document: "Partner IDs + UBO behind any legal-person partner", categories: ["partnership"], level: "mandatory", triggerNote: "Partnership" },
  { id: "e-fb-parent", document: "Parent constitutional docs (attested) + certificate of good standing", categories: ["foreign_branch"], level: "mandatory", triggerNote: "Foreign branch" },
  { id: "e-fb-branch", document: "UAE branch licence + registration + UAE legal-representative details", categories: ["foreign_branch"], level: "mandatory", triggerNote: "Foreign branch" },
  { id: "e-fb-ubo", document: "Parent ownership chart + UBO at ultimate-parent level", categories: ["foreign_branch"], level: "mandatory", triggerNote: "Foreign branch" },
  { id: "e-trust-deed", document: "Trust deed or equivalent constituting document", categories: ["trust"], level: "mandatory", triggerNote: "Trust / legal arrangement" },
  { id: "e-trust-id", document: "ID for all trust parties (settlor, trustee, protector, beneficiaries, controllers)", categories: ["trust"], level: "mandatory", triggerNote: "Trust arrangement" },
  { id: "e-npo", document: "Registration + Ministry authorisation + governance / donor records", categories: ["npo_charity"], level: "conditional", triggerNote: "Acceptance gate — not standard journey" },
  { id: "e-gov", document: "Establishing instrument (law / decree) + authorised-representative IDs", categories: ["government"], level: "mandatory", triggerNote: "Government / quasi-government" },
];

export function entityTypeToKybCategory(entityType: string): KybEntityCategory {
  const n = entityType.toLowerCase();
  if (n.includes("branch of a foreign")) return "foreign_branch";
  if (n.includes("branch of a uae")) return "llc_mainland";
  if (n.includes("free zone") || n.includes("fze") || n.includes("fz-llc") || n.includes("financial free zone")) return "free_zone";
  if (n.includes("sole proprietorship")) return "sole_proprietorship";
  if (n.includes("partnership") || n.includes("llp") || n.includes("joint liability") || n.includes("simple partnership")) return "partnership";
  if (n.includes("private joint stock")) return "private_jsc";
  if (n.includes("public joint stock") || n.includes("pjsc")) return "public_jsc";
  if (n.includes("trust") || n.includes("nominee") || n.includes("fiduciary")) return "trust";
  if (n.includes("charity") || n.includes("non-profit") || n.includes("npo")) return "npo_charity";
  if (n.includes("government") || n.includes("federal") || n.includes("semi-government") || n.includes("embassy")) return "government";
  if (n.includes("civil") || n.includes("professional company")) return "civil_professional";
  return "llc_mainland";
}

export function inferKybProductsFromProductName(productName: string): KybProduct[] {
  const p = productName.toLowerCase();
  const out = new Set<KybProduct>();
  if (p.includes("virtual iban") || p.includes("current") || p.includes("savings") || p.includes("salary") || p.includes("iban")) {
    out.add("uae_iban");
  }
  if (p.includes("trade finance") || p.includes("invoice finance") || p.includes("financ")) {
    out.add("financing");
  }
  if (p.includes("international") || p.includes("remittance") || p.includes("global") || p.includes("usd") || p.includes("cross-border")) {
    out.add("global_account");
  }
  if (out.size === 0) out.add("uae_iban");
  return [...out];
}
