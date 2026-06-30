import type { ScoreInput, Score } from "./types";
import type { CustomerLegalForm, UboVerificationStatus } from "./activityProfile";

export type NormalizedScoreInput = ScoreInput & {
  expectedMonthlyBand: Score;
  actualMonthlyBand: Score;
  legalForm: CustomerLegalForm;
  uboStatus: UboVerificationStatus;
  uboLayers: number;
  monthlyValueScore: Score;
};

/** Back-fill legacy assessment snapshots only — live scoring must pass dataQualityGate first. */
export function normalizeScoreInput(i: ScoreInput): NormalizedScoreInput {
  const band = i.expectedMonthlyBand ?? i.monthlyValueScore ?? 1;
  return {
    ...i,
    expectedMonthlyBand: band,
    actualMonthlyBand: i.actualMonthlyBand ?? i.monthlyValueScore ?? band,
    legalForm: i.legalForm ?? "natural",
    uboStatus: i.uboStatus ?? "na",
    uboLayers: i.uboLayers ?? 1,
    monthlyValueScore: band,
    initiationChannelScore: (i.initiationChannelScore ?? i.channelScore ?? 1) as Score,
    deliveryChannelScore: (i.deliveryChannelScore ?? i.interfaceScore ?? 1) as Score,
  };
}
