"use client";

import { useMemo, useState, type ReactNode } from "react";

import { getCompetitionRate } from "@/lib/competitionRate";
import { courseScheduleSegments } from "@/lib/courseScheduleSummary";
import type { CourseRow } from "@/lib/types";

export interface CourseTableExtraColumn {
  key: string;
  header: string;
  render: (row: { course: CourseRow }) => ReactNode;
}

export interface CourseTableProps {
  courses: CourseRow[];
  /** Per-row slot rendered before 강의명 (leftmost) -- e.g. a drag handle. */
  renderLeading?: (course: CourseRow) => ReactNode;
  /** Per-row action slot (add/remove button), rendered last (rightmost). */
  renderAction?: (course: CourseRow) => ReactNode;
  /** Appended after the standard 6 columns, before 비고/action. */
  extraColumns?: CourseTableExtraColumn[];
  showRemarks?: boolean;
  emptyMessage?: string;
  className?: string;
}

interface RowViewModel {
  key: string;
  course: CourseRow;
  timeLabel: string;
  classroom: string;
}

type SortKey = "courseName" | "courseNo" | "time" | "classroom" | "competition" | "professor";
type SortDir = "asc" | "desc";
interface SortState {
  key: SortKey;
  dir: SortDir;
}

// 같은 과목이 여러 요일에 걸쳐 열리더라도(예: 화,금) 한 행으로 합쳐서 보여준다 --
// 스케줄 발생 횟수만큼 행을 쪼개면 사용자 눈에는 "같은 과목이 중복 표시"되는
// 것처럼 보인다. 요일별로 한 줄씩 내보내는 CSV/TXT export(lib/expandSchedules.ts
// 사용)와는 의도적으로 다른 표현 방식 -- 화면 표는 사람이 훑어보는 용도라 합쳐
// 보여주는 쪽이 더 읽기 쉽다.
function buildRows(courses: CourseRow[]): RowViewModel[] {
  return courses.map((course) => {
    const segments = courseScheduleSegments(course);
    return {
      key: String(course.id),
      course,
      timeLabel: segments.length > 0 ? segments.map((s) => s.timeLabel).join(" / ") : "시간 미정",
      classroom: segments.length > 0 ? segments.map((s) => s.classroom ?? "-").join(" / ") : "-",
    };
  });
}

/** Earliest (day, start time) across a course's schedules as a single
 * sortable number (day*1440 + minutes-of-day) -- the displayed 시간 column
 * is a joined label string ("화 15:00~16:30 / 목 ...") that doesn't sort
 * usefully as text, so this is computed separately from the raw schedule
 * rows instead. Courses with no resolvable schedule (사이버강의, parse
 * failures) sort last in ascending order. */
function timeSortValue(course: CourseRow): number {
  const starts = course.schedules
    .filter((s) => s.dayOfWeek != null && s.startTime)
    .map((s) => {
      const [hours, minutes] = s.startTime!.split(":").map(Number);
      return s.dayOfWeek! * 1440 + hours * 60 + minutes;
    });
  return starts.length > 0 ? Math.min(...starts) : Number.POSITIVE_INFINITY;
}

const SORTABLE_COLUMNS: Record<SortKey, { label: string; getValue: (row: RowViewModel) => string | number }> = {
  courseName: { label: "강의명", getValue: (row) => row.course.courseName },
  courseNo: { label: "학수번호", getValue: (row) => `${row.course.courseNo}-${row.course.classNo}` },
  time: { label: "시간", getValue: (row) => timeSortValue(row.course) },
  classroom: { label: "강의실", getValue: (row) => row.classroom },
  competition: { label: "경쟁률", getValue: (row) => getCompetitionRate(row.course).rate },
  professor: { label: "교수명", getValue: (row) => row.course.professor ?? "" },
};

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "ko");
}

function Cell({ text, className = "max-w-[10rem]" }: { text: string; className?: string }) {
  return (
    <span className={`block truncate ${className}`} title={text}>
      {text}
    </span>
  );
}

