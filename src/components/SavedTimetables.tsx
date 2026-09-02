"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { exportTimetableAsCsv } from "@/lib/exportCsv";
import { exportElementAsPng } from "@/lib/exportImage";
import { exportTimetableAsTxt } from "@/lib/exportTxt";
import { refreshCompetitionRate } from "@/lib/refreshCompetitionRate";
import {
  savedTimetableDisplayName,
  useSavedTimetablesStore,
  type SavedTimetable,
} from "@/store/savedTimetablesStore";
import { useCoursesStore } from "@/store/coursesStore";

import { CourseTable } from "./CourseTable";
import { Modal } from "./Modal";
import { TimetableExportCard } from "./TimetableExportCard";
import { TimetableGrid } from "./TimetableGrid";

export function SavedTimetables() {
  const saved = useSavedTimetablesStore((s) => s.saved);
  const fetchCourses = useCoursesStore((s) => s.fetchCourses);

  // 저장된 시간표는 저장 시점의 capacity/appliedCount를 그대로 얼려서 갖고
  // 있어서(savedTimetablesStore 참고), 최신 학기 카탈로그를 불러와야
  // SavedDetail이 학수번호 기준으로 경쟁률을 갱신해 보여줄 수 있다.
  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = saved.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">저장된 시간표</h1>
        <div className="flex gap-3 text-sm font-medium">
          <Link href="/" className="text-text-secondary hover:text-primary">
            홈
          </Link>
          <Link href="/wizard" className="text-primary hover:text-primary-hover">
            시간표 만들기로
          </Link>
        </div>
      </div>

      {saved.length === 0 && (
        <p className="text-sm text-text-secondary">
          아직 저장된 시간표가 없습니다. 결과 화면에서 마음에 드는 조합을 &ldquo;저장된 시간표에 추가&rdquo;로
          담아보세요.
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {saved.map((item) => (
          <SavedCard
            key={item.id}
            item={item}
            isSelected={item.id === selectedId}
            onSelect={() => setSelectedId(item.id === selectedId ? null : item.id)}
          />
        ))}
      </div>

      {selected && <SavedDetail item={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function SavedCard({
  item,
  isSelected,
  onSelect,
}: {
  item: SavedTimetable;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const removeTimetable = useSavedTimetablesStore((s) => s.removeTimetable);
  const renameTimetable = useSavedTimetablesStore((s) => s.renameTimetable);
  const displayName = savedTimetableDisplayName(item);

  return (
    <div
      className={`rounded-lg border p-3 shadow-card transition-all duration-150 hover:shadow-card-hover ${
        isSelected ? "border-primary/30 bg-primary-tint ring-2 ring-primary" : "border-neutral/15 bg-surface"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <input
          type="text"
          value={item.label}
          onChange={(e) => renameTimetable(item.id, e.target.value)}
          placeholder={displayName}
          className="min-w-0 flex-1 rounded border border-transparent bg-transparent text-sm font-medium outline-none transition-colors hover:border-neutral focus:border-primary placeholder:font-normal placeholder:text-text-secondary"
        />
        <button
          type="button"
          onClick={() => removeTimetable(item.id)}
          aria-label={`${displayName} 삭제`}
          className="shrink-0 rounded-md px-1 text-text-secondary transition-all duration-150 hover:text-error active:scale-95"
        >
          삭제
        </button>
      </div>
      <p className="mb-2 text-xs text-text-secondary">
        {item.semesterLabel} · {item.courses.length}과목 · {item.totalCredit}학점 · 점수{" "}
        {item.score.total.toFixed(1)}
      </p>
      <button type="button" onClick={onSelect} className="w-full text-left">
        <TimetableGrid courses={item.courses} compact />
      </button>
    </div>
  );
}

function SavedDetail({ item, onClose }: { item: SavedTimetable; onClose: () => void }) {
  const exportRef = useRef<HTMLDivElement>(null);
  const liveSemesterId = useCoursesStore((s) => s.semester?.id ?? null);
  const liveCourses = useCoursesStore((s) => s.courses);
  const [exportOpen, setExportOpen] = useState(false);
  const coursesWithFreshRate = useMemo(
    () => refreshCompetitionRate(item.courses, item.semesterId, liveSemesterId, liveCourses),
    [item.courses, item.semesterId, liveSemesterId, liveCourses]
  );

  async function handleExportPng() {
    if (!exportRef.current) return;
    await exportElementAsPng(exportRef.current, "timetable.png");
  }

  return (
    <Modal title="저장된 시간표" onClose={onClose} maxWidthClassName="max-w-6xl">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-text-secondary">
            {item.courses.length}과목 · {item.totalCredit}학점
          </p>
          {/* A small anchored dropdown, not an inline row -- see
              StepResults.tsx for why: a row revealed below a right-aligned
              trigger started from the left edge, disconnected from the
              button that opened it. */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen((v) => !v)}
              aria-expanded={exportOpen}
              className="flex items-center gap-1 rounded-full border border-neutral px-3 py-1 text-xs font-semibold transition-all duration-150 hover:border-primary hover:text-primary active:scale-95"
            >
              내보내기
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className={`h-3 w-3 transition-transform duration-150 ${exportOpen ? "rotate-180" : ""}`}
              >
                <path d="M5 7.5L10 12.5L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-40 space-y-0.5 rounded-lg border border-neutral/20 bg-surface p-1.5 shadow-card-hover">
                <button
                  type="button"
                  onClick={() => {
                    handleExportPng();
                    setExportOpen(false);
                  }}
                  className="block w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors duration-150 hover:bg-neutral/15"
                >
                  이미지(PNG)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportTimetableAsCsv(item.courses, "timetable.csv");
                    setExportOpen(false);
                  }}
                  className="block w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors duration-150 hover:bg-neutral/15"
                >
                  CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportTimetableAsTxt(item.courses, "timetable.txt");
                    setExportOpen(false);
                  }}
                  className="block w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors duration-150 hover:bg-neutral/15"
                >
                  텍스트
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stacked, not side-by-side -- see StepResults.tsx for why:
            side-by-side kept failing at every width tried. Non-compact now
            that the grid has a full row to itself. */}
        <div className="space-y-3 bg-background p-2">
          <TimetableGrid courses={item.courses} />
          <CourseTable courses={coursesWithFreshRate} showRemarks />
        </div>

        {/* Off-screen PNG export target -- grid-only 에타 스타일 card, same as StepResults. */}
        <div className="fixed left-[-9999px] top-0" aria-hidden>
          <div ref={exportRef}>
            <TimetableExportCard courses={item.courses} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
