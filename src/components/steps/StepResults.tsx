"use client";

import { useMemo, useRef, useState } from "react";

import { buildGenerationInput } from "@/lib/buildGenerationInput";
import { customEventToCourseRow } from "@/lib/customEvents";
import { exportTimetableAsCsv } from "@/lib/exportCsv";
import { exportElementAsPng } from "@/lib/exportImage";
import { exportTimetableAsTxt } from "@/lib/exportTxt";
import type { CourseRow } from "@/lib/types";
import { useCombinationWorker } from "@/hooks/useCombinationWorker";
import { useCoursesStore } from "@/store/coursesStore";
import { MAX_SCHOOL_CREDIT, MIN_SCHOOL_CREDIT, useCreditLimitStore } from "@/store/creditLimitStore";
import { useCustomEventsStore } from "@/store/customEventsStore";
import { useGroupsStore } from "@/store/groupsStore";
import { useSavedTimetablesStore } from "@/store/savedTimetablesStore";
import { useWeightsStore } from "@/store/weightsStore";
import { useWizardStore } from "@/store/wizardStore";

import { Modal } from "../Modal";
import { TimetableExportCard } from "../TimetableExportCard";
import { TimetableGrid } from "../TimetableGrid";
import { TimetableTable } from "../TimetableTable";
import { StepWeights } from "./StepWeights";

// Rendering a full mini-grid for all (up to 200) combinations would be a real
// perf hit -- cap the visual preview to the top-scored N (already sorted) and
// fall back to a plain text row beyond that. Still clickable either way.
const GRID_PREVIEW_LIMIT = 12;

