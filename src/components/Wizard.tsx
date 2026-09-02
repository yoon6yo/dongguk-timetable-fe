"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

import { useSemesterMismatchGuard } from "@/hooks/useSemesterMismatchGuard";
import { formatSyncTime } from "@/lib/formatSyncTime";
import { useCoursesStore } from "@/store/coursesStore";
import { useWizardStore, WIZARD_STEPS } from "@/store/wizardStore";

import { StepStart } from "./steps/StepStart";

// Code-split, not a static import: StepGroups pulls in @dnd-kit/core and
// StepResults pulls in html-to-image (via lib/exportImage.ts), neither
// needed until the user actually reaches those steps -- a static import
// here would ship both in step "start"'s initial JS.
const StepGroups = dynamic(() => import("./steps/StepGroups").then((m) => m.StepGroups), { ssr: false });
const StepResults = dynamic(() => import("./steps/StepResults").then((m) => m.StepResults), { ssr: false });

const STEP_TITLES: Record<(typeof WIZARD_STEPS)[number], string> = {
  start: "시작",
  groups: "그룹 & 과목",
  results: "결과",
};

const STEP_COMPONENTS = {
  start: StepStart,
  groups: StepGroups,
  results: StepResults,
} as const;

export function Wizard() {
  const stepIndex = useWizardStore((s) => s.stepIndex);
  const next = useWizardStore((s) => s.next);
  const back = useWizardStore((s) => s.back);

  const semester = useCoursesStore((s) => s.semester);
  const courseCount = useCoursesStore((s) => s.courses.length);
  const showSemesterMismatchNotice = useSemesterMismatchGuard();

  const stepKey = WIZARD_STEPS[stepIndex];
  const StepComponent = STEP_COMPONENTS[stepKey];

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 py-6">
      {/* Rebuilt from scratch, not just narrowed -- direct feedback rejected
          the whole composition, not just its width. The circle-and-
          connecting-line stepper (three ~28px badges bridged by full-width
          lines) was the single biggest vertical/visual weight on this
          screen for what it communicates: which of 3 steps you're on. A
          thin segmented bar + step count does the same job in a fraction
          of the height, and the eyebrow-label + heading pattern below
          matches Landing.tsx's voice instead of introducing a third
          different header style in the app. */}
      <div className="sticky top-0 z-10 -mx-4 bg-background px-4 pb-3">
        <div className="flex items-center justify-between pt-1">
          <Link href="/" className="text-xs font-medium text-text-secondary hover:text-primary">
            ← 홈
          </Link>
          <span className="text-xs font-medium text-text-secondary">
            {stepIndex + 1} / {WIZARD_STEPS.length}
          </span>
        </div>

        <div className="mt-3 flex gap-1.5" role="progressbar" aria-valuenow={stepIndex + 1} aria-valuemin={1} aria-valuemax={WIZARD_STEPS.length}>
          {WIZARD_STEPS.map((key, idx) => (
            <div
              key={key}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                idx <= stepIndex ? "bg-primary" : "bg-neutral/25"
              }`}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
          STEP {stepIndex + 1}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{STEP_TITLES[stepKey]}</h1>
        {semester && (
          <p className="mt-1 text-xs text-text-secondary">
            시간표 정보 {formatSyncTime(semester.coursesSyncedAt)} 기준 · 경쟁률{" "}
            {formatSyncTime(semester.appliedCountSyncedAt)} 기준 · {courseCount}개 과목 로드됨
          </p>
        )}

        {showSemesterMismatchNotice && (
          <p className="mt-2 rounded-lg bg-primary-tint p-2 text-xs text-foreground">
            학기가 바뀌어 이전에 담아둔 과목 그룹을 초기화했어요 — 새 학기 과목으로 다시 담아주세요.
          </p>
        )}
      </div>

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
