import { DAY_LABELS } from "@/lib/timeGrid";
import type { CourseRow, ScheduleRow } from "@/lib/types";

interface Row {
  course: CourseRow;
  schedule: ScheduleRow | null;
}

function toRows(courses: CourseRow[]): Row[] {
  return courses.flatMap((course): Row[] =>
    course.schedules.length > 0
      ? course.schedules.map((schedule): Row => ({ course, schedule }))
      : [{ course, schedule: null }]
  );
}

function formatTime(time: string | null): string | null {
  return time ? time.slice(0, 5) : null;
}

export function TimetableTable({ courses }: { courses: CourseRow[] }) {
  const rows = toRows(courses);

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface">
          <tr>
            <th className="p-2 font-medium">과목명</th>
            <th className="p-2 font-medium">교수</th>
            <th className="p-2 font-medium">요일</th>
            <th className="p-2 font-medium">시간</th>
            <th className="p-2 font-medium">강의실</th>
            <th className="p-2 font-medium">학점</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ course, schedule }, idx) => {
            const day = schedule?.dayOfWeek != null ? DAY_LABELS[schedule.dayOfWeek] : null;
            const start = formatTime(schedule?.startTime ?? null);
            const end = formatTime(schedule?.endTime ?? null);
            return (
              <tr key={idx} className="border-t border-neutral">
                <td className="p-2">{course.courseName}</td>
                <td className="p-2">{course.professor ?? "-"}</td>
                <td className="p-2">{day ?? (schedule ? "확인 필요" : "-")}</td>
                <td className="p-2">{start && end ? `${start} ~ ${end}` : (schedule?.rawText ?? "-")}</td>
                <td className="p-2">{schedule?.classroom ?? "-"}</td>
                <td className="p-2">{course.credit}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
