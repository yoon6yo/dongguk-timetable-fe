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
    <div className="mx-auto flex max-w-4xl flex-col px-4 py-6">
      <div className="sticky top-0 z-10 -mx-4 bg-background px-4 pb-2">
        <div className="flex items-center justify-between gap-3 pt-1">
          <Link href="/" className="text-xs font-medium text-text-secondary hover:text-primary">
            ← 홈
          </Link>
          <div className="flex gap-3">
            <Link href="/watchlist" className="text-xs font-medium text-primary hover:text-primary-hover">
              관심 강의 경쟁률
            </Link>
            <Link href="/saved" className="text-xs font-medium text-primary hover:text-primary-hover">
              저장된 시간표
            </Link>
          </div>
        </div>
        <ol
          className="mb-8 grid grid-flow-col items-start"
          style={{ gridTemplateColumns: `repeat(${WIZARD_STEPS.length}, 1fr)` }}
        >
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
          <p className="mt-1 text-xs text-text-secondary">
            시간표 정보 {formatSyncTime(semester.coursesSyncedAt)} 기준 · 경쟁률{" "}
            {formatSyncTime(semester.appliedCountSyncedAt)} 기준 · {courseCount}개 과목 로드됨
          </p>
        )}
        {!semester && <div className="mb-6" />}

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
