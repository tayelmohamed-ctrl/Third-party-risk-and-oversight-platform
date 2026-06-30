/**
 * Jana Reporting Centre — template catalogue structure.
 * Aligned to Mal CRAM methodology, CBUAE/FATF, FinCEN BSA (US BaaS), and dual FIU routing.
 */
import type { LicenseRegion } from "./partnerIntegration";

export type ReportingArea =
  | "regulatory"
  | "fiu"
  | "management"
  | "operational"
  | "returns"
  | "analytics";

export type ReportJurisdiction = LicenseRegion | "both" | "internal";

export type TemplateFormat = "report" | "email" | "letter" | "return" | "dashboard";

export interface ReportTemplateMeta {
  id: string;
  area: ReportingArea;
  title: string;
  purpose: string;
  trigger: string;
  submittedTo: string;
  jurisdiction: ReportJurisdiction;
  format: TemplateFormat;
  frequency?: string;
  policyRef?: string;
  cramRef?: string;
  tags: string[];
}

export const REPORTING_AREAS: { id: ReportingArea; label: string; description: string }[] = [
  {
    id: "regulatory",
    label: "Regulatory reporting",
    description: "STR/SAR, terrorist property, sanctions, threshold and cross-border reports to FIU and competent authorities.",
  },
  {
    id: "fiu",
    label: "FIU communication",
    description: "Drafts, submitted filings, requests for information, FIU feedback, and status tracking.",
  },
  {
    id: "management",
    label: "Management information",
    description: "Board packs, MLRO reports, executive dashboards, KPI/KRI — internal governance (not filed externally).",
  },
  {
    id: "operational",
    label: "Operational reporting",
    description: "Daily screening, monitoring, KYC, investigations, and case workload MI.",
  },
  {
    id: "returns",
    label: "Regulatory returns",
    description: "Annual AML returns, compliance attestations, prudential regulator submissions (CBUAE / OCC partner bank).",
  },
  {
    id: "analytics",
    label: "Analytics & intelligence",
    description: "Trends, heat maps, typology analysis, and predictive risk analytics for MLRO and board.",
  },
];

export const JURISDICTION_LABEL: Record<ReportJurisdiction, string> = {
  UAE: "UAE · goAML / CBUAE",
  US: "US BaaS · FinCEN",
  both: "Dual jurisdiction",
  internal: "Internal only",
};
