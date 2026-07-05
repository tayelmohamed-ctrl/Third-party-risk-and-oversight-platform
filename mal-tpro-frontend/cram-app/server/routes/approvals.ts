import type { Express, Request, Response } from "express";
import { appendAudit } from "../db/auditStore";
import type { ApproverRole, DecisionCategory } from "../../src/config/approvalRouting";
import type { CompliancePerimeter } from "../../src/config/perimeters";

export interface ApprovalNotifyBody {
  decisionId: string;
  perimeter: CompliancePerimeter;
  category: DecisionCategory;
  action: "approve" | "reject" | "escalate";
  entity: string;
  reason: string;
  primaryRole: ApproverRole;
  notifyRoles: ApproverRole[];
  recipients: { role: ApproverRole; email: string; status: string }[];
}

export function registerApprovalRoutes(app: Express) {
  app.post("/api/v1/crr/approvals/notify", async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const body = req.body as ApprovalNotifyBody;
    if (!body?.decisionId || !body?.perimeter || !body?.action) {
      res.status(400).json({ error: "decisionId, perimeter, action required" });
      return;
    }

    const queued = (body.recipients ?? []).filter((r) => r.email?.trim());
    const skipped = (body.recipients ?? []).filter((r) => !r.email?.trim());

    await appendAudit({
      actor: req.user.email,
      action: `approval.${body.action}`,
      entity: "executive_decision",
      entityId: body.decisionId,
      detail: [
        `Perimeter ${body.perimeter}`,
        body.entity,
        body.reason,
        `Primary ${body.primaryRole}`,
        `Notify ${body.notifyRoles?.join(", ") || "—"}`,
        `Queued ${queued.length} · Skipped ${skipped.length} (no email)`,
      ].join(" · "),
      after: body.action,
    });

    res.json({
      ok: true,
      decisionId: body.decisionId,
      queued: queued.map((r) => ({ role: r.role, email: r.email, status: "queued" as const })),
      skipped: skipped.map((r) => ({ role: r.role, email: "", status: "skipped_no_email" as const })),
      message:
        queued.length > 0
          ? `${queued.length} notification(s) queued for delivery when email transport is configured.`
          : "Recorded — add approver emails in approvalRouting.ts to enable notifications.",
    });
  });

  app.get("/api/v1/crr/approvals/directory", async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const { APPROVER_DIRECTORY } = await import("../../src/config/approvalRouting");
    res.json({ directory: APPROVER_DIRECTORY });
  });
}
