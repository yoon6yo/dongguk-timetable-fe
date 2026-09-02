import type { Weights } from "./scoring";

export interface WeightPreset {
  key: string;
  label: string;
  weights: Weights;
  /** Plain-sentence explanation of what the chip actually sorts by --
   * shown as a hover title, grounded in the same concrete rule the scoring
   * function underneath applies (e.g. lunch's exact 12:00~13:00 window)
   * rather than restating the label in other words. */
  description: string;
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
  {
    key: "balanced",
    label: "균형있게",
    weights: { gap: 50, lunch: 50, freeDay: 50, timeOfDay: 50, commute: 50 },
    description: "다섯 가지 기준을 골고루 반영해서 정렬해요.",
  },
  {
    key: "gap",
    label: "공강 적은 순",
    weights: { gap: 100, lunch: 0, freeDay: 0, timeOfDay: 50, commute: 0 },
    description: "수업과 수업 사이 빈 시간이 적은 순서로 정렬해요.",
  },
  {
    key: "lunch",
    label: "점심시간 확보 순",
    weights: { gap: 0, lunch: 100, freeDay: 0, timeOfDay: 50, commute: 0 },
    description: "점심시간(12:00~13:00)에 수업이 없는 날이 많은 순서로 정렬해요.",
  },
  {
    key: "freeDay",
    label: "공강일 많은 순",
    weights: { gap: 0, lunch: 0, freeDay: 100, timeOfDay: 50, commute: 0 },
    description: "월~금 중 수업이 아예 없는 요일이 많은 순서로 정렬해요.",
  },
  {
    key: "commute",
    label: "이동거리 적은 순",
    weights: { gap: 0, lunch: 0, freeDay: 0, timeOfDay: 50, commute: 100 },
    description: "건물 사이 이동 거리가 짧은 순서로 정렬해요.",
  },
  {
    key: "morning",
    label: "오전 위주",
    weights: { gap: 0, lunch: 0, freeDay: 0, timeOfDay: 0, commute: 0 },
    description: "수업 시작 시간이 이른 순서로 정렬해요.",
  },
  {
    key: "afternoon",
    label: "오후 위주",
    weights: { gap: 0, lunch: 0, freeDay: 0, timeOfDay: 100, commute: 0 },
    description: "수업 시작 시간이 늦은 순서로 정렬해요.",
  },
];

/** Returns the preset key exactly matching these weights, or null if the
 * weights were hand-tuned (via 고급 설정) into something no preset produces --
 * the caller shows that as "사용자 지정". */
export function matchWeightPreset(weights: Weights): string | null {
  const match = WEIGHT_PRESETS.find((p) => (Object.keys(p.weights) as (keyof Weights)[]).every((k) => p.weights[k] === weights[k]));
  return match?.key ?? null;
}
