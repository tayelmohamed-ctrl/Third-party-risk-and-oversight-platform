// Client-side assessment access — reads/writes via the server immutable audit store.
import type { Assessment } from "../engine/rerating";
import { apiAddAssessment, apiHistory, apiLatestAssessments, apiSeed } from "../lib/api";

export async function allAssessments(): Promise<Assessment[]> {
  const latest = await apiLatestAssessments();
  const all = await Promise.all(latest.map((a) => apiHistory(a.customerId)));
  return all.flat().sort((a, b) => a.at.localeCompare(b.at));
}

export async function addAssessment(
  a: Assessment & { overrideJustification?: string },
  dq?: { capture: import("../engine/dataQualityGate").AssessmentCapture; kycContext: import("../engine/dataQualityGate").KycQualityContext },
) {
  return apiAddAssessment(a, dq);
}

export async function historyFor(customerId: string): Promise<Assessment[]> {
  return apiHistory(customerId);
}

export async function latestByCustomer(): Promise<Assessment[]> {
  return apiLatestAssessments();
}

export async function seedIfEmpty() {
  await apiSeed();
}

export async function resetStore() {
  // Immutable store — no delete API. Re-seed requires clearing data/audit on server.
  console.warn("resetStore: immutable audit store cannot be cleared from the browser");
}
