"use client";

import { useWizardStore, WIZARD_STEPS } from "@/store/wizardStore";

import { StepCourses } from "./steps/StepCourses";
import { StepGroups } from "./steps/StepGroups";
import { StepResults } from "./steps/StepResults";
import { StepStart } from "./steps/StepStart";
import { StepWeights } from "./steps/StepWeights";

const STEP_TITLES: Record<(typeof WIZARD_STEPS)[number], string> = {
  start: "시작",
  groups: "그룹 만들기",
  courses: "과목 담기",
  weights: "우선순위 설정",
  results: "결과",
};

const STEP_COMPONENTS = {
  start: StepStart,
  groups: StepGroups,
  courses: StepCourses,
  weights: StepWeights,
  results: StepResults,
} as const;

export function Wizard() {
  const stepIndex = useWizardStore((s) => s.stepIndex);
  const next = useWizardStore((s) => s.next);
  const back = useWizardStore((s) => s.back);

  const stepKey = WIZARD_STEPS[stepIndex];
  const StepComponent = STEP_COMPONENTS[stepKey];

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-8">
      <ol className="mb-8 flex items-center gap-2">
        {WIZARD_STEPS.map((key, idx) => (
          <li key={key} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                idx <= stepIndex ? "bg-primary text-white" : "bg-neutral/30 text-text-secondary"
              }`}
            >
              {idx + 1}
            </div>
            {idx < WIZARD_STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 ${idx < stepIndex ? "bg-primary" : "bg-neutral/30"}`} />
            )}
          </li>
        ))}
      </ol>

      <h1 className="mb-6 text-xl font-bold">{STEP_TITLES[stepKey]}</h1>

      <div className="flex-1">
        <StepComponent />
      </div>

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={back}
          disabled={stepIndex === 0}
          className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary disabled:opacity-0"
        >
          이전
        </button>
        {stepKey !== "results" && (
          <button
            type="button"
            onClick={next}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            다음
          </button>
        )}
      </div>
    </div>
  );
}