function SortableHeader({
  sortKey,
  sort,
  onSort,
}: {
  sortKey: SortKey;
  sort: SortState | null;
  onSort: (key: SortKey) => void;
}) {
  const isActive = sort?.key === sortKey;
  return (
    <th className="px-2 py-1 font-medium">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-0.5 whitespace-nowrap font-medium transition-colors hover:text-primary"
      >
        {SORTABLE_COLUMNS[sortKey].label}
        <span aria-hidden className={`text-[10px] ${isActive ? "" : "invisible"}`}>
          {isActive && sort.dir === "desc" ? "▼" : "▲"}
        </span>
      </button>
    </th>
  );
}

export function CourseTable({
  courses,
  renderLeading,
  renderAction,
  extraColumns = [],
  showRemarks = false,
  emptyMessage = "표시할 과목이 없습니다.",
  className,
}: CourseTableProps) {
  const [sort, setSort] = useState<SortState | null>(null);
  const rows = useMemo(() => buildRows(courses), [courses]);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const { getValue } = SORTABLE_COLUMNS[sort.key];
    const sign = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => compareValues(getValue(a), getValue(b)) * sign);
  }, [rows, sort]);

  // 클릭하면 그 컬럼 기준 오름차순, 같은 컬럼을 한 번 더 클릭하면 내림차순으로
  // 뒤집힌다 -- 다른 컬럼을 클릭하면 항상 오름차순부터 다시 시작.
  function handleSort(key: SortKey) {
    setSort((current) => (current?.key === key ? { key, dir: current.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  return (
    <div className={`overflow-x-auto rounded-lg ${className ?? ""}`}>
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="text-text-secondary">
            {renderLeading && <th className="px-2 py-1" />}
            <SortableHeader sortKey="courseName" sort={sort} onSort={handleSort} />
            <SortableHeader sortKey="courseNo" sort={sort} onSort={handleSort} />
            <SortableHeader sortKey="time" sort={sort} onSort={handleSort} />
            <SortableHeader sortKey="classroom" sort={sort} onSort={handleSort} />
            <SortableHeader sortKey="competition" sort={sort} onSort={handleSort} />
            <SortableHeader sortKey="professor" sort={sort} onSort={handleSort} />
            {extraColumns.map((col) => (
              <th key={col.key} className="px-2 py-1 font-medium">
                {col.header}
              </th>
            ))}
            {showRemarks && <th className="px-2 py-1 font-medium">비고</th>}
            {renderAction && <th className="px-2 py-1" />}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => {
            const competitionRate = getCompetitionRate(row.course);
            return (
              <tr key={row.key} className="border-t border-neutral/40">
                {renderLeading && <td className="px-2 py-1">{renderLeading(row.course)}</td>}
                <td className="px-2 py-1 font-medium">
                  <Cell text={row.course.courseName} />
                </td>
                <td className="px-2 py-1 text-text-secondary">
                  <Cell text={`${row.course.courseNo}-${row.course.classNo}`} />
                </td>
                <td className="px-2 py-1 text-text-secondary">
                  <Cell text={row.timeLabel} className="max-w-[12rem]" />
                </td>
                <td className="px-2 py-1 text-text-secondary">
                  <Cell text={row.classroom} />
                </td>
                <td className="px-2 py-1 text-text-secondary">
                  <span
                    className="block truncate"
                    title={
                      competitionRate.isMock
                        ? "실제 신청 인원 데이터가 아직 없어 임의로 표시한 값입니다"
                        : undefined
                    }
                  >
                    {competitionRate.enrolled}/{competitionRate.capacity} ({competitionRate.rate.toFixed(2)})
                    {competitionRate.isMock && <span className="text-neutral">*</span>}
                  </span>
                </td>
                <td className="px-2 py-1 text-text-secondary">
                  <Cell text={row.course.professor ?? "-"} />
                </td>
                {extraColumns.map((col) => (
                  <td key={col.key} className="px-2 py-1 text-text-secondary">
                    {col.render({ course: row.course })}
                  </td>
                ))}
                {showRemarks && (
                  <td className="px-2 py-1 text-text-secondary">
                    <Cell text={row.course.remarks ?? "-"} />
                  </td>
                )}
                {renderAction && <td className="px-2 py-1">{renderAction(row.course)}</td>}
              </tr>
            );
          })}
          {sortedRows.length === 0 && (
            <tr>
              <td
                className="px-2 py-1 text-text-secondary"
                colSpan={
                  6 + extraColumns.length + (showRemarks ? 1 : 0) + (renderAction ? 1 : 0) + (renderLeading ? 1 : 0)
                }
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
