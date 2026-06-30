/** Synthetic 18-month back-test cohort — rating at T0 vs outcomes at T+12m (SR 11-7 / CBUAE Gate 5). */
export interface BacktestRecord {
  id: string;
  segment: string;
  rating: "Low" | "Medium" | "High";
  composite: number;
  sarFiled: boolean;
  tmAlert: boolean;
  investigation: boolean;
  adverseOutcome: boolean;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Generate reproducible cohort with monotonic adverse-outcome rates by band. */
export function generateBacktestCohort(n = 480): BacktestRecord[] {
  const rand = seededRandom(20260501);
  const rates = { Low: 0.006, Medium: 0.028, High: 0.092 };
  const weights = { Low: 0.62, Medium: 0.28, High: 0.10 };
  const records: BacktestRecord[] = [];

  for (let i = 0; i < n; i++) {
    const r = rand();
    const rating: BacktestRecord["rating"] = r < weights.Low ? "Low" : r < weights.Low + weights.Medium ? "Medium" : "High";
    const composite = rating === "Low" ? 1.1 + rand() * 0.35 : rating === "Medium" ? 1.55 + rand() * 0.55 : 2.2 + rand() * 0.7;
    const p = rates[rating];
    const sarFiled = rand() < p * 0.35;
    const tmAlert = rand() < p * 0.85;
    const investigation = rand() < p * 0.55;
    const adverseOutcome = sarFiled || investigation || (tmAlert && rand() < 0.4);
    records.push({
      id: `BT${String(i + 1).padStart(5, "0")}`,
      segment: ["Retail", "SME", "HNW", "Corporate"][Math.floor(rand() * 4)],
      rating, composite: +composite.toFixed(4),
      sarFiled, tmAlert, investigation, adverseOutcome,
    });
  }
  return records;
}

export const BACKTEST_COHORT = generateBacktestCohort();
