import {
  approverContact,
  approvalRule,
  type ApproverRole,
  type DecisionCategory,
} from "../config/approvalRouting";
import type { CompliancePerimeter } from "../config/perimeters";

export type ApprovalAction = "approve" | "reject" | "escalate";

export interface ApprovalNotifyRecipient {
  role: ApproverRole;
  label: string;
  email: string;
  status: "queued" | "skipped_no_email" | "mailto_ready";
}

export interface ApprovalSubmission {
  decisionId: string;
  perimeter: CompliancePerimeter;
  category: DecisionCategory;
  action: ApprovalAction;
  entity: string;
  reason: string;
  primaryRole: ApproverRole;
  notifiedRoles: ApproverRole[];
  recipients: ApprovalNotifyRecipient[];
  submittedAt: string;
  submittedBy: string;
}

const STORAGE_KEY = "mal-approval-notify-queue";

export function buildNotifyRecipients(roles: ApproverRole[]): ApprovalNotifyRecipient[] {
  return roles.map((role) => {
    const contact = approverContact(role);
    const status = contact.email.trim()
      ? ("queued" as const)
      : ("skipped_no_email" as const);
    return {
      role,
      label: contact.label,
      email: contact.email.trim(),
      status,
    };
  });
}

export function buildApprovalMailto(
  recipient: ApprovalNotifyRecipient,
  subject: string,
  body: string,
): string | null {
  if (!recipient.email) return null;
  const params = new URLSearchParams({
    subject,
    body,
  });
  return `mailto:${encodeURIComponent(recipient.email)}?${params.toString()}`;
}

export function formatApprovalEmailBody(submission: Omit<ApprovalSubmission, "recipients">): string {
  const rule = approvalRule(submission.perimeter, submission.category);
  return [
    "Mal FinCrime OS — approval notification",
    "",
    `Perimeter: ${submission.perimeter === "global_account" ? "Global Account" : "MAL Bank"}`,
    `Decision: ${submission.decisionId}`,
    `Entity: ${submission.entity}`,
    `Reason: ${submission.reason}`,
    `Action requested: ${submission.action}`,
    `Primary approver: ${approverContact(submission.primaryRole).label}`,
    `Routing: ${rule.summary}`,
    "",
    "Open the Executive Dashboard or linked case to review.",
    "",
    `Submitted by: ${submission.submittedBy}`,
    `At: ${submission.submittedAt}`,
  ].join("\n");
}

export function persistApprovalSubmission(submission: ApprovalSubmission): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: ApprovalSubmission[] = raw ? (JSON.parse(raw) as ApprovalSubmission[]) : [];
    list.unshift(submission);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 100)));
  } catch {
    /* ignore quota */
  }
}

export function listPendingApprovalSubmissions(): ApprovalSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ApprovalSubmission[]) : [];
  } catch {
    return [];
  }
}

export async function submitApprovalNotification(input: {
  decisionId: string;
  perimeter: CompliancePerimeter;
  category: DecisionCategory;
  action: ApprovalAction;
  entity: string;
  reason: string;
  notifyRoles: ApproverRole[];
  submittedBy: string;
}): Promise<ApprovalSubmission> {
  const rule = approvalRule(input.perimeter, input.category);
  const recipients = buildNotifyRecipients(input.notifyRoles);

  const submission: ApprovalSubmission = {
    decisionId: input.decisionId,
    perimeter: input.perimeter,
    category: input.category,
    action: input.action,
    entity: input.entity,
    reason: input.reason,
    primaryRole: rule.primaryRole,
    notifiedRoles: input.notifyRoles,
    recipients,
    submittedAt: new Date().toISOString(),
    submittedBy: input.submittedBy,
  };

  persistApprovalSubmission(submission);

  try {
    const { apiQueueApprovalNotify } = await import("./api");
    await apiQueueApprovalNotify({
      decisionId: submission.decisionId,
      perimeter: submission.perimeter,
      category: submission.category,
      action: submission.action,
      entity: submission.entity,
      reason: submission.reason,
      primaryRole: submission.primaryRole,
      notifyRoles: submission.notifiedRoles,
      recipients: submission.recipients.map((r) => ({
        role: r.role,
        email: r.email,
        status: r.status,
      })),
    });
  } catch {
    /* offline / API down — local queue still holds the record */
  }

  return submission;
}

export function currentUserCanPrimaryApprove(
  userEmail: string,
  primaryRole: ApproverRole,
): boolean {
  const primary = approverContact(primaryRole);
  if (!primary.email) return primaryRole === "primary_user";
  return userEmail.toLowerCase() === primary.email.toLowerCase();
}
