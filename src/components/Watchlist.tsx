"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  listColleges,
  listCourseTypes,
  listDepartments,
  searchCourses,
  type CourseSortOption,
} from "@/lib/courseSearch";
import { formatSyncTime } from "@/lib/formatSyncTime";
import { DAY_LABELS } from "@/lib/timeGrid";
import type { CourseRow } from "@/lib/types";
import { useCoursesStore } from "@/store/coursesStore";
import { useWatchlistStore } from "@/store/watchlistStore";

import { CourseTable } from "./CourseTable";

const SEARCH_RESULT_LIMIT = 50;

export function Watchlist() {
  const semester = useCoursesStore((s) => s.semester);
  const courses = useCoursesStore((s) => s.courses);
  const status = useCoursesStore((s) => s.status);
  const error = useCoursesStore((s) => s.error);
  const fetchCourses = useCoursesStore((s) => s.fetchCourses);

  const courseIds = useWatchlistStore((s) => s.courseIds);
  const addCourse = useWatchlistStore((s) => s.addCourse);
  const removeCourse = useWatchlistStore((s) => s.removeCourse);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const watchedCourses = useMemo(
    () => courseIds.map((id) => courseById.get(id)).filter((c): c is CourseRow => Boolean(c)),
    [courseIds, courseById]
  );

  const [college, setCollege] = useState("");
  const [department, setDepartment] = useState("");
  const [courseType, setCourseType] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [sort, setSort] = useState<CourseSortOption>("competition");
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

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 py-8">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-xl font-bold">관심 강의 경쟁률</h1>
        <div className="flex gap-3 text-sm font-medium">
          <Link href="/" className="text-text-secondary hover:text-primary">
            홈
          </Link>
          <Link href="/wizard" className="text-primary hover:text-primary-hover">
            시간표 만들기로
          </Link>
        </div>
      </div>
      <p className="text-sm text-text-secondary">
        시간표 그룹에 담지 않은 과목도 검색해서 관심 목록에 추가하면 경쟁률만 따로 확인할 수 있어요.
      </p>
      {semester && (
        <p className="mt-1 text-xs text-text-secondary">경쟁률 {formatSyncTime(semester.appliedCountSyncedAt)} 기준</p>
      )}

      {status === "loading" && <p className="mt-4 text-sm text-text-secondary">최신 학기 강의 정보를 불러오는 중...</p>}
      {status === "error" && (
        <p className="mt-4 rounded-lg border border-error/40 bg-error/5 p-3 text-sm text-error">
          강의 정보를 불러오지 못했습니다: {error}
        </p>
      )}

      {status === "loaded" && (
        <>
          <div className="mt-4 rounded-xl bg-surface p-3 shadow-card">
            <h2 className="text-sm font-semibold">담은 관심 강의</h2>
            <div className="mt-2">
              <CourseTable
                courses={watchedCourses}
                showRemarks
                emptyMessage="아직 담은 관심 강의가 없습니다. 아래에서 검색해서 추가해보세요."
                renderAction={(course) => (
                  <button
                    type="button"
                    onClick={() => removeCourse(course.id)}
                    aria-label={`${course.courseName} 관심 목록에서 제거`}
                    className="text-text-secondary hover:text-error"
                  >
                    ×
                  </button>
                )}
              />
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <h2 className="text-sm font-semibold">과목 검색</h2>
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
                className="flex-1 rounded-lg border border-neutral px-2 py-1.5 text-xs outline-none focus:border-primary"
              />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as CourseSortOption)}
                className="rounded-lg border border-neutral px-2 py-1.5 text-xs"
              >
                <option value="competition">경쟁률순</option>
                <option value="default">기본 순서</option>
                <option value="credit">학점순</option>
              </select>
            </div>

            {allResults.length > SEARCH_RESULT_LIMIT && (
              <p className="text-[11px] text-text-secondary">
                검색 결과가 많아 상위 {SEARCH_RESULT_LIMIT}개만 보여드려요 — 검색어나 단과대/학과로 좁혀보세요.
              </p>
            )}

            <div className="max-h-[32rem] overflow-y-auto">
              <CourseTable
                courses={results}
                showRemarks
                emptyMessage="검색 결과가 없습니다."
                extraColumns={[
                  { key: "dept", header: "학과", render: ({ course }) => course.department ?? course.college },
                ]}
                renderAction={(course) => {
                  const alreadyAdded = courseIds.includes(course.id);
                  return (
                    <button
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => addCourse(course.id)}
                      className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow-button transition-all duration-150 hover:bg-primary-hover active:scale-95 active:bg-primary-active active:shadow-none disabled:scale-100 disabled:bg-neutral/30 disabled:text-text-secondary disabled:shadow-none"
                    >
                      {alreadyAdded ? "담김" : "담기"}
                    </button>
                  );
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
