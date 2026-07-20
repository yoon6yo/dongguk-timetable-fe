"use client";

import { formatSyncTime } from "@/lib/formatSyncTime";
import { useCoursesStore } from "@/store/coursesStore";
import { useWizardStore, WIZARD_STEPS } from "@/store/wizardStore";

import { StepGroups } from "./steps/StepGroups";
import { StepResults } from "./steps/StepResults";
import { StepStart } from "./steps/StepStart";
import { StepWeights } from "./steps/StepWeights";

const STEP_TITLES: Record<(typeof WIZARD_STEPS)[number], string> = {
  start: "시작",
  groups: "그룹 & 과목",
  weights: "우선순위 설정",
  results: "결과",
};

const STEP_COMPONENTS = {
  start: StepStart,
  groups: StepGroups,
  weights: StepWeights,
  results: StepResults,
} as const;

export function Wizard() {
  const stepIndex = useWizardStore((s) => s.stepIndex);
  const next = useWizardStore((s) => s.next);
  const back = useWizardStore((s) => s.back);

  const semester = useCoursesStore((s) => s.semester);

  const stepKey = WIZARD_STEPS[stepIndex];
  const StepComponent = STEP_COMPONENTS[stepKey];

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-8">
      <ol className="mb-8 grid grid-flow-col items-start" style={{ gridTemplateColumns: `repeat(${WIZARD_STEPS.length}, 1fr)` }}>
        {WIZARD_STEPS.map((key, idx) => {
          const isDone = idx < stepIndex;
          const isCurrent = idx === stepIndex;
          return (
            <li key={key} className="relative flex flex-col items-center">
              {idx > 0 && (
                <div
                  className={`absolute right-1/2 top-3.5 h-0.5 w-full -translate-y-1/2 transition-colors duration-300 ${
                    isDone || isCurrent ? "bg-primary" : "bg-neutral/30"
                  }`}
                />
              )}
              <div
                className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ${
                  isDone
                    ? "bg-primary text-white"
                    : isCurrent
                      ? "bg-primary text-white ring-4 ring-primary-tint"
                      : "bg-neutral/30 text-text-secondary"
                }`}
              >
                {isDone ? (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path
                      fillRule="evenodd"
                      d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.415 0l-3.5-3.5a1 1 0 111.415-1.42L8.5 12.085l6.79-6.795a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`mt-1.5 hidden text-center text-[11px] leading-tight sm:block ${
                  isCurrent ? "font-semibold text-foreground" : "text-text-secondary"
                }`}
              >
                {STEP_TITLES[key]}
              </span>
            </li>
          );
        })}
      </ol>

      <h1 className="text-xl font-bold">{STEP_TITLES[stepKey]}</h1>
      {semester && (
        <p className="mb-6 mt-1 text-xs text-text-secondary">
          시간표 정보 {formatSyncTime(semester.coursesSyncedAt)} 기준 · 경쟁률{" "}
          {formatSyncTime(semester.appliedCountSyncedAt)} 기준
        </p>
      )}
      {!semester && <div className="mb-6" />}

      <div className="flex-1">
        <StepComponent />
      </div>

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={back}
          disabled={stepIndex === 0}
          className="rounded-full px-4 py-2 text-sm font-medium text-text-secondary transition-all duration-150 hover:bg-neutral/20 active:scale-95 active:bg-neutral/30 disabled:opacity-0"
        >
          이전
        </button>
        {stepKey !== "results" && (
          <button
            type="button"
            onClick={next}
            className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white shadow-button transition-all duration-150 hover:bg-primary-hover active:scale-95 active:bg-primary-active active:shadow-none"
          >
            다음
          </button>
        )}
      </div>
    </div>
  );
}
