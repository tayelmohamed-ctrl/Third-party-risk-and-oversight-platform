/**
 * FIU routing destinations — dual UAE (goAML) + US BaaS (FinCEN).
 * Contacts are programme defaults; MLRO may override in the draft editor.
 */
export type FiuDestinationId = "UAE" | "US";

export interface FiuDestination {
  id: FiuDestinationId;
  label: string;
  system: string;
  regulator: string;
  portalUrl: string;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  filingInstructions: string;
  guidanceRefs: string[];
  reportTypes: { code: string; label: string }[];
}

export const FIU_DESTINATIONS: Record<FiuDestinationId, FiuDestination> = {
  UAE: {
    id: "UAE",
    label: "UAE Financial Intelligence Unit · goAML",
    system: "goAML",
    regulator: "UAE FIU (Central Bank of the UAE)",
    portalUrl: "https://services.uaeiec.gov.ae/goaml",
    contactName: "UAE FIU Operations",
    contactTitle: "Financial Intelligence Unit — CBUAE",
    contactEmail: "fiu@centralbank.ae",
    contactPhone: "+971-4-707-6666",
    contactAddress: "Central Bank of the UAE, Abu Dhabi, United Arab Emirates",
    filingInstructions:
      "Submit via goAML after MLRO maker-checker sign-off. Report Type STR for executed suspicious transactions; SAR for non-transaction activity or attempted/blocked transactions (CBUAE Notice 3354/2022 §3.2). No minimum threshold.",
    guidanceRefs: [
      "CBUAE Notice 3354/2022",
      "Thematic Review STR Framework (Jan 2023)",
      "Federal Decree-Law 20/2018 · Cabinet Decision 10/2019",
    ],
    reportTypes: [
      { code: "STR", label: "Suspicious Transaction Report" },
      { code: "SAR", label: "Suspicious Activity Report (non-txn / attempted)" },
    ],
  },
  US: {
    id: "US",
    label: "FinCEN · BSA E-Filing (US BaaS programme)",
    system: "FinCEN BSA E-File",
    regulator: "FinCEN · US Department of the Treasury",
    portalUrl: "https://bsaefiling.fincen.gov",
    contactName: "FinCEN Regulatory Helpline",
    contactTitle: "Financial Crimes Enforcement Network",
    contactEmail: "regulatory@fincen.gov",
    contactPhone: "+1-800-949-2732",
    contactAddress: "FinCEN, PO Box 39, Vienna, VA 22183, United States",
    filingInstructions:
      "File SAR Form 111 and CTR Form 104 via BSA E-Filing after BSA Officer / MLRO approval. SAR: complete Part IV narrative (Who/What/When/Where/Why/How). CTR: file within 15 calendar days of cash transactions ≥ $10,000 (31 CFR 1010.311). Zenus Bank sponsor notification per programme agreement.",
    guidanceRefs: [
      "31 CFR Chapter X (BSA)",
      "FinCEN SAR electronic filing requirements",
      "FinCEN CTR Form 104 · 31 CFR 1010.311",
      "Mal US BaaS AML Programme · Zenus oversight",
    ],
    reportTypes: [
      { code: "SAR", label: "Suspicious Activity Report (Form 111)" },
      { code: "CTR", label: "Currency Transaction Report (Form 104)" },
    ],
  },
};

export const FIU_LIST = Object.values(FIU_DESTINATIONS);

export function getFiuDestination(id: FiuDestinationId): FiuDestination {
  return FIU_DESTINATIONS[id];
}

export function defaultFiuForLicenseRegion(region?: string): FiuDestinationId {
  return region === "US" ? "US" : "UAE";
}
