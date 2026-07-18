export interface SemesterRow {
  id: number;
  year: number;
  semesterCode: string;
  label: string;
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
  courseNameEn: string | null;
  professor: string | null;
  college: string;
  department: string | null;
  major: string | null;
  credit: string;
  courseType: string;
  detailCurriculum: string | null;
  lectureStyle: string | null;
  lectureType: string | null;
  targetGrade: string | null;
  capacity: number | null;
  enrolled: number | null;
  gradeType: string | null;
  evalMethod: string | null;
  lectureRegion: string | null;
  remarks: string | null;
  schedules: ScheduleRow[];
}
