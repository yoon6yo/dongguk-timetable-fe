import type { Weights } from "./scoring";

export interface WeightPreset {
  key: string;
  label: string;
  weights: Weights;
}

/**
 * Quick, plain-language sort options shown as chips in the results view, so
 * "가중치 조정"(weight tuning) -- a term users found intimidating -- isn't the
 * only way in. Each preset (except "균형있게") maxes out exactly one
 * criterion's importance and zeroes the rest, matching the "OOO순" framing:
 * a pure single-axis sort, not a blend. `timeOfDay` is special (see
 * scoring.ts) -- 50 means "neutral/no importance", not "no preference at
 * 0%", so non-time presets must set it to 50, never 0, to stay truly neutral
 * on that axis instead of accidentally importing a hidden morning bias.
 */
export const WEIGHT_PRESETS: WeightPreset[] = [
  { key: "balanced", label: "균형있게", weights: { gap: 50, lunch: 50, freeDay: 50, timeOfDay: 50, commute: 50 } },
  { key: "gap", label: "공강 적은 순", weights: { gap: 100, lunch: 0, freeDay: 0, timeOfDay: 50, commute: 0 } },
  { key: "lunch", label: "점심시간 확보 순", weights: { gap: 0, lunch: 100, freeDay: 0, timeOfDay: 50, commute: 0 } },
  { key: "freeDay", label: "공강일 많은 순", weights: { gap: 0, lunch: 0, freeDay: 100, timeOfDay: 50, commute: 0 } },
  { key: "commute", label: "이동거리 적은 순", weights: { gap: 0, lunch: 0, freeDay: 0, timeOfDay: 50, commute: 100 } },
  { key: "morning", label: "오전 위주", weights: { gap: 0, lunch: 0, freeDay: 0, timeOfDay: 0, commute: 0 } },
  { key: "afternoon", label: "오후 위주", weights: { gap: 0, lunch: 0, freeDay: 0, timeOfDay: 100, commute: 0 } },
];

/** Returns the preset key exactly matching these weights, or null if the
 * weights were hand-tuned (via 고급 설정) into something no preset produces --
 * the caller shows that as "사용자 지정". */
export function matchWeightPreset(weights: Weights): string | null {
  const match = WEIGHT_PRESETS.find((p) => (Object.keys(p.weights) as (keyof Weights)[]).every((k) => p.weights[k] === weights[k]));
  return match?.key ?? null;
}
