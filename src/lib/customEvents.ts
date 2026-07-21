import type { CustomEvent } from "@/store/customEventsStore";

import { DAY_LABELS } from "./timeGrid";
import type { CourseRow } from "./types";

/**
 * Synthesizes a CourseRow-shaped object for a personal (non-course) event so
 * it flows through TimetableGrid/TimetableTable/CourseTable/conflict-checking
 * unchanged, with equal standing to a real course -- see buildGenerationInput
 * for how it's folded into combination generation as an always-required pick.
 */
export function customEventToCourseRow(event: CustomEvent): CourseRow {
  const rawText = `${DAY_LABELS[event.dayOfWeek] ?? ""} ${event.startTime}~${event.endTime}`;
  return {
    id: event.id,
    courseNo: "개인일정",
    classNo: "-",
    courseName: event.name,
    professor: null,
    college: "개인 일정",
    department: null,
    credit: "0",
    courseType: "개인 일정",
    detailCurriculum: null,
    lectureStyle: null,
    capacity: null,
    appliedCount: null,
    remarks: null,
    schedules: [
      {
        dayOfWeek: event.dayOfWeek,
        periodStart: null,
        periodEnd: null,
        startTime: `${event.startTime}:00`,
        endTime: `${event.endTime}:00`,
        classroom: null,
        rawText,
      },
    ],
  };
}
