import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { WEBHOOK_SECURITY } from "../../../src/config/partnerIntegration";

export function verifyOscilarWebhook(req: Request, rawBody: string): boolean {
  const secret = process.env.OSCILAR_WEBHOOK_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const sig = req.headers[WEBHOOK_SECURITY.signatureHeader.oscilar] as string | undefined;
  if (!sig) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(sig.replace(/^sha256=/, "")));
  } catch {
    return false;
  }
}

export function isOscilarReplay(timestampIso: string | undefined): boolean {
  if (!timestampIso) return false;
  const ts = new Date(timestampIso).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts > WEBHOOK_SECURITY.replayWindowMs;
}
