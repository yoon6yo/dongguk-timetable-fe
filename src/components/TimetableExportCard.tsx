import { TimetableGrid } from "./TimetableGrid";
import type { CourseRow } from "@/lib/types";

/**
 * The DOM subtree actually rasterized for PNG export -- grid only (no detail
 * table), styled like a shareable 에타(Everytime)-style timetable card:
 * generous padding, rounded card, small caption. Kept as its own component
 * so the "pretty" export view and the on-screen grid+table view can differ
 * without duplicating export wiring at each call site (StepResults, saved
 * timetables detail).
 */
export function TimetableExportCard({ courses, blackout = false }: { courses: CourseRow[]; blackout?: boolean }) {
  const totalCredit = courses.reduce((sum, c) => sum + (Number(c.credit) || 0), 0);

  return (
    <div className="w-fit rounded-2xl bg-background p-4">
      <TimetableGrid courses={courses} blackout={blackout} />
      {!blackout && (
        <p className="mt-2 text-center text-[11px] text-text-secondary">
          {courses.length}과목 · {totalCredit}학점 · 동국대 시간표 마법사
        </p>
      )}
    </div>
  );
}
