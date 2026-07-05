import { useEffect, useMemo, useState } from "react";
import { X, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { usePerimeter } from "../../../context/PerimeterContext";
import { useAuth } from "../../../auth/AuthProvider";
import { getPlatformUser } from "../../../lib/authSession";
import { approverContact, type ApproverRole } from "../../../config/approvalRouting";
import type { DecisionRow } from "../../../lib/executiveDashboard";
import {
  buildApprovalMailto,
  currentUserCanPrimaryApprove,
  formatApprovalEmailBody,
  submitApprovalNotification,
  type ApprovalAction,
  type ApprovalSubmission,
} from "../../../lib/approvalNotify";

type Props = {
  row: DecisionRow | null;
  onClose: () => void;
  onSubmitted?: (submission: ApprovalSubmission) => void;
};

export default function DecisionApprovalModal({ row, onClose, onSubmitted }: Props) {
  const { perimeter } = usePerimeter();
  const { user, isOidc } = useAuth();
  const devUser = getPlatformUser();
  const submitterEmail = isOidc ? (user?.email ?? "") : devUser.email;

  const notifyOptions = useMemo(() => {
    if (!row) return [];
    const roles = new Set<ApproverRole>([...row.notifyRoles, ...row.defaultNotifyRoles]);
    return [...roles].map((r) => approverContact(r));
  }, [row]);

  const [selectedNotify, setSelectedNotify] = useState<ApproverRole[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ApprovalSubmission | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (row) setSelectedNotify([...row.defaultNotifyRoles]);
  }, [row]);

  if (!row) return null;

  const canPrimary = currentUserCanPrimaryApprove(submitterEmail, row.primaryApproverRole);
  const primaryContact = approverContact(row.primaryApproverRole);

  function toggleRole(role: ApproverRole) {
    setSelectedNotify((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  async function handleAction(action: ApprovalAction) {
    setBusy(true);
    setFeedback(null);
    try {
      const submission = await submitApprovalNotification({
        decisionId: row!.id,
        perimeter,
        category: row!.category,
        action,
        entity: row!.entity,
        reason: row!.reason,
        notifyRoles: selectedNotify,
        submittedBy: submitterEmail,
      });
      setResult(submission);
      onSubmitted?.(submission);

      const queued = submission.recipients.filter((r) => r.status === "queued");
      const skipped = submission.recipients.filter((r) => r.status === "skipped_no_email");

      if (queued.length === 0 && skipped.length > 0) {
        setFeedback(
          `Decision recorded. ${skipped.length} approver(s) have no email yet — add them in approvalRouting.ts.`,
        );
      } else if (queued.length > 0) {
        setFeedback(`${action} recorded · ${queued.length} notification(s) queued.`);
        const body = formatApprovalEmailBody(submission);
        const subject = `[Mal FinCrime] ${action.toUpperCase()} — ${row!.entity}`;
        for (const r of queued) {
          const mailto = buildApprovalMailto(r, subject, body);
          if (mailto) window.open(mailto, "_blank");
        }
      } else {
        setFeedback(`${action} recorded.`);
      }
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="bg-panel border border-line rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-labelledby="approval-modal-title"
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-line">
          <div>
            <h3 id="approval-modal-title" className="m-0 text-base font-display">
              Decision · {row.entity}
            </h3>
            <p className="text-[11px] text-muted mt-1 mb-0">{row.reason}</p>
          </div>
          <button type="button" className="btn-ghost border-none p-1 cursor-pointer" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="rounded-xl border border-line bg-panel2/50 p-3">
            <div className="text-[10px] uppercase tracking-wide text-faint font-semibold mb-1">
              Primary approver
            </div>
            <div className="text-sm font-semibold text-ink">{row.primaryApproverLabel}</div>
            <div className="text-[11px] text-muted mt-1">
              {primaryContact.email || "Email not configured yet"}
            </div>
            <div className="text-[10px] text-faint mt-2">{row.routingSummary}</div>
            {!canPrimary && (
              <div className="text-[11px] text-med mt-2 font-medium">
                You are submitting for sign-off — primary approver will be notified.
              </div>
            )}
          </div>

          {notifyOptions.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-faint font-semibold mb-2">
                Also notify (tick to send when emails are configured)
              </div>
              <ul className="space-y-2 m-0 p-0 list-none">
                {notifyOptions.map((contact) => {
                  const checked = selectedNotify.includes(contact.role);
                  const hasEmail = Boolean(contact.email.trim());
                  return (
                    <li key={contact.role}>
                      <label className="flex items-start gap-2.5 cursor-pointer text-[12px]">
                        <input
                          type="checkbox"
                          className="mt-0.5 accent-[#A953DF]"
                          checked={checked}
                          onChange={() => toggleRole(contact.role)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="font-semibold text-ink">{contact.label}</span>
                          {hasEmail ? (
                            <span className="block text-[10px] text-muted mono">{contact.email}</span>
                          ) : (
                            <span className="block text-[10px] text-med">Email pending — logic will queue when added</span>
                          )}
                        </span>
                        {hasEmail ? (
                          <Mail size={14} className="text-faint shrink-0 mt-0.5" aria-hidden />
                        ) : (
                          <AlertCircle size={14} className="text-med shrink-0 mt-0.5" aria-hidden />
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {result && (
            <div className="rounded-lg border border-low/30 bg-low/10 p-3 text-[11px]">
              <div className="flex items-center gap-2 text-low font-semibold mb-1">
                <CheckCircle2 size={14} /> Submitted
              </div>
              {result.recipients.map((r) => (
                <div key={r.role} className="text-muted">
                  {r.label}: {r.status === "queued" ? `queued → ${r.email}` : "skipped (no email)"}
                </div>
              ))}
            </div>
          )}

          {feedback && <p className="text-[11px] text-muted m-0">{feedback}</p>}
        </div>

        <div className="flex flex-wrap gap-2 px-5 py-4 border-t border-line">
          <button
            type="button"
            className="btn text-[12px] py-2"
            disabled={busy || Boolean(result)}
            onClick={() => void handleAction("approve")}
          >
            {canPrimary ? "Approve" : "Submit approval"}
          </button>
          <button
            type="button"
            className="btn-ghost btn text-[12px] py-2"
            disabled={busy || Boolean(result)}
            onClick={() => void handleAction("reject")}
          >
            Reject
          </button>
          {!canPrimary && (
            <button
              type="button"
              className="btn-ghost btn text-[12px] py-2"
              disabled={busy || Boolean(result)}
              onClick={() => void handleAction("escalate")}
            >
              Escalate to {row.primaryApproverLabel.split("(")[0].trim()}
            </button>
          )}
          <button type="button" className="btn-ghost btn text-[12px] py-2 ml-auto" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
