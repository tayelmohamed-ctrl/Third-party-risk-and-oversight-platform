import { createHash } from "node:crypto";
import { loadMonitorState, saveMonitorState } from "./state";

/** Parse RSS/Atom — extract stable item fingerprints (guid or link+title). */
export function parseRssFingerprints(xml: string): string[] {
  const items: string[] = [];
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
  for (const block of itemBlocks) {
    const guid = block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)?.[1]?.trim();
    const link = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim()
      ?? block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1]?.trim();
    const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim().replace(/<!\[CDATA\[|\]\]>/g, "");
    const fp = guid ?? (link && title ? `${link}|${title}` : link ?? title);
    if (fp) items.push(fp.slice(0, 500));
  }
  return items;
}

export function hashFingerprints(fps: string[]): string {
  return createHash("sha256").update(fps.sort().join("\n")).digest("hex").slice(0, 16);
}

export async function checkRssFeed(feedUrl: string): Promise<{
  hash?: string;
  newItems?: string[];
  error?: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(feedUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Mal-FinCrime-OS-Sayed-RSS/1.0" },
    });
    if (!res.ok) return { error: `RSS HTTP ${res.status}` };
    const xml = await res.text();
    const fps = parseRssFingerprints(xml);
    if (!fps.length) return { error: "RSS parse: no items" };
    const hash = hashFingerprints(fps);
    const state = loadMonitorState();
    const prevKey = `rss:${feedUrl}`;
    const prev = state.sourceHashes[prevKey]?.hash;
    const newItems = prev && prev !== hash ? fps.slice(0, 5) : undefined;
    state.sourceHashes[prevKey] = { hash, checkedAt: new Date().toISOString() };
    saveMonitorState(state);
    return { hash, newItems };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timeout);
  }
}