export function StepResults() {
  const groups = useGroupsStore((s) => s.groups);
  const removeGroup = useGroupsStore((s) => s.removeGroup);
  const courses = useCoursesStore((s) => s.courses);
  const semester = useCoursesStore((s) => s.semester);
  const customEvents = useCustomEventsStore((s) => s.events);
  const weights = useWeightsStore((s) => s.weights);
  const maxCredit = useCreditLimitStore((s) => s.maxCredit);
  const saveTimetable = useSavedTimetablesStore((s) => s.saveTimetable);
  const { running, result, error, run } = useCombinationWorker();

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [blackoutExport, setBlackoutExport] = useState(false);
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const prettyExportRef = useRef<HTMLDivElement>(null);

  const customEventCourses = useMemo(() => customEvents.map(customEventToCourseRow), [customEvents]);
  // 개인 일정은 groupsStore에 담기는 실제 과목이 아니지만, 그리드/표/저장 등 모든 화면에서
  // 과목과 동등하게 취급되도록 courseById 조회 대상에 함께 포함한다.
  const courseById = useMemo(
    () => new Map([...courses, ...customEventCourses].map((c) => [String(c.id), c])),
    [courses, customEventCourses]
  );

  const markGenerateAttempted = useWizardStore((s) => s.markGenerateAttempted);

  function handleGenerate() {
    markGenerateAttempted();
    // 빈 그룹은 조합 생성에 아무 기여도 못 하고 혼란만 주므로, 생성 시점에 자동으로 정리한다.
    const emptyGroupIds = groups.filter((g) => g.courseIds.length === 0).map((g) => g.id);
    emptyGroupIds.forEach(removeGroup);
    const remainingGroups = groups.filter((g) => g.courseIds.length > 0);
    const { groups: generatorGroups } = buildGenerationInput(remainingGroups, courses, customEventCourses);
    run({
      groups: generatorGroups,
      weights,
      maxCredit,
      minCredit: MIN_SCHOOL_CREDIT,
      maxResults: 200,
    });
    setSelectedIndex(null);
  }

  async function handleExportPng() {
    if (!prettyExportRef.current) return;
    await exportElementAsPng(prettyExportRef.current, "timetable.png");
  }

  function handleExportCsv() {
    if (selectedCourses.length === 0) return;
    exportTimetableAsCsv(selectedCourses, "timetable.csv");
  }

  function handleExportTxt() {
    if (selectedCourses.length === 0) return;
    exportTimetableAsTxt(selectedCourses, "timetable.txt");
  }

  function handleSaveTimetable() {
    if (!selected || !semester) return;
    saveTimetable({
      semester,
      courses: selectedCourses,
      totalCredit: selected.totalCredit,
      score: selected.score,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  }

  const selected = selectedIndex != null ? result?.combinations[selectedIndex] : undefined;
  const selectedCourses: CourseRow[] = selected
    ? selected.courseIds.map((id) => courseById.get(id)).filter((c): c is CourseRow => Boolean(c))
    : [];

  return (
    <div className="space-y-4">
      {groups.length === 0 && (
        <p className="text-sm text-text-secondary">그룹과 과목을 먼저 담아야 조합을 생성할 수 있습니다.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={running || groups.length === 0}
          className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white shadow-button transition-all duration-150 hover:bg-primary-hover active:scale-95 active:bg-primary-active active:shadow-none disabled:scale-100 disabled:bg-neutral/30 disabled:text-text-secondary disabled:shadow-none"
        >
          {running ? "생성 중..." : "시간표 조합 생성하기"}
        </button>
        <button
          type="button"
          onClick={() => setWeightsOpen(true)}
          className="rounded-full border border-neutral px-4 py-2 text-sm font-semibold transition-all duration-150 hover:border-primary hover:text-primary active:scale-95"
        >
          가중치 조정
        </button>
      </div>

      {weightsOpen && (
        <Modal title="우선순위(가중치) 조정" onClose={() => setWeightsOpen(false)}>
          <StepWeights />
        </Modal>
      )}

      {error && <p className="text-sm text-error">{error}</p>}

      {result && (
        <>
          {result.capped && (
            <p className="text-xs text-text-secondary">
              후보가 많아 일부만 탐색했습니다 — 상위 {result.combinations.length}개를 보여드립니다.
            </p>
          )}
          <p className="text-sm text-text-secondary">{result.combinations.length}개의 시간표 조합을 찾았습니다.</p>
          {result.combinations.length === 0 && (
            <p className="text-xs text-text-secondary">
              시간 충돌이 없는 조합이 없거나, 선택한 과목들의 학점 합이 {MIN_SCHOOL_CREDIT}~{MAX_SCHOOL_CREDIT}학점
              범위를 벗어났을 수 있어요. 우선순위 단계에서 목표 학점을 확인하거나 과목을 더 담아보세요.
            </p>
          )}

          <ul className="grid gap-2 sm:grid-cols-2">
            {result.combinations.map((combo, idx) => {
              const comboCourses = combo.courseIds
                .map((id) => courseById.get(id))
                .filter((c): c is CourseRow => Boolean(c));
              const isSelected = selectedIndex === idx;
              return (
                <li key={idx} className={idx >= GRID_PREVIEW_LIMIT ? "sm:col-span-2" : undefined}>
                  <button
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className={`w-full rounded-xl p-3 text-left text-sm shadow-card transition-all duration-150 hover:shadow-card-hover active:scale-[0.99] ${
                      isSelected ? "bg-primary-tint ring-2 ring-primary" : "bg-surface"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">#{idx + 1}</span>
                      <span className="text-text-secondary">
                        {combo.totalCredit}학점 · 점수 {combo.score.total.toFixed(1)}
                      </span>
                    </div>
                    {idx < GRID_PREVIEW_LIMIT ? (
                      <div className="mt-2">
                        <TimetableGrid courses={comboCourses} compact />
                      </div>
                    ) : (
                      <p className="mt-1 text-text-secondary">
                        {comboCourses.map((c) => c.courseName).join(", ") || "(선택 없음)"}
                      </p>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {selected && (
            <div className="space-y-3 rounded-xl bg-surface p-3 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {selectedCourses.length}과목 · {selected.totalCredit}학점
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1 text-xs text-text-secondary">
                    <input
                      type="checkbox"
                      checked={blackoutExport}
                      onChange={(e) => setBlackoutExport(e.target.checked)}
                    />
                    정보 가리기 (색 블록만)
                  </label>
                  <button
                    type="button"
                    onClick={handleExportPng}
                    className="rounded-full border border-neutral px-3 py-1 text-xs font-semibold transition-all duration-150 hover:border-primary hover:text-primary active:scale-95"
                  >
                    이미지로 저장
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="rounded-full border border-neutral px-3 py-1 text-xs font-semibold transition-all duration-150 hover:border-primary hover:text-primary active:scale-95"
                  >
                    CSV로 저장
                  </button>
                  <button
                    type="button"
                    onClick={handleExportTxt}
                    className="rounded-full border border-neutral px-3 py-1 text-xs font-semibold transition-all duration-150 hover:border-primary hover:text-primary active:scale-95"
                  >
                    텍스트로 저장
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTimetable}
                    className="rounded-full border border-neutral px-3 py-1 text-xs font-semibold transition-all duration-150 hover:border-primary hover:text-primary active:scale-95"
                  >
                    {savedNotice ? "저장됨 ✓" : "저장된 시간표에 추가"}
                  </button>
                </div>
              </div>

              <div className="grid gap-3 bg-background p-2 lg:grid-cols-2">
                <TimetableGrid courses={selectedCourses} />
                <TimetableTable courses={selectedCourses} />
              </div>

              {/* Off-screen (not display:none, so html-to-image can still rasterize it) --
                  the actual PNG export target: grid-only, 에타(Everytime)-style card, so the
                  shared image stays clean regardless of what's shown on screen above. */}
              <div className="fixed left-[-9999px] top-0" aria-hidden>
                <div ref={prettyExportRef}>
                  <TimetableExportCard courses={selectedCourses} blackout={blackoutExport} />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
