"use client";

import type { Weights } from "@/lib/scoring";
import { useWeightsStore } from "@/store/weightsStore";

const SLIDERS: { key: keyof Weights; label: string; low: string; high: string }[] = [
  { key: "gap", label: "공강 시간 최소화", low: "신경 안 씀", high: "매우 중요" },
  { key: "lunch", label: "점심시간 확보 (12~13시)", low: "신경 안 씀", high: "매우 중요" },
  { key: "freeDay", label: "공강일(요일) 확보", low: "신경 안 씀", high: "매우 중요" },
  { key: "timeOfDay", label: "오전 ↔ 오후 선호", low: "오전 선호", high: "오후 선호" },
];

export function StepWeights() {
  const weights = useWeightsStore((s) => s.weights);
  const setWeight = useWeightsStore((s) => s.setWeight);
  const reset = useWeightsStore((s) => s.reset);

  return (
    <div className="space-y-6">
      <p className="text-text-secondary">
        슬라이더를 조절해 시간표를 어떤 기준으로 정렬할지 정하세요. &ldquo;오전 ↔ 오후 선호&rdquo;는 가운데(50)에
        두면 신경 쓰지 않는다는 뜻이고, 양쪽 끝으로 갈수록 그 방향을 강하게 반영합니다.
      </p>

      {SLIDERS.map(({ key, label, low, high }) => (
        <div key={key}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium">{label}</span>
            <span className="text-text-secondary">{weights[key]}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={weights[key]}
            onChange={(e) => setWeight(key, Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-text-secondary">
            <span>{low}</span>
            <span>{high}</span>
          </div>
        </div>
      ))}

      <button type="button" onClick={reset} className="text-sm text-text-secondary underline hover:text-primary">
        기본값으로 되돌리기
      </button>
    </div>
  );
}
