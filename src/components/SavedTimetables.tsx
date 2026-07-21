"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { exportTimetableAsCsv } from "@/lib/exportCsv";
import { exportElementAsPng } from "@/lib/exportImage";
import { exportTimetableAsTxt } from "@/lib/exportTxt";
import {
  savedTimetableDisplayName,
  useSavedTimetablesStore,
  type SavedTimetable,
} from "@/store/savedTimetablesStore";

import { CourseTable } from "./CourseTable";
import { TimetableExportCard } from "./TimetableExportCard";
import { TimetableGrid } from "./TimetableGrid";

export function SavedTimetables() {
  const saved = useSavedTimetablesStore((s) => s.saved);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = saved.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">저장된 시간표</h1>
        <Link href="/" className="text-sm font-medium text-primary hover:text-primary-hover">
          ← 시간표 만들기로
        </Link>
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

      {selected && <SavedDetail item={selected} />}
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
      className={`rounded-xl p-3 shadow-card transition-all duration-150 hover:shadow-card-hover ${
        isSelected ? "bg-primary-tint ring-2 ring-primary" : "bg-surface"
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

function SavedDetail({ item }: { item: SavedTimetable }) {
  const exportRef = useRef<HTMLDivElement>(null);

  async function handleExportPng() {
    if (!exportRef.current) return;
    await exportElementAsPng(exportRef.current, "timetable.png");
  }

  return (
    <div className="mt-4 space-y-3 rounded-xl bg-surface p-3 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {item.courses.length}과목 · {item.totalCredit}학점
        </p>
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
            onClick={() => exportTimetableAsCsv(item.courses, "timetable.csv")}
            className="rounded-full border border-neutral px-3 py-1 text-xs font-semibold transition-all duration-150 hover:border-primary hover:text-primary active:scale-95"
          >
            CSV로 저장
          </button>
          <button
            type="button"
            onClick={() => exportTimetableAsTxt(item.courses, "timetable.txt")}
            className="rounded-full border border-neutral px-3 py-1 text-xs font-semibold transition-all duration-150 hover:border-primary hover:text-primary active:scale-95"
          >
            텍스트로 저장
          </button>
        </div>
      </div>

      <div className="grid gap-3 bg-background p-2 lg:grid-cols-2">
        <TimetableGrid courses={item.courses} />
        <CourseTable courses={item.courses} mode="expanded" showRemarks />
      </div>

      {/* Off-screen PNG export target -- grid-only 에타 스타일 card, same as StepResults. */}
      <div className="fixed left-[-9999px] top-0" aria-hidden>
        <div ref={exportRef}>
          <TimetableExportCard courses={item.courses} />
        </div>
      </div>
    </div>
  );
}
