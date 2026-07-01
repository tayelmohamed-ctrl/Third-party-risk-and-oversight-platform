import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RegulatoryMonitorRun } from "./monitorTypes";

const __dir = dirname(fileURLToPath(import.meta.url));
export const STATE_PATH = join(__dir, "../../data/regulatory_monitor_state.json");

export interface RegulatoryMonitorState {
  version: 1;
  lastRunAt: string | null;
  lastRunId: string | null;
  nextScheduledAt: string | null;
  sourceHashes: Record<string, { hash: string; checkedAt: string }>;
  runs: RegulatoryMonitorRun[];
}

export function emptyState(): RegulatoryMonitorState {
  return {
    version: 1,
    lastRunAt: null,
    lastRunId: null,
    nextScheduledAt: null,
    sourceHashes: {},
    runs: [],
  };
}

export function loadMonitorState(): RegulatoryMonitorState {
  if (!existsSync(STATE_PATH)) return emptyState();
  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf8")) as RegulatoryMonitorState;
  } catch {
    return emptyState();
  }
}

export function saveMonitorState(state: RegulatoryMonitorState): void {
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}
