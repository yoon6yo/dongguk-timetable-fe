export interface SemesterRow {
  id: number;
  year: number;
  semesterCode: string;
  label: string;
  /** ISO datetime string (or null if never synced) — see loader.py's
   * _touch_semester_sync. */
  coursesSyncedAt: string | null;
  appliedCountSyncedAt: string | null;
}

export interface ScheduleRow {
  dayOfWeek: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  startTime: string | null;
  endTime: string | null;
  classroom: string | null;
  rawText: string;
}

export interface CourseRow {
  id: number;
  courseNo: string;
  classNo: string;
  courseName: string;
  professor: string | null;
  college: string;
  department: string | null;
  credit: string;
  courseType: string;
  detailCurriculum: string | null;
  lectureStyle: string | null;
  capacity: number | null;
  appliedCount: number | null;
  remarks: string | null;
  schedules: ScheduleRow[];
}
