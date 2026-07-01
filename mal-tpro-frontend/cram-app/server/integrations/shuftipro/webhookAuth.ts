import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { WEBHOOK_SECURITY } from "../../../src/config/partnerIntegration";

export function verifyShuftiWebhook(req: Request, rawBody: string): boolean {
  const secret = process.env.SHUFTIPRO_WEBHOOK_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const sig = req.headers[WEBHOOK_SECURITY.signatureHeader.shuftipro] as string | undefined;
  if (!sig) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(sig.replace(/^sha256=/, "")));
  } catch {
    return false;
  }
}
