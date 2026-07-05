/**
 * Behaviour engine — expected vs actual behaviour comparison.
 */
import type {
  ActualBehaviourSnapshot,
  BehaviourDeviation,
  ExpectedBehaviourProfile,
} from "./types";

export function compareBehaviour(
  expected: ExpectedBehaviourProfile,
  actual: ActualBehaviourSnapshot,
): { deviations: BehaviourDeviation[]; scoreUplift: number } {
  const deviations: BehaviourDeviation[] = [];

  if (expected.currency !== actual.currency) {
    deviations.push({
      dimension: "Currency",
      expected: expected.currency,
      actual: actual.currency,
      severity: "high",
      scoreUplift: 12,
      rationale: "Currency mismatch vs onboarding declaration",
    });
  }

  if (expected.geography !== actual.geography) {
    deviations.push({
      dimension: "Geography",
      expected: expected.geography,
      actual: actual.geography,
      severity: "high",
      scoreUplift: 10,
      rationale: "Geographic flow inconsistent with expected domestic/cross-border profile",
    });
  }

  if (expected.frequency !== actual.frequency) {
    const sev = actual.frequency.toLowerCase().includes("daily") && expected.frequency.toLowerCase().includes("month")
      ? "high" as const
      : "medium" as const;
    deviations.push({
      dimension: "Frequency",
      expected: expected.frequency,
      actual: actual.frequency,
      severity: sev,
      scoreUplift: sev === "high" ? 8 : 4,
      rationale: "Transaction frequency deviates from declared pattern",
    });
  }

  const txnRatio = actual.monthlyTransactions / Math.max(1, expected.monthlyTransactions);
  if (txnRatio > 3) {
    deviations.push({
      dimension: "Volume",
      expected: `${expected.monthlyTransactions} tx/month`,
      actual: `${actual.monthlyTransactions} tx/month`,
      severity: "high",
      scoreUplift: 15,
      rationale: "Monthly transaction count exceeds 3× expected — velocity typology",
    });
  } else if (txnRatio > 1.5) {
    deviations.push({
      dimension: "Volume",
      expected: `${expected.monthlyTransactions} tx/month`,
      actual: `${actual.monthlyTransactions} tx/month`,
      severity: "medium",
      scoreUplift: 6,
      rationale: "Elevated transaction count vs expected",
    });
  }

  for (const flag of actual.flags) {
    const lower = flag.toLowerCase();
    if (lower.includes("crypto") || lower.includes("exchange")) {
      deviations.push({
        dimension: "Counterparty",
        expected: expected.allowedCounterparties.join(", ") || "Declared profile",
        actual: flag,
        severity: "high",
        scoreUplift: 14,
        rationale: "Virtual asset or crypto exchange exposure not declared at onboarding",
      });
    }
    if (lower.includes("third part")) {
      deviations.push({
        dimension: "Counterparty",
        expected: "Limited third parties",
        actual: flag,
        severity: "medium",
        scoreUplift: 6,
        rationale: "Third-party payment pattern exceeds declaration",
      });
    }
  }

  const scoreUplift = Math.min(35, deviations.reduce((s, d) => s + d.scoreUplift, 0));
  return { deviations, scoreUplift };
}

export function expectedProfileFromUseCase(
  useCaseId: string,
  useCaseLabel: string,
  corridorLabel: string,
): ExpectedBehaviourProfile {
  const payroll = useCaseId === "payroll";
  const marketplace = useCaseId === "marketplace_settlement";
  return {
    useCaseId,
    currency: payroll ? "AED" : "USD",
    geography: corridorLabel.includes("domestic") ? "Domestic" : corridorLabel,
    frequency: payroll ? "Monthly" : marketplace ? "Daily" : "Recurring",
    monthlyTransactions: payroll ? 50 : marketplace ? 200 : 80,
    averageTransaction: payroll ? 5000 : marketplace ? 2500 : 10000,
    allowedCounterparties: payroll ? ["Employees"] : ["Vendors", "Merchants"],
    prohibitedPatterns: ["Crypto exchanges", "Unregistered MSB", "Sanctioned entities"],
  };
}

export function demoActualBehaviourMismatch(): ActualBehaviourSnapshot {
  return {
    currency: "USD",
    geography: "Global",
    frequency: "Daily",
    monthlyTransactions: 600,
    averageTransaction: 8500,
    counterpartyTypes: ["Crypto exchanges", "Third parties", "Offshore entities"],
    flags: ["Crypto exchanges", "Third party velocity spike"],
  };
}
