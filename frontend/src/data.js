// The JSON spec files in ../../spec are the single source of truth.
import thirdParties from "../../spec/third-parties.json";
import assessments from "../../spec/assessments.json";
import findings from "../../spec/findings.json";

export const RISK_TIERS = ["Critical", "High", "Medium", "Low"];

const RISK_WEIGHT = { Critical: 4, High: 3, Medium: 2, Low: 1 };
const OPEN_FINDING_STATUSES = new Set(["Open", "In Remediation"]);

export function getThirdParties() {
  return [...thirdParties].sort((a, b) => a.name.localeCompare(b.name));
}

export function getThirdParty(id) {
  return thirdParties.find((t) => t.id === id) ?? null;
}

export function getAssessments() {
  return [...assessments].sort(
    (a, b) => new Date(b.dueDate) - new Date(a.dueDate),
  );
}

export function getAssessmentsForThirdParty(id) {
  return assessments
    .filter((a) => a.thirdPartyId === id)
    .sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
}

export function getFindings() {
  return [...findings].sort(
    (a, b) => new Date(b.identifiedDate) - new Date(a.identifiedDate),
  );
}

export function getFindingsForThirdParty(id) {
  return findings
    .filter((f) => f.thirdPartyId === id)
    .sort((a, b) => new Date(b.identifiedDate) - new Date(a.identifiedDate));
}

export function daysUntil(value) {
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
}

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

export function assessmentEffectiveStatus(a) {
  if (a.status !== "Completed" && a.status !== "Overdue" && daysUntil(a.dueDate) < 0) {
    return "Overdue";
  }
  return a.status;
}

export function computeMetrics() {
  const riskTierCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  for (const tp of thirdParties) riskTierCounts[tp.residualRiskTier] += 1;

  const openFindings = findings.filter((f) => OPEN_FINDING_STATUSES.has(f.status));

  const completed = assessments.filter(
    (a) => a.status === "Completed" && a.score > 0,
  );
  const averagePostureScore = completed.length
    ? Math.round(completed.reduce((acc, a) => acc + a.score, 0) / completed.length)
    : 0;

  const tiers = thirdParties.map((t) => t.residualRiskTier);
  const totalWeight = tiers.reduce((acc, t) => acc + RISK_WEIGHT[t], 0);
  const maxWeight = tiers.length * RISK_WEIGHT.Critical || 1;
  const portfolioRiskScore = Math.round((totalWeight / maxWeight) * 100);

  return {
    totalThirdParties: thirdParties.length,
    activeThirdParties: thirdParties.filter((t) => t.status === "Active").length,
    criticalThirdParties: thirdParties.filter((t) => t.criticality === "Critical")
      .length,
    riskTierCounts,
    openFindings: openFindings.length,
    criticalOrHighFindings: openFindings.filter(
      (f) => f.severity === "Critical" || f.severity === "High",
    ).length,
    overdueAssessments: assessments.filter((a) => a.status === "Overdue").length,
    assessmentsDueSoon: assessments.filter(
      (a) =>
        a.status !== "Completed" &&
        a.status !== "Overdue" &&
        daysUntil(a.dueDate) >= 0 &&
        daysUntil(a.dueDate) <= 45,
    ).length,
    reviewsDueSoon: thirdParties.filter((t) => daysUntil(t.nextReviewDate) <= 45)
      .length,
    averagePostureScore,
    portfolioRiskScore,
  };
}
