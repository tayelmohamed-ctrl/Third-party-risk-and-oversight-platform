/**
 * Production regulatory change notifications — Slack + email to Head of Compliance.
 */
import { appendAudit } from "../db/auditStore";

export interface RegulatoryChangeAlert {
  runId: string;
  changedCount: number;
  changedSources: { name: string; url: string; channel: string }[];
  at: string;
}

const DEFAULT_TO = "walid.elsheikha@mal.ae";

export async function notifyRegulatoryChanges(alert: RegulatoryChangeAlert): Promise<{
  slack: boolean;
  email: boolean;
  logged: boolean;
}> {
  if (alert.changedCount <= 0) {
    return { slack: false, email: false, logged: false };
  }

  const to = process.env.REG_ALERT_EMAIL_TO ?? DEFAULT_TO;
  const from = process.env.REG_ALERT_EMAIL_FROM ?? "compliance@mal.ae";
  const subject = `[Mal FinCrime OS] Sayed detected ${alert.changedCount} regulatory source change(s)`;
  const body = formatAlertBody(alert);

  let slack = false;
  let email = false;

  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: subject,
          blocks: [
            { type: "header", text: { type: "plain_text", text: "Sayed — Regulatory change detected" } },
            { type: "section", text: { type: "mrkdwn", text: body.replace(/\n/g, "\n") } },
            { type: "context", elements: [{ type: "mrkdwn", text: `Notify: *${to}* · Run \`${alert.runId}\`` }] },
          ],
        }),
      });
      slack = res.ok;
    } catch {
      slack = false;
    }
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: [to], subject, text: body }),
      });
      email = res.ok;
    } catch {
      email = false;
    }
  }

  await appendAudit({
    actor: "sayed-regulatory-monitor",
    action: "regulatory.alert_sent",
    entity: "notification",
    entityId: alert.runId,
    detail: `to=${to} slack=${slack} email=${email} changed=${alert.changedCount}`,
  });

  if (!slack && !email) {
    console.info(`[Sayed reg monitor] ${subject}\n${body}`);
  }

  return { slack, email, logged: true };
}

function formatAlertBody(alert: RegulatoryChangeAlert): string {
  const lines = [
    `Sayed's weekly regulatory source watch detected ${alert.changedCount} change(s) at ${alert.at}.`,
    "",
    "Changed sources:",
    ...alert.changedSources.map((s) => `• ${s.name} (${s.channel})\n  ${s.url}`),
    "",
    "Action required (Head of Compliance):",
    "1. Review the source publication",
    "2. Update Google Drive obligation register (folder 01)",
    "3. Propose CRAM mapping changes via maker-checker",
    "",
    "Open: Mal FinCrime OS → Regulatory Management",
  ];
  return lines.join("\n");
}
