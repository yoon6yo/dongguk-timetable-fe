import { getCompetitionRate } from "@/lib/competitionRate";
import { expandCourseSchedules } from "@/lib/expandSchedules";
import { DAY_LABELS, formatScheduleTime } from "@/lib/timeGrid";
import type { CourseRow } from "@/lib/types";

export function TimetableTable({ courses }: { courses: CourseRow[] }) {
  const rows = expandCourseSchedules(courses);

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface">
          <tr>
            <th className="p-2 font-medium">과목명</th>
            <th className="p-2 font-medium">학수번호</th>
            <th className="p-2 font-medium">교수</th>
            <th className="p-2 font-medium">요일</th>
            <th className="p-2 font-medium">시간</th>
            <th className="p-2 font-medium">강의실</th>
            <th className="p-2 font-medium">학점</th>
            <th className="p-2 font-medium">경쟁률</th>
            <th className="p-2 font-medium">비고</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ course, schedule }, idx) => {
            const day = schedule?.dayOfWeek != null ? DAY_LABELS[schedule.dayOfWeek] : null;
            const start = formatScheduleTime(schedule?.startTime ?? null);
            const end = formatScheduleTime(schedule?.endTime ?? null);
            const competitionRate = getCompetitionRate(course);
            return (
              <tr key={idx} className="border-t border-neutral">
                <td className="p-2">{course.courseName}</td>
                <td className="p-2 text-text-secondary">
                  {course.courseNo}-{course.classNo}
                </td>
                <td className="p-2">{course.professor ?? "-"}</td>
                <td className="p-2">{day ?? (schedule ? "확인 필요" : "-")}</td>
                <td className="p-2">{start && end ? `${start} ~ ${end}` : (schedule?.rawText ?? "-")}</td>
                <td className="p-2">{schedule?.classroom ?? "-"}</td>
                <td className="p-2">{course.credit}</td>
                <td className="p-2">
                  {competitionRate.rate.toFixed(2)}
                  {competitionRate.isMock && <span className="text-neutral"> ·추정</span>}
                </td>
                <td className="p-2 text-text-secondary">{course.remarks ?? "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
