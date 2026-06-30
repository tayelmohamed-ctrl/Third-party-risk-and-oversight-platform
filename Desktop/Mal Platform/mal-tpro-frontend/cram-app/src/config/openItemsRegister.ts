/** MLRO open items — sourced from docs/05-OPEN-ITEMS-REGISTER.md (draft freeze). */
export type OpenItemStatus = "open" | "accepted" | "corrected";

export interface OpenItem {
  id: string;
  title: string;
  where: string;
  impact: string;
  dispositionNeeded: string;
  buildHandling: string;
  status: OpenItemStatus;
  /** MLRO decision text when accepted/corrected */
  decision?: string;
}

export const OPEN_ITEMS_REGISTER: OpenItem[] = [
  {
    id: "1",
    title: "Medium/High band boundary differs: Calculator 2.15 vs CRAM 2.00",
    where: "contract §6 / BRD §7.2.1",
    impact: "Same score → different rating",
    dispositionNeeded: "Ratify one boundary per segment",
    buildHandling: "Boundary is config; default = Calculator; audit records set used",
    status: "accepted",
    decision: "Calculator default (>2.15) bank-wide; CRAM set documented in validation (GV-07)",
  },
  {
    id: "2",
    title: "Nationality/Birth prohibition tests score ≥5 but country scale maxes at 4",
    where: "BRD §6.3.11 / §7.3.1",
    impact: "Intended prohibition branch may be unreachable at old threshold",
    dispositionNeeded: "Confirm threshold ≥4 on firm scale",
    buildHandling: "Prohibition fires at firm ≥4; test flagged in audit",
    status: "corrected",
    decision: "Adopted firm ≥4 for Category-A prohibition pathway",
  },
  {
    id: "3",
    title: "CR Safe-Haven source had #VALUE! errors",
    where: "BRD §7.5",
    impact: "Safe-haven component may misread",
    dispositionNeeded: "Clean source; validate affected countries",
    buildHandling: "country_risk.csv consolidated; re-validate on library load",
    status: "accepted",
    decision: "Gate G1 library load QA — pending next library refresh sign-off",
  },
  {
    id: "4",
    title: "PEP-type helper must be explicit input",
    where: "BRD OVR-008 / §7.5",
    impact: "Override may not fire if blank",
    dispositionNeeded: "Mandatory pep dropdown feeding OVR-008/016",
    buildHandling: "Engine requires pep; blank → BLOCKED via DQ gate",
    status: "corrected",
    decision: "PEP mandatory in capture; gate-only floors OVR-008/016",
  },
  {
    id: "5",
    title: "CRAM quantified for Individual (NP) only; LP params qualitative",
    where: "BRD §7.5",
    impact: "LP scoring not fully quantitative",
    dispositionNeeded: "Extend LP libraries to quantitative params",
    buildHandling: "Entity uses ISIC + legal-type register; sub-factors partial",
    status: "open",
  },
  {
    id: "6",
    title: "Scale base differs (Calculator 1–3 vs CRAM 0–3/0–4)",
    where: "BRD §7.5",
    impact: "Aggregation must normalise",
    dispositionNeeded: "Single internal scale before weighting",
    buildHandling: "Engine normalises to 1–3; 0=N/A, 4=prohibition flag",
    status: "accepted",
    decision: "Normalisation implemented in firmToScore + clampScore",
  },
];

export function openItemCounts() {
  const open = OPEN_ITEMS_REGISTER.filter((i) => i.status === "open").length;
  const accepted = OPEN_ITEMS_REGISTER.filter((i) => i.status === "accepted").length;
  const corrected = OPEN_ITEMS_REGISTER.filter((i) => i.status === "corrected").length;
  return { open, accepted, corrected, total: OPEN_ITEMS_REGISTER.length };
}

export function statusLabel(status: OpenItemStatus): string {
  return status === "open" ? "Open" : status === "accepted" ? "Accepted" : "Corrected";
}

export function statusPillClass(status: OpenItemStatus): string {
  return status === "open" ? "bg-hi/15 text-hi" : status === "accepted" ? "bg-med/15 text-med" : "bg-low/15 text-low";
}
