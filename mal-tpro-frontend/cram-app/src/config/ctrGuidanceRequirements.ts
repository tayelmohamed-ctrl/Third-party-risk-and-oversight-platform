/** FinCEN Form 104 CTR draft compliance — 31 CFR 1010.311. */

export interface CtrRequirement {
  id: string;
  label: string;
  sectionIds: string[];
  required: boolean;
}

export const CTR_DRAFT_REQUIREMENTS: CtrRequirement[] = [
  { id: "txn-date", label: "Transaction date (Form 104 Item 1)", sectionIds: ["txnDate"], required: true },
  { id: "subject", label: "Person conducting transaction — name & TIN/EIN", sectionIds: ["customerName", "taxId"], required: true },
  { id: "amounts", label: "Cash in / cash out / aggregate ≥ USD 10,000", sectionIds: ["cashIn", "cashOut", "aggregateUsd"], required: true },
  { id: "account", label: "Account number affected", sectionIds: ["accountNumber"], required: true },
  { id: "location", label: "Financial institution / branch location", sectionIds: ["branchLocation"], required: true },
  { id: "aggregation", label: "Multiple transactions — aggregation explained if applicable", sectionIds: ["aggregationNote"], required: false },
  { id: "bsa-officer", label: "BSA officer contact for filing", sectionIds: ["mlroName", "mlroEmail"], required: true },
];

const PLACEHOLDER_RE = /^(—|n\/a|tbd|\[|\{\{)/i;

function sectionValueOk(v: string | undefined): boolean {
  if (!v?.trim()) return false;
  if (PLACEHOLDER_RE.test(v.trim())) return false;
  if (v.toLowerCase().startsWith("tbd —")) return false;
  return v.trim().length >= 2;
}

export function evaluateCtrCompliance(sections: { id: string; value: string }[]): {
  score: number;
  total: number;
  items: { id: string; label: string; pass: boolean }[];
  blockers: string[];
} {
  const sectionMap = Object.fromEntries(sections.map((s) => [s.id, s.value]));
  const aggregate = parseFloat(sectionMap.aggregateUsd?.replace(/[^0-9.]/g, "") ?? "0");
  const items = CTR_DRAFT_REQUIREMENTS.map((r) => ({
    id: r.id,
    label: r.label,
    pass: r.sectionIds.every((id) => sectionValueOk(sectionMap[id])),
  }));

  const required = CTR_DRAFT_REQUIREMENTS.filter((r) => r.required);
  const requiredPass = required.filter((r) =>
    r.sectionIds.every((id) => sectionValueOk(sectionMap[id])),
  ).length;

  const blockers: string[] = [];
  if (aggregate < 10_000) {
    blockers.push("Aggregate cash amount must be ≥ USD 10,000 (31 CFR 1010.311)");
  }
  for (const r of required) {
    if (!r.sectionIds.every((id) => sectionValueOk(sectionMap[id]))) {
      blockers.push(r.label);
    }
  }
  const aggregated = sectionMap.aggregatedFlag?.toLowerCase() === "yes";
  if (aggregated && !sectionValueOk(sectionMap.aggregationNote)) {
    blockers.push("Aggregation note required when multiple transactions combined");
  }

  return {
    score: requiredPass,
    total: required.length,
    items,
    blockers,
  };
}
