import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { WEBHOOK_SECURITY } from "../../../src/config/partnerIntegration";

export function verifyVital4Webhook(req: Request, rawBody: string): boolean {
  const secret = process.env.VITAL4_WEBHOOK_SECRET;
  if (!secret) {
    // Dev: allow unsigned when secret not configured
    return process.env.NODE_ENV !== "production";
  }

  const sig = req.headers[WEBHOOK_SECURITY.signatureHeader.vital4] as string | undefined;
  if (!sig) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = sig.replace(/^sha256=/, "");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}

export function isReplay(timestampIso: string | undefined): boolean {
  if (!timestampIso) return false;
  const ts = new Date(timestampIso).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts > WEBHOOK_SECURITY.replayWindowMs;
}
