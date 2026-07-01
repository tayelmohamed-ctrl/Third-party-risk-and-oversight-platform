// Mal FinCrime OS — FEED SIMULATOR (development only).
import type { Assessment } from "../engine/rerating";
import type { FeedEvent, FeedKind, FeedSource } from "./feeds";

function uid(): string {
  try { return crypto.randomUUID(); } catch { return "e_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
}
const SOURCE_OF: Record<FeedKind, FeedSource> = {
  adverse_media: "adverse-media",
  sanctions_list: "sanctions-list",
  sar_filed: "sar-goaml",
  transaction_alert: "transaction-monitoring",
  ownership_change: "kyc-crm",
  pep_change: "kyc-crm",
};
const WEIGHTED: FeedKind[] = [
  "adverse_media", "adverse_media", "adverse_media",
  "transaction_alert", "transaction_alert", "transaction_alert",
  "sanctions_list", "pep_change", "ownership_change", "sar_filed",
];
function pick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }

export function makeEvent(kind: FeedKind, customerId: string, customerName?: string): FeedEvent {
  const base = { id: uid(), source: SOURCE_OF[kind], kind, customerId, customerName, at: new Date().toISOString() };
  switch (kind) {
    case "adverse_media": {
      const confidence = +(0.3 + Math.random() * 0.65).toFixed(2);
      return { ...base, severity: confidence > 0.7 ? "high" : "medium", payload: { confidence, outlet: pick(["Reuters", "local press", "court filing", "blog"]) }, headline: `Negative news (${(confidence * 100).toFixed(0)}% match): ${pick(["fraud allegation", "ML investigation", "regulatory action", "sanctions evasion claim"])}` };
    }
    case "transaction_alert": {
      const severity = pick(["low", "medium", "high", "high", "critical"] as const);
      const amount = pick([95000, 250000, 480000, 1200000]);
      return { ...base, severity, payload: { amount, scenario: pick(["round-amount layering", "rapid pass-through", "structuring", "new-beneficiary velocity"]) }, headline: `TM alert (${severity}): ${pick(["round-amount layering", "rapid pass-through", "structuring"])} AED ${amount.toLocaleString()}` };
    }
    case "sanctions_list":
      return { ...base, severity: "critical", payload: { listName: pick(["OFAC SDN", "UN Consolidated", "UAE Local Terrorist List", "EU Consolidated"]) }, headline: `Sanctions/PEP list refresh — new match on ${pick(["OFAC SDN", "UN Consolidated", "UAE Local List"])}` };
    case "pep_change":
      return { ...base, severity: "high", payload: { role: pick(["foreign government official", "state-owned enterprise board", "international org official"]) }, headline: `KYC update — identified as Foreign PEP` };
    case "ownership_change":
      return { ...base, severity: "medium", payload: { change: pick(["new UBO > 25%", "director change", "control restructure"]) }, headline: `Ownership/UBO change filed — re-verification required` };
    case "sar_filed":
      return { ...base, severity: "high", payload: { ref: "STR-" + Math.floor(Math.random() * 90000 + 10000) }, headline: `SAR/STR filed on customer` };
  }
}

export function randomEvent(customers: Assessment[]): FeedEvent | null {
  if (!customers.length) return null;
  const c = pick(customers);
  return makeEvent(pick(WEIGHTED), c.customerId, c.customerName);
}

/** Simulator with the same shape as a FeedAdapter subscription. */
export function createFeedSimulator(getCustomers: () => Assessment[], intervalMs = 3500) {
  const handlers = new Set<(e: FeedEvent) => void>();
  let timer: ReturnType<typeof setInterval> | null = null;
  const fanout = (e: FeedEvent | null) => { if (e) handlers.forEach((h) => h(e)); };
  return {
    label: "Multi-source feed simulator (dev)",
    subscribe(handler: (e: FeedEvent) => void): () => void {
      handlers.add(handler);
      if (!timer) timer = setInterval(() => fanout(randomEvent(getCustomers())), intervalMs);
      return () => { handlers.delete(handler); if (handlers.size === 0 && timer) { clearInterval(timer); timer = null; } };
    },
    emit(kind?: FeedKind, customerId?: string) {
      const customers = getCustomers();
      if (!customers.length) return;
      const c = customerId ? customers.find((x) => x.customerId === customerId) : pick(customers);
      if (!c) return;
      fanout(makeEvent(kind ?? pick(WEIGHTED), c.customerId, c.customerName));
    },
  };
}
