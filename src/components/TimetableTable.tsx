import { CourseTable } from "./CourseTable";
import type { CourseRow } from "@/lib/types";

export function TimetableTable({ courses }: { courses: CourseRow[] }) {
  return (
    <CourseTable
      courses={courses}
      showRemarks
      className="border border-neutral"
      extraColumns={[{ key: "credit", header: "학점", render: ({ course }) => course.credit }]}
    />
  );
}
