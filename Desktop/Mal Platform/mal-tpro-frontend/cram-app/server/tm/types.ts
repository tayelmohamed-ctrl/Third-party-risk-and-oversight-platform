/** Oscilar TM / txn screening — Phase 2 types. */
import type { LicenseRegion } from "../../src/config/partnerIntegration";

export type OscilarAlertType = "transaction_monitoring" | "transaction_screening" | "both";
export type OscilarSeverity = "low" | "medium" | "high" | "critical";
export type TmAlertStatus = "open" | "mirrored" | "dispositioned" | "closed" | "feed_processed";

export interface OscilarSubject {
  type?: "individual" | "entity";
  full_name?: string;
  nationality?: string;
  country?: string;
}

export interface OscilarWebhookPayload {
  event_id: string;
  event_type: string;
  alert_id: string;
  case_id?: string;
  customer_id?: string;
  customer_ref?: string;
  customer_name?: string;
  timestamp?: string;
  alert_type?: OscilarAlertType | string;
  severity?: OscilarSeverity | string;
  rule_id?: string;
  rule_name?: string;
  channel?: "transfer" | "card" | string;
  amount?: number;
  currency?: string;
  payment_ref?: string;
  list_hit?: boolean;
  sanctions_signal?: string;
  pep_signal?: string;
  watchlist_signal?: string;
  license_region?: LicenseRegion;
  subject?: OscilarSubject;
  [key: string]: unknown;
}

export interface NormalizedOscilarAlert {
  eventId: string;
  alertId: string;
  caseId: string | null;
  customerId: string;
  customerName: string;
  alertType: OscilarAlertType;
  severity: OscilarSeverity;
  ruleId: string | null;
  ruleName: string | null;
  channel: string | null;
  amount: number | null;
  currency: string | null;
  paymentRef: string | null;
  licenseRegion: LicenseRegion;
  listHit: boolean;
  requiresVital4Mirror: boolean;
  subject: OscilarSubject;
  headline: string;
}

export interface TmAlertRecord {
  id: string;
  oscilarAlertId: string;
  oscilarCaseId: string | null;
  customerId: string;
  customerName: string;
  alertType: OscilarAlertType;
  severity: OscilarSeverity;
  ruleId: string | null;
  ruleName: string | null;
  channel: string | null;
  amount: number | null;
  currency: string | null;
  licenseRegion: LicenseRegion;
  status: TmAlertStatus;
  listHit: boolean;
  vital4CaseId: string | null;
  cramScreeningId: string | null;
  feedEventId: string | null;
  feedOutcome: string | null;
  paymentRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SimulateOscilarAlertRequest {
  customerId: string;
  customerName: string;
  licenseRegion?: LicenseRegion;
  alertType?: OscilarAlertType;
  severity?: OscilarSeverity;
  ruleId?: string;
  ruleName?: string;
  channel?: "transfer" | "card";
  amount?: number;
  currency?: string;
  listHit?: boolean;
  paymentRef?: string;
}
