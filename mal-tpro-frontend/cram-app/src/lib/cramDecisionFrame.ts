/**
 * Operational decision framing for CRAM Test Bench — compliance workflow, not just scoring viz.
 */
import type { AssessmentCapture } from "../engine/dataQualityGate";
import type { KycQualityContext, DataQualityVerdict } from "../engine/dataQualityGate";
import type { GoldenThreadResult } from "../engine/goldenThread";
import type { RiskAssessmentSummary } from "../engine/riskExplainability";

export type AgentRecommendedAction = "Approve" | "Review" | "Reject" | "Accept with conditions";
export type HumanDecisionAction = "Approve" | "Reject" | "Accept with conditions";

export type EvidenceStatus = "complete" | "missing" | "warn";

export interface EvidenceCheckItem {
  id: string;
  label: string;
  status: EvidenceStatus;
  detail: string;
  requiredForApprove: boolean;
}

export interface ScoreDriverPlain {
  label: string;
  detail: string;
}

export interface RiskAcceptanceRecord {
  id: string;
  who: string;
  what: string;
  why: string;
  expiryDate: string | null;
  reviewDate: string | null;
  requiredApprovals: string[];
  status: "active" | "expired" | "pending";
}

export interface DecisionFrame {
  recommendedAction: AgentRecommendedAction;
  agentLabel: string;
  actionRationale: string;
  missingEvidence: string[];
  mandatoryEscalations: string[];
  topDrivers: ScoreDriverPlain[];
  scoreReductionTips: string[];
  rationaleTemplate: string;
  evidenceItems: EvidenceCheckItem[];
  riskAcceptance: RiskAcceptanceRecord[];
}

export interface BenchEvidenceInput {
  poaOnFile: boolean;
  deviceIpCaptured: boolean;
  poaAgeMonthsMax?: number;
}

const ID_MAX_AGE_MONTHS = 120;
const POA_MAX_AGE_MONTHS = 12;

function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

