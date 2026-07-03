/** Mal FinCrime OS — AI agent registry (Sayed · Mohsen · Jana). Single source of truth. */
export type AgentId = "sayed" | "mohsen" | "jana";
export type AgentGender = "male" | "female";

export interface AgentProfile {
  id: AgentId;
  name: string;
  gender: AgentGender;
  role: string;
  tagline: string;
  color: string;
  gradient: string;
  glow: string;
  to: string;
  desc: string;
  stat: string;
  /** Human-readable capability list for tooltips / a11y */
  capabilities: string[];
}

export const AGENTS: Record<AgentId, AgentProfile> = {
  sayed: {
    id: "sayed",
    name: "Sayed",
    gender: "male",
    role: "Understand & Score",
    tagline: "Understands & scores",
    color: "#39B9ED",
    gradient: "linear-gradient(140deg,#39B9ED,#1f86b3)",
    glow: "rgba(57,185,237,.35)",
    to: "/cram",
    desc: "Reads every regulation, the AML/CFT policy and all risk-scoring inputs — and keeps the CRAM and scoring libraries continuously updated so no guideline is ever missed.",
    stat: "Weekly CBUAE · FinCEN · FATF · Zenus source monitor",
    capabilities: ["CRAM mapping", "Risk scoring", "CBUAE Art. 15 PEP tiers", "Corridor EWRA themes", "Regulatory impact", "Library sync", "Weekly source watch"],
  },
  mohsen: {
    id: "mohsen",
    name: "Mohsen",
    gender: "male",
    role: "Investigate",
    tagline: "Investigates",
    color: "#A953DF",
    gradient: "linear-gradient(140deg,#A953DF,#7a2fb3)",
    glow: "rgba(169,83,223,.35)",
    to: "/transaction-monitoring",
    desc: "Investigates onboarded customers & transactions — does activity make sense vs salary, source of funds & wealth? Monitors Oscilar TM rules for transfers and cards; cross-border PEP rules (OS-TM-022) per CBUAE Art. 15.",
    stat: "37 cases prepared · 40 Oscilar TM rules active",
    capabilities: ["Evidence collection", "Behaviour analysis", "Oscilar TM rules", "PEP cross-border TM", "Txn screening workflow", "Case narrative"],
  },
  jana: {
    id: "jana",
    name: "Jana",
    gender: "female",
    role: "Report",
    tagline: "Reports",
    color: "#7C6CF7",
    gradient: "linear-gradient(140deg,#7C6CF7,#4a3bb0)",
    glow: "rgba(124,108,247,.35)",
    to: "/reporting",
    desc: "Drafts every regulatory report — STR/SAR (goAML & FinCEN), sanctions notifications, CBUAE returns, board packs, and professional customer/regulator correspondence. PEP tier (Foreign vs Domestic/IO) reflected in STR narratives.",
    stat: "35 templates · dual FIU ready",
    capabilities: ["STR/SAR drafting", "PEP tier reporting", "Regulatory returns", "FIU correspondence", "Board packs", "Email templates", "Exam packs"],
  },
};

export const AGENT_LIST: AgentProfile[] = [AGENTS.sayed, AGENTS.mohsen, AGENTS.jana];

/** Primary agent for a route — used for contextual headers & guidance strips. */
export const ROUTE_AGENT: Record<string, AgentId | undefined> = {
  "/": undefined,
  "/cram": "sayed",
  "/regulatory": "sayed",
  "/test-bench": "sayed",
  "/kyb-checklist": "sayed",
  "/activity-register": "sayed",
  "/validation": "sayed",
  "/feeds": "sayed",
  "/rerating": "mohsen",
  "/investigation": "mohsen",
  "/transaction-monitoring": "mohsen",
  "/reporting": "jana",
  "/governance": undefined,
  "/screening": "sayed",
};

export function agentForRoute(pathname: string): AgentId | undefined {
  return ROUTE_AGENT[pathname];
}
