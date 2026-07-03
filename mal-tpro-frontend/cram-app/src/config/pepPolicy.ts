/**
 * CBUAE Art. 15(14) PEP policy — shared understanding for Sayed, Mohsen, and Jana.
 * @see https://rulebook.centralbank.ae/en/rulebook/article-15-14
 */
export const CBUAE_PEP_ARTICLE_REF = "CBUAE Rulebook Art. 15(14) · Cabinet Resolution 24/2022";

export const PEP_POLICY_SUMMARY = {
  foreign: "Foreign PEPs are high risk by default — senior management approval, source of funds/wealth, and enhanced ongoing monitoring apply automatically (Art. 15 First).",
  domesticIo: "Domestic PEPs and persons in prominent international-organization roles are not high risk by default. Apply Art. 15(b–d) enhanced measures only when a high-risk business relationship is identified after assessment (Art. 15 Second).",
  crossBorder: "Cross-border transactions increase PEP exposure — domestic/IO PEPs with cross-border activity should be treated as a high-risk relationship for enhanced monitoring (Mohsen TM · OS-TM-022).",
} as const;

export const AGENT_PEP_GUIDANCE = {
  sayed: {
    role: "Understand & score PEP category and relationship risk before applying floors.",
    rules: [
      "Foreign PEP → OVR-008 High floor and mandatory EDD without waiting for composite.",
      "Domestic / IO PEP → identify first; OVR-016 and EDD only when composite is Medium+ or cross-border exposure exists.",
      "Map Vital4 PEP hits to Foreign vs Domestic vs IO before CRAM sync.",
    ],
  },
  mohsen: {
    role: "Monitor transactions and investigate PEP activity vs declared profile.",
    rules: [
      "OS-TM-022: all PEP types — alert on cross-border transfers or >AED 50k domestic.",
      "Foreign PEP: enhanced thresholds on every outbound transfer.",
      "Domestic/IO PEP: escalate cross-border corridors; low-risk domestic-only may use standard TM until relationship high-risk.",
      "Cross-border inconsistent with expected activity → investigation case for MLRO.",
    ],
  },
  jana: {
    role: "Report PEP statistics and draft STR/SAR narratives with correct PEP tier.",
    rules: [
      "STR narratives must state Foreign vs Domestic vs international-organization PEP.",
      "Domestic/IO PEP STRs should note whether Art. 15(b–d) enhanced measures were applied (high-risk relationship).",
      "RET-PEP-STAT-001: breakdown by tier — Foreign automatic EDD vs Domestic/IO risk-assessed.",
    ],
  },
} as const;
