/**
 * Occupation risk intelligence — typology-aware profession scoring (Policy §12; docs/06).
 * Supplements profession.csv + isic_profession_guidance with evidence-based typology drivers.
 */
import type { Score } from "./types";
import { clampScore } from "./data";

export interface ProfessionTypology {
  /** Match against declared profession text (case-insensitive substring) */
  patterns: string[];
  score: Score;
  drivers: string[];
  policyRef: string;
  eddTrigger: boolean;
  category: "gatekeeper" | "cash_intensive" | "high_value_goods" | "virtual_assets" | "trade" | "influence" | "standard";
}

/** Curated typologies — aligned with FATF/Egmont MSB, gatekeeper, and UAE CBUAE expectations. */
export const PROFESSION_TYPOLOGIES: ProfessionTypology[] = [
  { patterns: ["lawyer", "legal consultant", "notary", "advocate"], score: 3, drivers: ["Gatekeeper · legal-person formation", "Client money / escrow exposure"], policyRef: "AML Policy §12 · OVR gatekeeper", eddTrigger: true, category: "gatekeeper" },
  { patterns: ["accountant", "auditor", "tax advisor", "tax consultant"], score: 3, drivers: ["Gatekeeper · company administration", "Structuring typologies"], policyRef: "AML Policy §12 · gatekeeper", eddTrigger: true, category: "gatekeeper" },
  { patterns: ["real estate", "property developer", "property broker", "real estate broker"], score: 3, drivers: ["High-value property · third-party payments"], policyRef: "ISIC theme · Real estate (68)", eddTrigger: true, category: "high_value_goods" },
  { patterns: ["money changer", "remittance", "hawala", "money service", "msb", "payment service", "fintech operator"], score: 3, drivers: ["Third-party funds · cross-border flows", "MSB typology"], policyRef: "Typology VH04 · ISIC 6619", eddTrigger: true, category: "cash_intensive" },
  { patterns: ["crypto", "virtual asset", "blockchain", "digital asset", "vasp"], score: 3, drivers: ["Anonymity · rapid value transfer", "Sanctions evasion typology"], policyRef: "Typology crypto · CBUAE VA rules", eddTrigger: true, category: "virtual_assets" },
  { patterns: ["casino", "betting", "gambling", "gaming operator"], score: 3, drivers: ["Cash-intensive gambling typology"], policyRef: "Typology VH01 · ISIC 9200", eddTrigger: true, category: "cash_intensive" },
  { patterns: ["gold", "precious metal", "jewel", "diamond", "bullion"], score: 3, drivers: ["Portable high-value commodities", "Sanctions/PF exposure"], policyRef: "Typology precious metals · ISIC 4672", eddTrigger: true, category: "high_value_goods" },
  { patterns: ["arms", "ammunition", "weapon", "defence dealer"], score: 3, drivers: ["PF · export-control exposure"], policyRef: "Typology VH02", eddTrigger: true, category: "high_value_goods" },
  { patterns: ["freelancer", "freelance", "consultant", "independent contractor"], score: 2, drivers: ["Variable income · self-employed typology", "SoW verification required"], policyRef: "Onboarding §10 · self-employed", eddTrigger: false, category: "standard" },
  { patterns: ["influencer", "content creator", "social media", "youtuber", "streamer"], score: 2, drivers: ["Opaque sponsorship income", "Cross-border payments"], policyRef: "Onboarding §10 · self-employed NP", eddTrigger: false, category: "influence" },
  { patterns: ["charity", "npo", "ngo", "foundation officer", "fundraiser"], score: 3, drivers: ["TF/sanctions abuse potential"], policyRef: "ISIC theme · NPO/charity", eddTrigger: true, category: "trade" },
  { patterns: ["import", "export", "freight forwarder", "customs broker", "logistics"], score: 2, drivers: ["TBML · sanctions exposure"], policyRef: "ISIC theme · Trade intermediaries", eddTrigger: false, category: "trade" },
  { patterns: ["oil", "gas", "commodity trader", "commodities"], score: 3, drivers: ["Sanctions · corruption · high-value flows"], policyRef: "ISIC theme · Commodities", eddTrigger: true, category: "trade" },
  { patterns: ["used car", "auto dealer", "motor vehicle dealer", "luxury goods"], score: 3, drivers: ["High-value movable assets", "Trade-based ML"], policyRef: "Typology auto dealers · ISIC 4781", eddTrigger: true, category: "high_value_goods" },
  { patterns: ["restaurant", "bar", "hotel owner", "hospitality"], score: 2, drivers: ["Cash-intensive operations"], policyRef: "Profession guidance · hospitality", eddTrigger: false, category: "cash_intensive" },
];

