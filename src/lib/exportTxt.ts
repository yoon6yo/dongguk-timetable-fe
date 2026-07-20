import { triggerBrowserDownload } from "./browserDownload";
import { DAY_LABELS, formatScheduleTime } from "./timeGrid";
import type { CourseRow } from "./types";

/** Plain-text timetable summary — one block per course with every schedule
 * row, meant for pasting into a text field/chat rather than opening a
 * spreadsheet (that's what the CSV export is for). */
export function buildTimetableTxt(courses: CourseRow[]): string {
  const totalCredit = courses.reduce((sum, c) => sum + (Number(c.credit) || 0), 0);
  const lines = [`시간표 (${courses.length}과목 · ${totalCredit}학점)`, ""];

  for (const course of courses) {
    lines.push(`${course.courseName} (${course.courseNo}-${course.classNo})`);
    lines.push(`  교수: ${course.professor ?? "미정"} · 학점: ${course.credit}`);

    if (course.schedules.length === 0) {
      lines.push("  시간 미정");
    } else {
      for (const schedule of course.schedules) {
        const day = schedule.dayOfWeek != null ? (DAY_LABELS[schedule.dayOfWeek] ?? "?") : null;
        const start = formatScheduleTime(schedule.startTime);
        const end = formatScheduleTime(schedule.endTime);
        const time = day && start && end ? `${day} ${start}~${end}` : schedule.rawText;
        lines.push(`  ${time}${schedule.classroom ? ` · ${schedule.classroom}` : ""}`);
      }
    }

    if (course.remarks) lines.push(`  비고: ${course.remarks}`);
    lines.push("");
  }

  return lines.join("\n");
}

/** Client-only: triggers a browser download, must only run from an event handler. */
export function exportTimetableAsTxt(courses: CourseRow[], filename: string): void {
  const txt = buildTimetableTxt(courses);
  const blob = new Blob([txt], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  triggerBrowserDownload(url, filename);
  URL.revokeObjectURL(url);
}
