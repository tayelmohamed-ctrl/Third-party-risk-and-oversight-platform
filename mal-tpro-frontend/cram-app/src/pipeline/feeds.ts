// Mal FinCrime OS — trigger-pipeline feed contracts (fix for "no real trigger pipeline").
// A real feed (screening vendor, sanctions-list service, goAML, transaction monitoring,
// KYC/CRM) is connected by implementing FeedAdapter — nothing else changes downstream.
import type { Trigger } from "../engine/rerating";

export type FeedSource =
  | "adverse-media"          // screening / negative-news vendor
  | "sanctions-list"         // OFAC/UN/UAE/EU list refresh service
  | "sar-goaml"              // SAR/STR filing system (Jana / goAML)
  | "transaction-monitoring" // TM scenario alerts
  | "kyc-crm";               // onboarding / CRM (ownership, PEP changes)

export type FeedKind =
  | "adverse_media" | "sanctions_list" | "sar_filed"
  | "transaction_alert" | "ownership_change" | "pep_change";

export interface FeedEvent {
  id: string;                 // stable id for idempotency / dedupe
  source: FeedSource;
  kind: FeedKind;
  customerId: string;         // resolved key (real adapters map vendor id -> customerId)
  customerName?: string;
  at: string;                 // ISO timestamp
  severity?: "low" | "medium" | "high" | "critical";
  payload: Record<string, string | number>; // confidence, listName, amount, ref…
  headline: string;           // human-readable summary
}

export const KIND_TO_TRIGGER: Record<FeedKind, Trigger> = {
  adverse_media: "ADVERSE_MEDIA",
  sanctions_list: "SANCTIONS_LIST_UPDATE",
  sar_filed: "SAR_FILED",
  transaction_alert: "TRANSACTION_ANOMALY",
  ownership_change: "OWNERSHIP_CHANGE",
  pep_change: "PEP_STATUS_CHANGE",
};

export const SOURCE_LABEL: Record<FeedSource, string> = {
  "adverse-media": "Adverse-media / negative-news vendor",
  "sanctions-list": "Sanctions/PEP list service (OFAC·UN·UAE·EU)",
  "sar-goaml": "SAR/STR filing system (goAML)",
  "transaction-monitoring": "Transaction-monitoring alerts",
  "kyc-crm": "KYC / CRM (ownership · PEP)",
};

/**
 * Implement this once per real feed to connect it. `subscribe` pushes events as they
 * arrive (webhook/stream/poll) and returns an unsubscribe function. The pipeline
 * (triggerEngine.processEvent) handles matching, thresholds, dedupe and re-rating.
 */
export interface FeedAdapter {
  source: FeedSource;
  label: string;
  subscribe(handler: (e: FeedEvent) => void): () => void;
}
