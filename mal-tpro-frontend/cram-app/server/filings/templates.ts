import templateData from "../../src/data/reporting_templates.json";
import {
  buildFilingDocument,
  filingTypeForReport,
  reportTypeForFiu,
  templateIdForReport,
  type FilingReportType,
} from "../../src/lib/filingDraftDocument";
import { defaultFiuForLicenseRegion } from "../../src/config/fiuRegistry";
import type { InvestigationCaseRecord } from "../investigations/types";
import type { FilingDraftBody } from "./types";

type ReportTemplate = {
  id: string;
  title: string;
  body: string;
  checklist?: string[];
};

const TEMPLATES = templateData.templates as ReportTemplate[];

export function getReportTemplate(templateId: string): ReportTemplate | null {
  return TEMPLATES.find((t) => t.id === templateId) ?? null;
}

export function selectTemplateForCase(c: InvestigationCaseRecord): {
  templateId: string;
  filingType: ReturnType<typeof filingTypeForReport>;
  title: string;
  reportType: FilingReportType;
  fiuId: "UAE" | "US";
  hasExecutedTxn: boolean;
} {
  const meta = (c.metadata ?? {}) as Record<string, unknown>;
  const fiuId = defaultFiuForLicenseRegion(String(meta.licenseRegion ?? "UAE"));
  const attempted = meta.attempted === true || meta.blocked === true;
  const hasExecutedTxn = !attempted && meta.amount != null && meta.amount !== "";
  const reportType = reportTypeForFiu(fiuId, hasExecutedTxn);
  const templateId = templateIdForReport(reportType);
  const t = getReportTemplate(templateId);

  return {
    templateId,
    filingType: filingTypeForReport(reportType),
    title: t?.title ?? "Filing draft",
    reportType,
    fiuId,
    hasExecutedTxn,
  };
}

export function buildDraftBody(
  c: InvestigationCaseRecord,
  templateId: string,
  dispositionNotes?: string,
): FilingDraftBody {
  const sel = selectTemplateForCase(c);
  const evidenceLines = (c.evidence ?? []).map(
    (e) => `${e.label}${e.detail ? `: ${e.detail}` : ""}`,
  );

  const doc = buildFilingDocument({
    templateId: templateId || sel.templateId,
    reportType: sel.reportType,
    fiuId: sel.fiuId,
    caseNumber: c.caseNumber,
    customerName: c.customerName,
    customerId: c.customerId,
    title: c.title,
    summary: c.summary,
    ruleId: c.ruleId,
    ruleName: c.ruleName,
    craRating: c.craRating,
    dispositionNotes,
    evidenceLines,
    metadata: (c.metadata as Record<string, unknown>) ?? {},
    checklist: getReportTemplate(templateId || sel.templateId)?.checklist,
  });

  return doc as FilingDraftBody;
}

/** @deprecated legacy flat render — use buildDraftBody */
export function buildPlaceholderMap(
  c: InvestigationCaseRecord,
  dispositionNotes?: string,
): Record<string, string> {
  const body = buildDraftBody(c, selectTemplateForCase(c).templateId, dispositionNotes);
  if (body.version === 2 && "sections" in body) {
    return Object.fromEntries(body.sections.map((s) => [s.id, s.value]));
  }
  return {};
}

export function renderTemplateBody(_templateBody: string, placeholders: Record<string, string>): string {
  return _templateBody.replace(/\{\{(\w+)\}\}/g, (_, key: string) => placeholders[key] ?? `{{${key}}}`);
}
