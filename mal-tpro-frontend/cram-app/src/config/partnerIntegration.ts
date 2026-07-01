/**
 * Partner integration — Phase 0 locked decisions (machine-readable).
 * Source: docs/19-PARTNER-INTEGRATION-PHASE0-SIGNOFF.md
 */

export const PARTNER_INTEGRATION_VERSION = "1.0.0";
export const PHASE0_COMPLETE = true;

export type LicenseRegion = "UAE" | "US";

export const SCREENING_AUTHORITY = {
  sanctions: "vital4",
  pep: "vital4",
  adverse: "vital4",
  watchlist: "vital4",
  identity: "shuftipro",
  kyb: "aiprise",
  transactionMonitoring: "oscilar",
  /** Oscilar txn screening never writes CRAM fields — mirror to Vital4 only */
  oscilarTxnScreeningMirror: "vital4",
  shuftiAmlIgnored: true,
} as const;

export const WEBHOOK_SECURITY = {
  signatureHeader: {
    vital4: "x-vital4-signature",
    shuftipro: "x-shufti-signature",
    aiprise: "x-aiprise-signature",
    oscilar: "x-oscilar-signature",
  },
  replayWindowMs: 5 * 60 * 1000,
  idempotencyField: "event_id",
} as const;

export const SCREENING_SLA = {
  potentialMatchHours: 4,
  pendingHours: 48,
  sanctionsTrueMatch: "immediate",
  tmCritical: "immediate",
  tmHigh: "same_day",
} as const;

export const AIPRISE_JURISDICTIONS = [
  { code: "AE", country: "United Arab Emirates" },
  { code: "EG", country: "Egypt" },
  { code: "PK", country: "Pakistan" },
  { code: "TR", country: "Turkey" },
  { code: "SG", country: "Singapore" },
  { code: "MY", country: "Malaysia" },
  { code: "PH", country: "Philippines" },
  { code: "MA", country: "Morocco" },
  { code: "BD", country: "Bangladesh" },
  { code: "ID", country: "Indonesia" },
] as const;

export const FIU_ROUTING = {
  UAE: { system: "goAML", regulator: "UAE FIU" },
  US: { system: "FinCEN_BSA_EFILE", regulator: "FinCEN" },
} as const;

export const REGION_WEBHOOK_BASE = {
  UAE: "https://api.cram.mal.ae/webhooks",
  US: "https://api-us.cram.mal.com/webhooks",
} as const;

export function vendorSubjectId(vendor: "shufti" | "vital4" | "aiprise" | "oscilar", customerId: string, ref: string): string {
  const prefix = { shufti: "SP", vital4: "V4", aiprise: "AP", oscilar: "OS" }[vendor];
  return `${prefix}-${customerId}-${ref}`;
}
