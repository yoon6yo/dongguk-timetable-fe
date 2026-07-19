"use client";

import type { Weights } from "@/lib/scoring";
import { MAX_SCHOOL_CREDIT, MIN_SCHOOL_CREDIT, useCreditLimitStore } from "@/store/creditLimitStore";
import { useWeightsStore } from "@/store/weightsStore";

const SLIDERS: { key: keyof Weights; label: string; low: string; high: string }[] = [
  { key: "gap", label: "공강 시간 최소화", low: "신경 안 씀", high: "매우 중요" },
  { key: "lunch", label: "점심시간 확보", low: "신경 안 씀", high: "매우 중요" },
  { key: "freeDay", label: "공강일 확보", low: "신경 안 씀", high: "매우 중요" },
  { key: "commute", label: "동선(이동 거리) 최소화", low: "신경 안 씀", high: "매우 중요" },
  { key: "timeOfDay", label: "오전 ↔ 오후 선호", low: "오전 선호", high: "오후 선호" },
];

export function StepWeights() {
  const weights = useWeightsStore((s) => s.weights);
  const setWeight = useWeightsStore((s) => s.setWeight);
  const reset = useWeightsStore((s) => s.reset);
  const maxCredit = useCreditLimitStore((s) => s.maxCredit);
  const setMaxCredit = useCreditLimitStore((s) => s.setMaxCredit);

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-surface p-4 shadow-card">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium">목표 학점 (상한)</span>
          <span className="font-semibold text-primary">{maxCredit ?? MAX_SCHOOL_CREDIT}학점</span>
        </div>
        <p className="mb-3 text-xs text-text-secondary">
          동국대 수강신청 규정상 {MIN_SCHOOL_CREDIT}~{MAX_SCHOOL_CREDIT}학점 사이여야 합니다. 여기서 정한
          학점을 넘거나 {MIN_SCHOOL_CREDIT}학점 미만인 조합은 결과에서 제외돼요.
        </p>
        <input
          type="range"
          min={MIN_SCHOOL_CREDIT}
          max={MAX_SCHOOL_CREDIT}
          step={1}
          value={maxCredit ?? MAX_SCHOOL_CREDIT}
          onChange={(e) => setMaxCredit(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral/30 accent-primary transition-opacity hover:opacity-90"
        />
        <div className="mt-1 flex justify-between text-xs text-text-secondary">
          <span>{MIN_SCHOOL_CREDIT}학점</span>
          <span>{MAX_SCHOOL_CREDIT}학점</span>
        </div>
      </div>

      <p className="text-text-secondary">
        슬라이더를 조절해 시간표를 어떤 기준으로 정렬할지 정하세요. &ldquo;오전 ↔ 오후 선호&rdquo;는 가운데(50)에
        두면 신경 쓰지 않는다는 뜻이고, 양쪽 끝으로 갈수록 그 방향을 강하게 반영합니다.
      </p>

      <div className="space-y-3 rounded-xl bg-surface p-4 shadow-card">
        {SLIDERS.map(({ key, label, low, high }, idx) => (
          <div key={key} className={idx > 0 ? "border-t border-neutral/20 pt-3" : ""}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">{label}</span>
              <span className="sr-only" aria-live="polite">
                {weights[key]}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={weights[key]}
              onChange={(e) => setWeight(key, Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral/30 accent-primary transition-opacity hover:opacity-90"
            />
            <div className="mt-1 flex justify-between text-xs text-text-secondary">
              <span>{low}</span>
              <span>{high}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={reset}
        className="rounded-md text-sm text-text-secondary underline decoration-neutral underline-offset-2 transition-colors hover:text-primary active:scale-[0.98]"
      >
        기본값으로 되돌리기
      </button>
    </div>
  );
}
