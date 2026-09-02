"use client";

import { useMemo, useState, type ReactNode } from "react";

import { listColleges, listCourseTypes, listDepartments, searchCourses, type CourseSortOption } from "@/lib/courseSearch";
import { DAY_LABELS } from "@/lib/timeGrid";
import type { CourseRow } from "@/lib/types";

import { CourseTable } from "./CourseTable";

const SEARCH_RESULT_LIMIT = 50;

/**
 * Filter form + result table for browsing the full course catalog --
 * shared by Watchlist (search to track competition rate) and StepGroups'
 * AddCourseModal (search to add to a specific group). Previously each
 * screen carried its own independent copy of this exact filter/table
 * markup; `renderAction` is the only thing that actually differs between
 * the two callers, so it's the only thing left as a prop.
 */
export function CourseSearchPanel({
  courses,
  defaultSort = "default",
  resultsMaxHeightClassName = "max-h-96",
  renderAction,
}: {
  courses: CourseRow[];
  defaultSort?: CourseSortOption;
  resultsMaxHeightClassName?: string;
  renderAction: (course: CourseRow) => ReactNode;
}) {
  const [college, setCollege] = useState("");
  const [department, setDepartment] = useState("");
  const [courseType, setCourseType] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [sort, setSort] = useState<CourseSortOption>(defaultSort);
  // 한글 IME 조합 중에도 그때그때의 입력값을 그대로 검색어로 써도 된다 --
  // 조합 중인 음절은 아직 courseName 등에 없는 문자열이라 자연히 매칭되지
  // 않다가, 음절이 완성되는 순간부터 자동으로 결과가 나타난다.
  const [query, setQuery] = useState("");

  const colleges = useMemo(() => listColleges(courses), [courses]);
  const departments = useMemo(() => listDepartments(courses, college || undefined), [courses, college]);
  const courseTypes = useMemo(() => listCourseTypes(courses), [courses]);
  const allResults = useMemo(
    () =>
      searchCourses(courses, {
        college: college || undefined,
        department: department || undefined,
        courseType: courseType || undefined,
        dayOfWeek: dayOfWeek ? Number(dayOfWeek) : undefined,
        sort,
        query,
      }),
    [courses, college, department, courseType, dayOfWeek, sort, query]
  );
  const results = allResults.slice(0, SEARCH_RESULT_LIMIT);
  const hasActiveFilters = Boolean(college || department || courseType || dayOfWeek || query);

  function resetFilters() {
    setCollege("");
    setDepartment("");
    setCourseType("");
    setDayOfWeek("");
    setQuery("");
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select
          value={college}
          onChange={(e) => {
            setCollege(e.target.value);
            setDepartment("");
          }}
          className="rounded-lg border border-neutral px-2 py-1.5 text-xs"
        >
          <option value="">전체 단과대</option>
          {colleges.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="rounded-lg border border-neutral px-2 py-1.5 text-xs"
        >
          <option value="">전체 학과</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={courseType}
          onChange={(e) => setCourseType(e.target.value)}
          className="rounded-lg border border-neutral px-2 py-1.5 text-xs"
        >
          <option value="">전체 영역구분</option>
          {courseTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(e.target.value)}
          className="rounded-lg border border-neutral px-2 py-1.5 text-xs"
        >
          <option value="">전체 요일</option>
          {Object.entries(DAY_LABELS).map(([day, label]) => (
            <option key={day} value={day}>
              {label}요일
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="과목명 / 학수번호 / 교수명 검색"
          autoFocus
          className="flex-1 rounded-lg border border-neutral px-2 py-1.5 text-xs outline-none focus:border-primary"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as CourseSortOption)}
          className="rounded-lg border border-neutral px-2 py-1.5 text-xs"
        >
          <option value="default">기본 순서</option>
          <option value="competition">경쟁률순</option>
          <option value="credit">학점순</option>
        </select>
      </div>

      {allResults.length > SEARCH_RESULT_LIMIT && (
        <p className="text-xs text-text-secondary">
          검색 결과가 많아 상위 {SEARCH_RESULT_LIMIT}개만 보여드려요 — 검색어나 단과대/학과로 좁혀보세요.
        </p>
      )}

      <div className={`${resultsMaxHeightClassName} overflow-y-auto`}>
        <CourseTable
          courses={results}
          showRemarks
          emptyMessage={
            hasActiveFilters ? (
              <span>
                조건에 맞는 과목이 없어요.{" "}
                <button
                  type="button"
                  onClick={resetFilters}
                  className="font-semibold text-primary underline decoration-primary-tint underline-offset-2 hover:text-primary-hover"
                >
                  필터 초기화
                </button>
              </span>
            ) : (
              "검색 결과가 없습니다."
            )
          }
          extraColumns={[{ key: "dept", header: "학과", render: ({ course }) => course.department ?? course.college }]}
          renderAction={renderAction}
        />
      </div>
    </div>
  );
}
