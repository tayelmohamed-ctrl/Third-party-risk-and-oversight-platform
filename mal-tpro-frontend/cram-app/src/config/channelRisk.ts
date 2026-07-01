/**
 * Channel risk taxonomy — initiation vs delivery.
 * Initiation options are BaaS / AI-community native (no branch onboarding).
 * Composite uses max(initiation, delivery) × combined weight (non-dilution).
 */
import type { Score } from "../engine/types";

export interface ChannelOption {
  id: string;
  label: string;
  score: Score;
}

/** Relationship initiation — digital-first BaaS (no face-to-face / branch) */
export const INITIATION_CHANNELS: readonly ChannelOption[] = [
  { id: "e_channel", label: "E Channel · digital / AI-assisted", score: 1 },
  { id: "embedded", label: "Embedded / partner BaaS", score: 2 },
  { id: "third_party", label: "Through Third Party / agent introducer", score: 3 },
] as const;

/** Ongoing service delivery channel (HTML delivery_channel) */
export const DELIVERY_CHANNELS: readonly ChannelOption[] = [
  { id: "face_to_face", label: "Face to Face / branch", score: 1 },
  { id: "e_channel", label: "E Channel · web / mobile", score: 2 },
  { id: "api_correspondent", label: "API / correspondent / nested", score: 3 },
] as const;

export function initiationScoreFromCapture(value: string): Score {
  const n = +value;
  if (n >= 1 && n <= 3) return n as Score;
  const hit = INITIATION_CHANNELS.find((c) => c.id === value);
  return hit?.score ?? 2;
}

export function deliveryScoreFromCapture(value: string): Score {
  const n = +value;
  if (n >= 1 && n <= 3) return n as Score;
  const hit = DELIVERY_CHANNELS.find((c) => c.id === value);
  return hit?.score ?? 2;
}
