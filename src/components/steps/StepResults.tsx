"use client";

import { useMemo, useRef, useState } from "react";

import { buildGenerationInput } from "@/lib/buildGenerationInput";
import { exportTimetableAsCsv } from "@/lib/exportCsv";
import { exportElementAsPng } from "@/lib/exportImage";
import type { CourseRow } from "@/lib/types";
import { useCombinationWorker } from "@/hooks/useCombinationWorker";
import { useCoursesStore } from "@/store/coursesStore";
import { useCreditLimitStore } from "@/store/creditLimitStore";
import { useGroupsStore } from "@/store/groupsStore";
import { useWeightsStore } from "@/store/weightsStore";

import { TimetableGrid } from "../TimetableGrid";
import { TimetableTable } from "../TimetableTable";

export function StepResults() {
  const groups = useGroupsStore((s) => s.groups);
  const courses = useCoursesStore((s) => s.courses);
  const weights = useWeightsStore((s) => s.weights);
  const maxCredit = useCreditLimitStore((s) => s.maxCredit);
  const { running, result, error, run } = useCombinationWorker();

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [view, setView] = useState<"grid" | "table">("grid");
  const exportRef = useRef<HTMLDivElement>(null);

  const courseById = useMemo(() => new Map(courses.map((c) => [String(c.id), c])), [courses]);

  function handleGenerate() {
    const { groups: generatorGroups } = buildGenerationInput(groups, courses);
    run({
      groups: generatorGroups,
      weights,
      maxCredit,
      maxResults: 200,
    });
    setSelectedIndex(null);
  }

  async function handleExportPng() {
    if (!exportRef.current) return;
    await exportElementAsPng(exportRef.current, "timetable.png");
  }

  function handleExportCsv() {
    if (selectedCourses.length === 0) return;
    exportTimetableAsCsv(selectedCourses, "timetable.csv");
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

      <button
        type="button"
        onClick={handleGenerate}
        disabled={running || groups.length === 0}
        className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white shadow-button transition-all duration-150 hover:bg-primary-hover active:scale-95 active:bg-primary-active active:shadow-none disabled:scale-100 disabled:bg-neutral/30 disabled:text-text-secondary disabled:shadow-none"
      >
        {running ? "생성 중..." : "시간표 조합 생성하기"}
      </button>

      {error && <p className="text-sm text-error">{error}</p>}

      {result && (
        <>
          {result.capped && (
            <p className="text-xs text-text-secondary">
              후보가 많아 일부만 탐색했습니다 — 상위 {result.combinations.length}개를 보여드립니다.
            </p>
          )}
          <p className="text-sm text-text-secondary">{result.combinations.length}개의 시간표 조합을 찾았습니다.</p>

          <ul className="space-y-2">
            {result.combinations.map((combo, idx) => (
              <li key={idx}>
                <button
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  className={`w-full rounded-xl p-3 text-left text-sm shadow-card transition-all duration-150 hover:shadow-card-hover active:scale-[0.99] ${
                    selectedIndex === idx ? "bg-primary-tint ring-2 ring-primary" : "bg-surface"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">#{idx + 1}</span>
                    <span className="text-text-secondary">{combo.totalCredit}학점</span>
                  </div>
                  <p className="mt-1 text-text-secondary">
                    {combo.courseIds
                      .map((id) => courseById.get(id)?.courseName)
                      .filter(Boolean)
                      .join(", ") || "(선택 없음)"}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          {selected && (
            <div className="space-y-3 rounded-xl bg-surface p-3 shadow-card">
              <div className="flex items-center justify-between">
                <div className="flex gap-2 rounded-full bg-neutral/20 p-1">
                  <button
                    type="button"
                    onClick={() => setView("grid")}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                      view === "grid" ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:bg-neutral/30"
                    }`}
                  >
                    그리드
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("table")}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                      view === "table" ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:bg-neutral/30"
                    }`}
                  >
                    표
                  </button>
                </div>
                <div className="flex gap-2">
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
                </div>
              </div>

              <div ref={exportRef} className="bg-background p-2">
                {view === "grid" ? <TimetableGrid courses={selectedCourses} /> : <TimetableTable courses={selectedCourses} />}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
