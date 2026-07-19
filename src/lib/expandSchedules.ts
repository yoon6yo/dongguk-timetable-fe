import type { CourseRow, ScheduleRow } from "./types";

export interface CourseScheduleRow {
  course: CourseRow;
  schedule: ScheduleRow | null;
}

/** One row per schedule occurrence, falling back to a single null-schedule
 * row for a course with none — shared by every place that lists courses
 * schedule-by-schedule (results table, CSV export) so they can't drift
 * out of sync with each other on how a scheduleless course is handled. */
export function expandCourseSchedules(courses: CourseRow[]): CourseScheduleRow[] {
  return courses.flatMap((course): CourseScheduleRow[] =>
    course.schedules.length > 0
      ? course.schedules.map((schedule): CourseScheduleRow => ({ course, schedule }))
      : [{ course, schedule: null }]
  );
}
