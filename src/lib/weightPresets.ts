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

/** "무엇이 실제로 반영되는지" 한 줄 요약 -- 정렬 기준 칩에 title(hover 상세)로
 * 붙여서, 예컨대 "공강 적은 순"이 다른 축은 전부 0으로 두는 순수 단일 기준
 * 정렬이라는 걸 클릭해서 고급 설정을 열어보지 않아도 알 수 있게 한다. */
export function formatWeightsSummary(weights: Weights): string {
  const timeOfDayLabel = weights.timeOfDay === 50 ? "오전/오후 중립" : weights.timeOfDay < 50 ? "오전 선호" : "오후 선호";
  return [
    `공강 ${weights.gap}`,
    `점심 ${weights.lunch}`,
    `공강일 ${weights.freeDay}`,
    `이동거리 ${weights.commute}`,
    timeOfDayLabel,
  ].join(" · ");
}