function parseDate(s: string): Date | null {
  if (!s?.trim()) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function poaAgeOk(poaIssuedAt: string | undefined, at: Date): boolean {
  if (!poaIssuedAt) return false;
  const issued = parseDate(poaIssuedAt);
  if (!issued) return false;
  return monthsBetween(issued, at) <= POA_MAX_AGE_MONTHS;
}

export function buildEvidenceChecklist(
  capture: AssessmentCapture,
  kyc: KycQualityContext,
  evidence: BenchEvidenceInput,
  at: Date = new Date(),
): EvidenceCheckItem[] {
  const docIssued = parseDate(kyc.documentIssuedAt);
  const docAgeOk = docIssued ? monthsBetween(docIssued, at) <= ID_MAX_AGE_MONTHS : false;
  const screeningTs = kyc.screeningCompletedAt ? parseDate(kyc.screeningCompletedAt) : null;
  const sanctionsDone = capture.sanctions !== "" && capture.sanctions !== undefined;
  const adverseDone = capture.adverse !== "" && capture.adverse !== undefined;

  return [
    {
      id: "poa",
      label: "Proof of address (PoA)",
      status: !evidence.poaOnFile ? "missing" : poaAgeOk(kyc.lastKycRefreshAt, at) ? "complete" : "warn",
      detail: !evidence.poaOnFile
        ? "PoA document not on file"
        : poaAgeOk(kyc.lastKycRefreshAt, at)
          ? `PoA on file · age within ${POA_MAX_AGE_MONTHS}mo policy`
          : "PoA present but age check failed — refresh required",
      requiredForApprove: true,
    },
    {
      id: "id",
      label: "ID verified + document integrity",
      status: !kyc.identityVerified || !kyc.livenessPass
        ? "missing"
        : docAgeOk
          ? "complete"
          : "warn",
      detail: !kyc.identityVerified
        ? "Identity not verified"
        : !kyc.livenessPass
          ? "Liveness check failed or not recorded"
          : !docAgeOk
            ? "Document exceeds max age or issue date missing"
            : `Verified via ${kyc.identitySource || "on-file ID"} · integrity OK`,
      requiredForApprove: true,
    },
    {
      id: "sanctions",
      label: "Sanctions screening",
      status: !sanctionsDone
        ? "missing"
        : capture.sanctions === "Potential Match"
          ? "warn"
          : capture.sanctions === "True Match"
            ? "missing"
            : screeningTs
              ? "complete"
              : "warn",
      detail: !sanctionsDone
        ? "Sanctions result not recorded"
        : capture.sanctions === "True Match"
          ? "True match — relationship blocked"
          : capture.sanctions === "Potential Match"
            ? "Potential match unresolved — hold activation"
            : screeningTs
              ? `Clear · completed ${screeningTs.toISOString().slice(0, 16).replace("T", " ")} UTC`
              : "Clear but screening timestamp missing",
      requiredForApprove: true,
    },
    {
      id: "adverse",
      label: "Adverse media screening",
      status: !adverseDone
        ? "missing"
        : capture.adverse === "True Match"
          ? "warn"
          : screeningTs
            ? "complete"
            : "warn",
      detail: !adverseDone
        ? "Adverse media result not recorded"
        : capture.adverse === "True Match"
          ? "True match — EDD / senior review required"
          : capture.adverse === "Potential"
            ? "Potential hit — analyst disposition required"
            : screeningTs
              ? `Completed · sources logged · ${screeningTs.toISOString().slice(0, 10)}`
              : "Result recorded · timestamp / source log incomplete",
      requiredForApprove: true,
    },
    {
      id: "device_ip",
      label: "Device / IP fingerprint captured",
      status: evidence.deviceIpCaptured ? "complete" : "missing",
      detail: evidence.deviceIpCaptured
        ? "Device ID + IP + geo captured at onboarding / session"
        : "Not captured — required for fraud & geo mismatch checks (Jenny call)",
      requiredForApprove: true,
    },
  ];
}

function deriveRecommendedAction(
  capture: AssessmentCapture,
  dq: DataQualityVerdict,
  gt: GoldenThreadResult | null,
  evidenceItems: EvidenceCheckItem[],
  riskSummary: RiskAssessmentSummary | null,
): { action: AgentRecommendedAction; rationale: string } {
  if (capture.sanctions === "True Match" || gt?.inherentLevel === "Prohibited" || gt?.disposition === "DECLINE_EXIT") {
    return { action: "Reject", rationale: "Prohibited relationship or sanctions true match — exit / no onboarding." };
  }
  if (dq.status !== "READY") {
    return { action: "Review", rationale: "Data quality gate blocked — complete mandatory fields before decision." };
  }
  const missingRequired = evidenceItems.filter((e) => e.requiredForApprove && e.status !== "complete");
  if (missingRequired.length > 0) {
    return {
      action: "Accept with conditions",
      rationale: `${missingRequired.length} evidence item(s) incomplete — conditional acceptance with remediation SLA.`,
    };
  }
  if (gt?.eddRequired || gt?.approval.cls === "HIGH" || gt?.approval.cls === "PROHIBITED") {
    return {
      action: "Review",
      rationale: `${gt.dueDiligence} required · ${gt.approval.who} must sign off before activation.`,
    };
  }
  if (riskSummary?.behaviourGate?.reviewRequired || riskSummary?.pepGate?.mediumFloor) {
    return {
      action: "Review",
      rationale: "Behaviour or PEP gate flagged — compliance review before approve.",
    };
  }
  if (gt?.residual.controlGap || gt?.approval.cls === "MEDIUM") {
    return {
      action: "Accept with conditions",
      rationale: "Medium residual or control gap — accept with enhanced monitoring and documented conditions.",
    };
  }
  return { action: "Approve", rationale: "Evidence complete, no mandatory gates — standard approve path." };
}

function buildEscalations(
  gt: GoldenThreadResult | null,
  capture: AssessmentCapture,
  riskSummary: RiskAssessmentSummary | null,
): string[] {
  const out: string[] = [];
  if (!gt) return out;
  if (gt.approval.who && gt.approval.who !== "Standard — no escalation") {
    out.push(gt.approval.who.replace(" required", ""));
  }
  if (capture.pep !== "None" && riskSummary?.pepGate) {
    out.push(`PEP (${capture.pep}) — ${riskSummary.pepGate.approvalNote}`);
  }
  if (+capture.strs >= 2) out.push("STR / SAR filed or under review — MLRO notification");
  if (+capture.investigations >= 2) out.push("Active investigation — hold or senior sign-off");
  if (gt.eddRequired) out.push(`EDD workflow (${gt.dueDiligence})`);
  if (riskSummary?.behaviourGate?.overrideHigh) out.push("Behaviour override High floor (OVR-020)");
  return [...new Set(out)];
}

function buildScoreReductionTips(
  riskSummary: RiskAssessmentSummary | null,
  evidenceItems: EvidenceCheckItem[],
  capture: AssessmentCapture,
): string[] {
  const tips: string[] = [];
  const decreases = riskSummary?.drivers.filter((d) => d.impact === "decrease") ?? [];
  for (const d of decreases.slice(0, 2)) {
    tips.push(d.detail || d.label);
  }
  if (!evidenceItems.find((e) => e.id === "poa") || evidenceItems.find((e) => e.id === "poa")?.status !== "complete") {
    tips.push("Obtain verified proof of address within policy age limit");
  }
  if (capture.sofCountry && capture.sowCountry && capture.sofCountry !== capture.sowCountry) {
    tips.push("Validate source-of-funds with supporting documentation");
  }
  if (!evidenceItems.find((e) => e.id === "device_ip") || evidenceItems.find((e) => e.id === "device_ip")?.status === "missing") {
    tips.push("Capture device fingerprint and IP at next customer touchpoint");
  }
  tips.push("Strengthen control effectiveness (CDD / SoW / monitoring) to improve residual band");
  return [...new Set(tips)].slice(0, 5);
}

function buildRationaleTemplate(
  action: AgentRecommendedAction,
  capture: AssessmentCapture,
  gt: GoldenThreadResult | null,
  rating: string,
  missing: string[],
): string {
  const lines = [
    `Decision context: ${capture.customerName} (${capture.customerId}) · ${capture.segment} · ${capture.lifecycle}`,
    `CRAM rating: ${rating} · ${gt?.dueDiligence ?? "—"} · residual ${gt?.residual.residualLevel ?? "—"}`,
    `Recommended action (agent): ${action}`,
    missing.length ? `Evidence gaps: ${missing.join("; ")}` : "Evidence: minimum checklist satisfied",
    "Human rationale:",
    "1. Key risk drivers reviewed and accepted / mitigated:",
    "2. Conditions or escalations (if any):",
    "3. Monitoring & review date:",
    "4. Approver name / role / timestamp:",
  ];
  return lines.join("\n");
}

export function buildRiskAcceptanceRecords(
  capture: AssessmentCapture,
  gt: GoldenThreadResult | null,
  manualOverride: string,
  overrideJustification: string,
  approvedBy: string,
  approvedAt: string,
): RiskAcceptanceRecord[] {
  const records: RiskAcceptanceRecord[] = [];
  const reviewMonths = gt?.reviewMonths ?? 12;
  const reviewDate = gt?.nextReviewDate ?? null;

  if (manualOverride && overrideJustification.trim()) {
    const expiry = reviewDate ?? (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + reviewMonths);
      return d.toISOString().slice(0, 10);
    })();
    records.push({
      id: "OVR-MANUAL",
      who: approvedBy || "Pending approver",
      what: `Manual rating override → ${manualOverride}`,
      why: overrideJustification.trim(),
      expiryDate: expiry,
      reviewDate,
      requiredApprovals: gt ? [gt.approval.who.replace(" required", "")] : ["MLRO"],
      status: approvedBy ? "active" : "pending",
    });
  }

  if (gt?.gates.flags.some((fl) => fl.on && fl.status !== "PROHIBIT")) {
    for (const fl of gt.gates.flags.filter((x) => x.on)) {
      records.push({
        id: fl.name.replace(/\s+/g, "-").slice(0, 24),
        who: approvedBy || "System gate",
        what: `${fl.name} — ${fl.status}`,
        why: gt.subText.slice(0, 120),
        expiryDate: reviewDate,
        reviewDate,
        requiredApprovals: [gt.approval.who.replace(" required", "")],
        status: approvedBy ? "active" : "pending",
      });
    }
  }

  if (approvedBy && approvedAt && gt?.eddRequired) {
    records.push({
      id: "EDD-SIGNOFF",
      who: approvedBy,
      what: `${gt.dueDiligence} approval recorded`,
      why: "EDD workflow completed per golden thread checklist",
      expiryDate: reviewDate,
      reviewDate,
      requiredApprovals: [gt.approval.who.replace(" required", "")],
      status: "active",
    });
  }

  return records;
}

