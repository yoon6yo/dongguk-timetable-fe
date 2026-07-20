import type { Queryable } from "./db";
import type { CourseRow, ScheduleRow } from "./types";

type CourseRowWithoutSchedules = Omit<CourseRow, "schedules">;
type ScheduleRowWithCourseId = ScheduleRow & { courseId: number };

/**
 * Two flat queries + in-memory grouping, rather than a JOIN with
 * server-side aggregation — a course's schedule count is small (at most a
 * handful of rows), and this keeps the SQL simple and the row-shape mapping
 * obvious. Returns [] (not an error) when the semester has no courses yet.
 */
export async function getCoursesForSemester(db: Queryable, semesterId: number): Promise<CourseRow[]> {
  const [courseRows] = await db.query<CourseRowWithoutSchedules>(
    `SELECT
       id, course_no AS courseNo, class_no AS classNo, course_name AS courseName,
       professor, college, department, credit, capacity, applied_count AS appliedCount, remarks
     FROM courses
     WHERE semester_id = ?
     ORDER BY course_no, class_no`,
    [semesterId]
  );

  if (courseRows.length === 0) {
    return [];
  }

  const courseIds = courseRows.map((row) => row.id);
  const placeholders = courseIds.map(() => "?").join(", ");
  const [scheduleRows] = await db.query<ScheduleRowWithCourseId>(
    `SELECT
       course_id AS courseId, day_of_week AS dayOfWeek, period_start AS periodStart,
       period_end AS periodEnd, start_time AS startTime, end_time AS endTime,
       classroom, raw_text AS rawText
     FROM schedules
     WHERE course_id IN (${placeholders})`,
    courseIds
  );

  const schedulesByCourseId = new Map<number, ScheduleRow[]>();
  for (const { courseId, ...schedule } of scheduleRows) {
    const list = schedulesByCourseId.get(courseId) ?? [];
    list.push(schedule);
    schedulesByCourseId.set(courseId, list);
  }

  return courseRows.map((course) => ({
    ...course,
    schedules: schedulesByCourseId.get(course.id) ?? [],
  }));
}
