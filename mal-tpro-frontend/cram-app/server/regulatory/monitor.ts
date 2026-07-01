import { createHash } from "node:crypto";
import {
  REGULATORY_SOURCES,
  REGULATORY_RSS_FEEDS,
  SAYED_REGULATORY_MONITOR,
  type RegulatorySource,
} from "../../src/config/regulatorySources";
import { appendAudit } from "../db/auditStore";
import { ingestFeedEvent } from "../pipeline";
import { checkRssFeed } from "./rssMonitor";
import { checkZenusDriveVersion } from "./driveVersion";
import { notifyRegulatoryChanges } from "./notifications";
import { loadMonitorState, saveMonitorState } from "./state";
import type { RegulatoryMonitorRun, SourceCheckResult, SourceCheckStatus } from "./monitorTypes";

export type { RegulatoryMonitorRun, SourceCheckResult, SourceCheckStatus } from "./monitorTypes";

function hashContent(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

async function fetchHttpBackup(source: RegulatorySource): Promise<{ hash?: string; httpStatus?: number; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const method = source.checkMethod === "http-head" ? "HEAD" : "GET";
    const res = await fetch(source.url, {
      method,
      signal: controller.signal,
      headers: { "User-Agent": "Mal-FinCrime-OS-Sayed-RegMonitor/1.0" },
    });
    if (!res.ok) return { httpStatus: res.status, error: `HTTP ${res.status}` };
    if (method === "HEAD") {
      const etag = res.headers.get("etag") ?? res.headers.get("last-modified") ?? String(res.status);
      return { hash: hashContent(etag), httpStatus: res.status };
    }
    const body = await res.text();
    return { hash: hashContent(body.slice(0, 120_000)), httpStatus: res.status };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function runRegulatorySourceCheck(trigger: "scheduled" | "manual" = "scheduled"): Promise<RegulatoryMonitorRun> {
  const state = loadMonitorState();
  const at = new Date();
  const runId = `REG-MON-${at.toISOString().slice(0, 10)}-${Date.now()}`;
  const results: SourceCheckResult[] = [];
  let changed = 0;
  let errors = 0;

  // Tier 1 — RSS primary (CBUAE / FinCEN)
  for (const feed of REGULATORY_RSS_FEEDS) {
    const feedUrl = feed.id === "RSS-CBUAE"
      ? (process.env.REG_RSS_CBUAE ?? feed.url)
      : feed.id === "RSS-FINCEN"
        ? (process.env.REG_RSS_FINCEN ?? feed.url)
        : feed.url;
    const rss = await checkRssFeed(feedUrl);
    let status: SourceCheckStatus = "ok";
    if (rss.error) {
      status = "error";
      errors++;
    } else if (rss.newItems?.length) {
      status = "changed";
      changed++;
    } else if (!state.sourceHashes[`rss:${feedUrl}`]) {
      status = "baseline";
    }
    results.push({
      sourceId: feed.id,
      name: feed.name,
      url: feedUrl,
      status,
      checkedAt: at.toISOString(),
      channel: "rss-primary",
      contentHash: rss.hash,
      error: rss.error,
      regulationIds: feed.regulationIds,
      detail: rss.newItems?.length ? `New RSS items: ${rss.newItems.slice(0, 2).join("; ")}` : undefined,
    });
  }

  // Tier 1b — Zenus Drive version
  const zenus = await checkZenusDriveVersion();
  {
    let status: SourceCheckStatus = zenus.changed ? "changed" : zenus.error ? "error" : "ok";
    if (zenus.error) errors++;
    if (zenus.changed) changed++;
    if (!zenus.error && !state.sourceHashes["drive:zenus-addendum"]) status = "baseline";
    results.push({
      sourceId: "SRC-ZENUS-PARTNER",
      name: "Zenus Bank BaaS compliance addendum",
      url: process.env.ZENUS_ADDENDUM_DRIVE_PATH ?? "Partners/Zenus/BaaS-Compliance-Addendum",
      status,
      checkedAt: at.toISOString(),
      channel: "drive-version",
      contentHash: zenus.hash,
      error: zenus.error,
      regulationIds: ["REG-ZENUS-BAAS", "REG-US-BSA-PROGRAM"],
      detail: zenus.version ? `Version ${zenus.version}` : undefined,
    });
  }

  // Tier 2 — HTTP hash backup for web sources (skip Zenus — handled above)
  for (const source of REGULATORY_SOURCES) {
    if (source.id === "SRC-ZENUS-PARTNER") continue;
    const prev = state.sourceHashes[source.id];
    const fetched = await fetchHttpBackup(source);
    let status: SourceCheckStatus = "ok";

    if (fetched.error || !fetched.hash) {
      status = "error";
      errors++;
    } else if (!prev) {
      status = "baseline";
      state.sourceHashes[source.id] = { hash: fetched.hash, checkedAt: at.toISOString() };
    } else if (prev.hash !== fetched.hash) {
      status = "changed";
      changed++;
      state.sourceHashes[source.id] = { hash: fetched.hash, checkedAt: at.toISOString() };
    }

    results.push({
      sourceId: source.id,
      name: source.name,
      url: source.url,
      status,
      checkedAt: at.toISOString(),
      channel: "http-backup",
      contentHash: fetched.hash,
      previousHash: prev?.hash,
      httpStatus: fetched.httpStatus,
      error: fetched.error,
      regulationIds: source.regulationIds,
    });
  }

  const run: RegulatoryMonitorRun = {
    id: runId,
    at: at.toISOString(),
    agent: "sayed",
    trigger,
    sourcesChecked: results.length,
    changed,
    errors,
    results,
  };

  state.lastRunAt = run.at;
  state.lastRunId = run.id;
  state.runs = [run, ...state.runs].slice(0, 52);
  saveMonitorState(state);

  await appendAudit({
    actor: SAYED_REGULATORY_MONITOR.owner,
    action: "regulatory.source_check",
    entity: "regulatory_monitor",
    entityId: run.id,
    detail: `${run.sourcesChecked} sources · ${run.changed} changed · ${run.errors} errors · RSS primary + HTTP backup`,
  });

  if (changed > 0) {
    const changedResults = results.filter((r) => r.status === "changed");
    const changedNames = changedResults.map((r) => r.name).join("; ");
    await ingestFeedEvent({
      id: run.id,
      source: "kyc-crm",
      kind: "ownership_change",
      customerId: "ENTERPRISE",
      customerName: "Mal FinCrime OS",
      at: run.at,
      severity: "high",
      headline: `Sayed: ${changed} regulatory source(s) changed — ${changedNames}`,
      payload: { runId: run.id, changed: String(changed), agent: "sayed" },
    }).catch(() => undefined);

    run.notifications = await notifyRegulatoryChanges({
      runId: run.id,
      changedCount: changed,
      changedSources: changedResults.map((r) => ({
        name: r.name,
        url: r.url,
        channel: r.channel,
      })),
      at: run.at,
    });
  }

  return run;
}

export function getRegulatoryMonitorStatus() {
  const state = loadMonitorState();
  const lastRun = state.runs[0] ?? null;
  return {
    agent: SAYED_REGULATORY_MONITOR.agent,
    cadence: SAYED_REGULATORY_MONITOR.cadence,
    cronUtc: SAYED_REGULATORY_MONITOR.cronUtc,
    channels: {
      primary: ["RSS (CBUAE, FinCEN)", "Zenus Drive version"],
      backup: ["HTTP content hash"],
      notify: ["Slack webhook", "Email to Head of Compliance"],
    },
    lastRunAt: state.lastRunAt,
    lastRunId: state.lastRunId,
    lastRun,
    sourcesTotal: REGULATORY_SOURCES.length + REGULATORY_RSS_FEEDS.length,
    sourceHashes: state.sourceHashes,
    pendingChanges: lastRun?.changed ?? 0,
    lastErrors: lastRun?.errors ?? 0,
    notifyTo: process.env.REG_ALERT_EMAIL_TO ?? "walid.elsheikha@mal.ae",
  };
}