const SALARIED_HINTS = ["employee", "clerk", "assistant", "manager", "engineer", "teacher", "nurse", "doctor", "analyst", "officer", "technician", "administrator", "director salaried"];
const SELF_EMPLOYED_HINTS = ["owner", "freelance", "consultant", "self-employed", "contractor", "entrepreneur", "trader", "dealer", "broker", "agent", "operator", "developer", "influencer"];

export function matchProfessionTypology(text: string): ProfessionTypology | undefined {
  const t = text.toLowerCase();
  return PROFESSION_TYPOLOGIES.find((row) => row.patterns.some((p) => t.includes(p)));
}

export function typologyProfessionScore(text: string): { score: Score; typology?: ProfessionTypology } {
  const hit = matchProfessionTypology(text);
  if (!hit) return { score: 1 };
  return { score: hit.score, typology: hit };
}

export function professionTriggersEdd(text: string): boolean {
  return matchProfessionTypology(text)?.eddTrigger ?? false;
}

/** Filter profession register by employment status score (1=salaried … 3=unemployed/atypical). */
export function isProfessionCompatibleWithEmployment(professionName: string, employmentScore: number): boolean {
  const p = professionName.toLowerCase();
  const isSelfEmpPattern = SELF_EMPLOYED_HINTS.some((h) => p.includes(h));
  const isSalariedPattern = SALARIED_HINTS.some((h) => p.includes(h)) && !isSelfEmpPattern;

  if (employmentScore >= 2) {
    // Self-employed / business owner — allow self-employed patterns + high-risk typologies + generic professions
    if (isSalariedPattern && !isSelfEmpPattern) return false;
    return true;
  }
  // Salaried — exclude obvious owner/dealer/trader unless also employee title
  if (isSelfEmpPattern && !isSalariedPattern) return false;
  return true;
}

export function suggestedActivitiesForProfession(profession: string): string[] {
  const t = profession.toLowerCase();
  const hit = matchProfessionTypology(profession);
  if (hit?.category === "virtual_assets") return ["Crypto-related services", "Electronic/ Digital Asset/ Crypto Trading Platform"];
  if (hit?.category === "cash_intensive" && t.includes("casino")) return ["Casinos"];
  if (hit?.category === "gatekeeper" && t.includes("lawyer")) return ["Legal, consulting and accounting activities"];
  if (hit?.category === "high_value_goods" && t.includes("real estate")) return ["Real Estate"];
  if (hit?.category === "high_value_goods") return ["Auto dealers", "Diamonds, Jewellery, Precious Stones and Metals Manufacturers and Dealers"];
  if (t.includes("engineer") || t.includes("software") || t.includes("computer")) {
    return ["Information technology (including manufacturing, trade and repair of computers, peripheral equipment and software)"];
  }
  if (t.includes("consultant") || t.includes("freelance")) {
    return ["Legal, consulting and accounting activities", "Information technology (including manufacturing, trade and repair of computers, peripheral equipment and software)"];
  }
  return [];
}

export function typologyScoreFromText(text: string): Score {
  return clampScore(matchProfessionTypology(text)?.score ?? 1) as Score;
}