export function buildDecisionFrame(
  capture: AssessmentCapture,
  kyc: KycQualityContext,
  dq: DataQualityVerdict,
  gt: GoldenThreadResult | null,
  riskSummary: RiskAssessmentSummary | null,
  evidence: BenchEvidenceInput,
  opts?: {
    manualOverride?: string;
    overrideJustification?: string;
    approvedBy?: string;
    approvedAt?: string;
  },
): DecisionFrame {
  const evidenceItems = buildEvidenceChecklist(capture, kyc, evidence);
  const missingEvidence = evidenceItems
    .filter((e) => e.status !== "complete")
    .map((e) => e.label);

  const { action, rationale } = deriveRecommendedAction(capture, dq, gt, evidenceItems, riskSummary);
  const mandatoryEscalations = buildEscalations(gt, capture, riskSummary);

  const increases = riskSummary?.drivers.filter((d) => d.impact === "increase" || d.impact === "floor") ?? [];
  const topDrivers = increases.slice(0, 3).map((d) => ({ label: d.label, detail: d.detail }));

  if (topDrivers.length === 0 && gt) {
    topDrivers.push(
      { label: "Inherent band", detail: `${gt.inherentLevel} inherent · ${gt.inherentScore.toFixed(2)}/3 composite driver` },
      { label: "Due diligence", detail: `${gt.dueDiligence} · ${gt.monitoringIntensity} monitoring` },
    );
  }

  const rating = riskSummary?.overallRiskRating ?? gt?.residual.residualLevel ?? "—";
  const scoreReductionTips = buildScoreReductionTips(riskSummary, evidenceItems, capture);

  const riskAcceptance = buildRiskAcceptanceRecords(
    capture,
    gt,
    opts?.manualOverride ?? capture.manualOverride ?? "",
    opts?.overrideJustification ?? "",
    opts?.approvedBy ?? "",
    opts?.approvedAt ?? "",
  );

  return {
    recommendedAction: action,
    agentLabel: "CRAM decision agent",
    actionRationale: rationale,
    missingEvidence,
    mandatoryEscalations,
    topDrivers,
    scoreReductionTips,
    rationaleTemplate: buildRationaleTemplate(action, capture, gt, String(rating), missingEvidence),
    evidenceItems,
    riskAcceptance,
  };
}
