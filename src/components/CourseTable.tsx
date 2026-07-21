import type { ReactNode } from "react";

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

function Cell({ text, className = "max-w-[10rem]" }: { text: string; className?: string }) {
  return (
    <span className={`block truncate ${className}`} title={text}>
      {text}
    </span>
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
  const rows = buildRows(courses);

  return (
    <div className={`overflow-x-auto rounded-lg ${className ?? ""}`}>
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="text-text-secondary">
            {renderLeading && <th className="p-2" />}
            <th className="p-2 font-medium">강의명</th>
            <th className="p-2 font-medium">학수번호</th>
            <th className="p-2 font-medium">시간</th>
            <th className="p-2 font-medium">강의실</th>
            <th className="p-2 font-medium">경쟁률</th>
            <th className="p-2 font-medium">교수명</th>
            {extraColumns.map((col) => (
              <th key={col.key} className="p-2 font-medium">
                {col.header}
              </th>
            ))}
            {showRemarks && <th className="p-2 font-medium">비고</th>}
            {renderAction && <th className="p-2" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const competitionRate = getCompetitionRate(row.course);
            return (
              <tr key={row.key} className="border-t border-neutral/40">
                {renderLeading && <td className="p-2">{renderLeading(row.course)}</td>}
                <td className="p-2 font-medium">
                  <Cell text={row.course.courseName} />
                </td>
                <td className="p-2 text-text-secondary">
                  <Cell text={`${row.course.courseNo}-${row.course.classNo}`} />
                </td>
                <td className="p-2 text-text-secondary">
                  <Cell text={row.timeLabel} className="max-w-[12rem]" />
                </td>
                <td className="p-2 text-text-secondary">
                  <Cell text={row.classroom} />
                </td>
                <td className="p-2 text-text-secondary">
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
                <td className="p-2 text-text-secondary">
                  <Cell text={row.course.professor ?? "-"} />
                </td>
                {extraColumns.map((col) => (
                  <td key={col.key} className="p-2 text-text-secondary">
                    {col.render({ course: row.course })}
                  </td>
                ))}
                {showRemarks && (
                  <td className="p-2 text-text-secondary">
                    <Cell text={row.course.remarks ?? "-"} />
                  </td>
                )}
                {renderAction && <td className="p-2">{renderAction(row.course)}</td>}
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td
                className="p-2 text-text-secondary"
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
