/**
 * Executive dashboard — approver directory & routing by perimeter + decision type.
 * Fill empty emails when US CO, delegated MLRO, and board contacts are confirmed.
 */
import type { CompliancePerimeter } from "./perimeters";

export type ApproverRole =
  | "primary_user"
  | "us_co"
  | "delegated_mlro"
  | "mlro"
  | "board";

export type DecisionCategory =
  | "standard"
  | "pep"
  | "str_sar"
  | "onboarding"
  | "governance"
  | "partner";

export interface ApproverContact {
  role: ApproverRole;
  label: string;
  /** Empty until configured — notify logic skips with a clear status */
  email: string;
}

/** Single source of truth for approver emails (update here when contacts are known). */
export const APPROVER_DIRECTORY: Record<ApproverRole, ApproverContact> = {
  primary_user: {
    role: "primary_user",
    label: "Head of Financial Crimes (you)",
    email: "tayel.mohamed@mal.ae",
  },
  us_co: {
    role: "us_co",
    label: "US Chief Compliance Officer",
    email: "",
  },
  delegated_mlro: {
    role: "delegated_mlro",
    label: "Delegated MLRO",
    email: "",
  },
  mlro: {
    role: "mlro",
    label: "MLRO",
    email: "tayel.mohamed@mal.ae",
  },
  board: {
    role: "board",
    label: "Board / CO sign-off",
    email: "",
  },
};

export interface ApprovalRoutingRule {
  primaryRole: ApproverRole;
  /** Roles shown as notify checkboxes (secondary sign-off or FYI) */
  notifyRoles: ApproverRole[];
  /** Pre-tick these roles when the queue row opens */
  defaultNotify: ApproverRole[];
  summary: string;
}

const GA_RULES: Record<DecisionCategory, ApprovalRoutingRule> = {
  standard: {
    primaryRole: "primary_user",
    notifyRoles: ["delegated_mlro"],
    defaultNotify: [],
    summary: "You decide · optional delegated MLRO FYI",
  },
  pep: {
    primaryRole: "primary_user",
    notifyRoles: ["us_co", "delegated_mlro"],
    defaultNotify: ["us_co"],
    summary: "You decide · US CO notified for PEP tier",
  },
  str_sar: {
    primaryRole: "us_co",
    notifyRoles: ["primary_user", "delegated_mlro"],
    defaultNotify: ["primary_user", "delegated_mlro"],
    summary: "US CO final sign-off · you + delegated MLRO notified",
  },
  onboarding: {
    primaryRole: "delegated_mlro",
    notifyRoles: ["primary_user", "us_co"],
    defaultNotify: ["primary_user"],
    summary: "Delegated MLRO approves onboarding · you notified",
  },
  governance: {
    primaryRole: "primary_user",
    notifyRoles: ["us_co", "delegated_mlro"],
    defaultNotify: ["us_co"],
    summary: "You decide · US CO for programme changes",
  },
  partner: {
    primaryRole: "primary_user",
    notifyRoles: ["us_co", "delegated_mlro"],
    defaultNotify: ["us_co"],
    summary: "You decide · US CO for partner / Zenus escalations",
  },
};

const MAL_BANK_RULES: Record<DecisionCategory, ApprovalRoutingRule> = {
  standard: {
    primaryRole: "mlro",
    notifyRoles: [],
    defaultNotify: [],
    summary: "MLRO only",
  },
  pep: {
    primaryRole: "mlro",
    notifyRoles: ["board"],
    defaultNotify: ["board"],
    summary: "MLRO decides · board/CO sign-off required for PEP tier",
  },
  str_sar: {
    primaryRole: "mlro",
    notifyRoles: ["board"],
    defaultNotify: ["board"],
    summary: "MLRO decides · board/CO for STR filing tier",
  },
  onboarding: {
    primaryRole: "mlro",
    notifyRoles: [],
    defaultNotify: [],
    summary: "MLRO only for UAE onboarding",
  },
  governance: {
    primaryRole: "mlro",
    notifyRoles: ["board"],
    defaultNotify: [],
    summary: "MLRO · board optional for material policy change",
  },
  partner: {
    primaryRole: "mlro",
    notifyRoles: [],
    defaultNotify: [],
    summary: "MLRO only",
  },
};

export function approvalRule(
  perimeter: CompliancePerimeter,
  category: DecisionCategory,
): ApprovalRoutingRule {
  return perimeter === "global_account" ? GA_RULES[category] : MAL_BANK_RULES[category];
}

export function classifyDecision(input: {
  reason: string;
  title?: string;
  sourceId?: string;
  metadata?: Record<string, unknown> | null;
}): DecisionCategory {
  const text = `${input.reason} ${input.title ?? ""} ${input.sourceId ?? ""}`.toLowerCase();
  if (input.sourceId === "zenus-onboarding" || (text.includes("zenus") && text.includes("onboarding"))) {
    return "onboarding";
  }
  if (input.sourceId === "gov-open-items" || text.includes("governance") || text.includes("validation")) {
    return "governance";
  }
  if (text.includes("str") || text.includes("sar") || text.includes("filing") || text.includes("goaml")) {
    return "str_sar";
  }
  if (text.includes("pep") || text.includes("foreign pep") || text.includes("edd")) {
    return "pep";
  }
  if (text.includes("partner") || text.includes("rfi")) {
    return "partner";
  }
  return "standard";
}

export function approverContact(role: ApproverRole): ApproverContact {
  return APPROVER_DIRECTORY[role];
}

export function allNotifyOptions(
  perimeter: CompliancePerimeter,
  category: DecisionCategory,
): ApproverContact[] {
  const rule = approvalRule(perimeter, category);
  const roles = new Set<ApproverRole>([...rule.notifyRoles, rule.primaryRole]);
  return [...roles].map((r) => approverContact(r));
}
