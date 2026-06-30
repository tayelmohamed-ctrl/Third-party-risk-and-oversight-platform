import type { ScoreInput, Score, Boundary, FinalRating } from "../engine/types";

/** Minimal valid ScoreInput for golden vectors & back-testing. */
export function baseInput(over: Partial<ScoreInput> = {}): ScoreInput {
  return {
    segment: "Retail",
    lifecycle: "New",
    employmentScore: 1 as Score,
    professionScore: 1 as Score,
    natureOfBusinessScore: 1 as Score,
    pep: "None",
    segmentScore: 1 as Score,
    expectedMonthlyBand: 1 as Score,
    actualMonthlyBand: 1 as Score,
    legalForm: "natural",
    uboStatus: "na",
    uboLayers: 1,
    residenceFirm: 1.35,
    nationalityFirm: 1.35,
    birthFirm: 1.35,
    sowFirm: 1.35,
    sofFirm: 1.35,
    residenceName: "United Arab Emirates",
    sofName: "United Arab Emirates",
    productScore: 1 as Score,
    serviceScore: 1 as Score,
    initiationChannelScore: 1 as Score,
    deliveryChannelScore: 1 as Score,
    investigationsScore: 1 as Score,
    strsScore: 1 as Score,
    sanctions: "Clear",
    watchlist: "Clear",
    adverse: "None",
    ...over,
  };
}

export const ALL_LOW: Partial<ScoreInput> = {
  employmentScore: 1 as Score, professionScore: 1 as Score, natureOfBusinessScore: 1 as Score,
  segmentScore: 1 as Score, productScore: 1 as Score, serviceScore: 1 as Score,
  initiationChannelScore: 1 as Score, deliveryChannelScore: 1 as Score,
  expectedMonthlyBand: 1 as Score, actualMonthlyBand: 1 as Score,
  residenceFirm: 1.35, nationalityFirm: 1.35, birthFirm: 1.35, sowFirm: 1.35, sofFirm: 1.35,
};

export const ALL_HIGH: Partial<ScoreInput> = {
  employmentScore: 3 as Score, professionScore: 3 as Score, natureOfBusinessScore: 3 as Score,
  segmentScore: 3 as Score, productScore: 3 as Score, serviceScore: 3 as Score,
  initiationChannelScore: 3 as Score, deliveryChannelScore: 3 as Score,
  expectedMonthlyBand: 3 as Score, actualMonthlyBand: 3 as Score,
  residenceFirm: 2.5, nationalityFirm: 2.5, birthFirm: 2.5, sowFirm: 2.5, sofFirm: 2.5,
};

export interface GoldenCase {
  id: string;
  section: string;
  description: string;
  input: ScoreInput;
  boundary?: Boundary;
  expect: {
    finalRating?: FinalRating;
    mathBand?: FinalRating extends never ? never : import("../engine/types").Band;
    overrideIds?: string[];
    compositeMin?: number;
    compositeMax?: number;
    reproducible?: boolean;
    blocked?: boolean;
  };
  skip?: string;
}
