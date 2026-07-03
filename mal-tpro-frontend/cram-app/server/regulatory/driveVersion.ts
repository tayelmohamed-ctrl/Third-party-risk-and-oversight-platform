import { createHash } from "node:crypto";
import { loadMonitorState, saveMonitorState } from "./state";

/**
 * Zenus BaaS addendum version tracking via env or Drive file metadata.
 * Production: set ZENUS_ADDENDUM_DRIVE_FILE_ID + poll Drive API, or bump ZENUS_ADDENDUM_VERSION on partner updates.
 */
export async function checkZenusDriveVersion(): Promise<{
  hash?: string;
  version?: string;
  changed?: boolean;
  error?: string;
}> {
  const version = process.env.ZENUS_ADDENDUM_VERSION ?? "2026-Q2-v1.3";
  const fileId = process.env.ZENUS_ADDENDUM_DRIVE_FILE_ID;
  const driveDocPath = process.env.ZENUS_ADDENDUM_DRIVE_PATH
    ?? "Partners/Zenus/BaaS-Compliance-Addendum";

  let fingerprint = `version:${version}|path:${driveDocPath}`;

  if (fileId) {
    try {
      const res = await fetch(`https://drive.google.com/uc?id=${fileId}&export=download`, {
        method: "HEAD",
        headers: { "User-Agent": "Mal-FinCrime-OS-Sayed-Drive/1.0" },
      });
      const etag = res.headers.get("etag") ?? res.headers.get("last-modified") ?? String(res.status);
      fingerprint = `file:${fileId}|etag:${etag}|version:${version}`;
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }

  const hash = createHash("sha256").update(fingerprint).digest("hex").slice(0, 16);
  const state = loadMonitorState();
  const key = "drive:zenus-addendum";
  const prev = state.sourceHashes[key]?.hash;
  const changed = Boolean(prev && prev !== hash);
  state.sourceHashes[key] = { hash, checkedAt: new Date().toISOString() };
  saveMonitorState(state);

  return { hash, version, changed };
}
