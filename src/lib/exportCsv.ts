import { triggerBrowserDownload } from "./browserDownload";
import { expandCourseSchedules } from "./expandSchedules";
import { DAY_LABELS, formatScheduleTime } from "./timeGrid";
import type { CourseRow } from "./types";

const HEADER = ["과목명", "학수번호", "교수", "요일", "시간", "강의실", "학점"];

function escapeCsvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * One row per schedule occurrence (a course meeting twice a week produces two
 * rows), matching how TimetableTable already displays the same combination —
 * so what the user sees in the results table and what they export line up.
 */
export function buildTimetableCsv(courses: CourseRow[]): string {
  const rows = expandCourseSchedules(courses).map(({ course, schedule }) => {
    const day = schedule?.dayOfWeek != null ? (DAY_LABELS[schedule.dayOfWeek] ?? "") : "";
    const start = formatScheduleTime(schedule?.startTime ?? null) ?? "";
    const end = formatScheduleTime(schedule?.endTime ?? null) ?? "";
    const time = start && end ? `${start} ~ ${end}` : (schedule?.rawText ?? "");
    return [course.courseName, course.courseNo, course.professor ?? "", day, time, schedule?.classroom ?? "", course.credit];
  });

  // Leading BOM so Excel (Korean locale in particular) reads the UTF-8 text
  // correctly instead of mangling it as the system codepage.
  return "\uFEFF" + [HEADER, ...rows].map((row) => row.map(escapeCsvField).join(",")).join("\r\n");
}

/** Client-only: triggers a browser download, must only run from an event handler. */
export function exportTimetableAsCsv(courses: CourseRow[], filename: string): void {
  const csv = buildTimetableCsv(courses);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  triggerBrowserDownload(url, filename);
  URL.revokeObjectURL(url);
}
