/**
 * Corridor typology intelligence store — device-local (localStorage).
 *
 * The team uploads new risk typologies (collected from Slack) into each Global
 * Account corridor on a weekly basis. As typologies accumulate, the corridor's
 * intelligence grows and is read live by:
 *   - the Execution Dashboard corridor board (upload + review), and
 *   - the Transaction Monitoring investigator guide (Corridor guidance #13 and
 *     Country typologies #14).
 *
 * Live updates use useSyncExternalStore so every mounted consumer re-renders on
 * add/remove — including across browser tabs via the `storage` event.
 */
import { useSyncExternalStore } from "react";
import type { TypologyCategory, TypologySeverity } from "../config/globalAccountCorridors";

const STORAGE_KEY = "mal-corridor-typologies";
const CHANGE_EVENT = "mal-corridor-typologies-changed";

export interface CorridorTypology {
  id: string;
  corridorCode: string;      // matches GLOBAL_ACCOUNT_CORRIDORS code
  week: string;              // ISO week, e.g. "2026-W29"
  title: string;
  category: TypologyCategory;
  severity: TypologySeverity;
  description: string;
  indicators: string[];
  oscilar: string[];         // linked / proposed Oscilar rule refs
  source: string;            // default "Slack"
  addedBy: string;
  addedAt: string;           // ISO datetime
}

function read(): CorridorTypology[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CorridorTypology[]) : [];
  } catch {
    return [];
  }
}

// Cached snapshot so useSyncExternalStore's getSnapshot is referentially stable
// between mutations (returning a fresh array every call would loop React).
let snapshot: CorridorTypology[] = read();

function commit(next: CorridorTypology[]) {
  snapshot = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / unavailable */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function loadCorridorTypologies(): CorridorTypology[] {
  return snapshot;
}

export function typologiesForCorridor(code: string): CorridorTypology[] {
  return snapshot.filter((t) => t.corridorCode === code);
}

export function addCorridorTypology(
  entry: Omit<CorridorTypology, "id" | "addedAt">,
): CorridorTypology {
  const created: CorridorTypology = {
    ...entry,
    id: `CTY-${entry.corridorCode}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`,
    addedAt: new Date().toISOString(),
  };
  commit([created, ...snapshot]);
  return created;
}

export function removeCorridorTypology(id: string): void {
  commit(snapshot.filter((t) => t.id !== id));
}

/** Current ISO week string, e.g. "2026-W29". */
export function currentIsoWeek(d: Date = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7; // Mon=1..Sun=7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum); // nearest Thursday
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// ── React binding ───────────────────────────────────────────────────────────
function subscribe(cb: () => void): () => void {
  const onLocal = () => cb();
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      snapshot = read(); // another tab mutated it
      cb();
    }
  };
  window.addEventListener(CHANGE_EVENT, onLocal);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onLocal);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCorridorTypologies(): CorridorTypology[] {
  return useSyncExternalStore(subscribe, loadCorridorTypologies, () => snapshot);
}
