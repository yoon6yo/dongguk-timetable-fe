"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";

import { formatSyncTime } from "@/lib/formatSyncTime";
import type { CourseRow } from "@/lib/types";
import { useCoursesStore } from "@/store/coursesStore";
import { groupDisplayName, useGroupsStore } from "@/store/groupsStore";
import { useWatchlistStore } from "@/store/watchlistStore";

import { CourseSearchPanel } from "./CourseSearchPanel";
import { CourseTable } from "./CourseTable";

export function Watchlist() {
  const semester = useCoursesStore((s) => s.semester);
  const courses = useCoursesStore((s) => s.courses);
  const status = useCoursesStore((s) => s.status);
  const error = useCoursesStore((s) => s.error);
  const fetchCourses = useCoursesStore((s) => s.fetchCourses);

  const courseIds = useWatchlistStore((s) => s.courseIds);
  const addCourse = useWatchlistStore((s) => s.addCourse);
  const removeCourse = useWatchlistStore((s) => s.removeCourse);

  const groups = useGroupsStore((s) => s.groups);
  const addCourseToGroup = useGroupsStore((s) => s.addCourseToGroup);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const watchedCourses = useMemo(
    () => courseIds.map((id) => courseById.get(id)).filter((c): c is CourseRow => Boolean(c)),
    [courseIds, courseById]
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col px-4 py-6">
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
          <div className="mt-4 rounded-lg bg-surface p-3 shadow-card">
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
            <CourseSearchPanel
              courses={courses}
              defaultSort="competition"
              resultsMaxHeightClassName="max-h-[32rem]"
              renderAction={(course) => {
                const alreadyWatched = courseIds.includes(course.id);
                return (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      disabled={alreadyWatched}
                      onClick={() => addCourse(course.id)}
                      className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow-button transition-all duration-150 hover:bg-primary-hover active:scale-95 active:bg-primary-active active:shadow-none disabled:scale-100 disabled:bg-neutral/30 disabled:text-text-secondary disabled:shadow-none"
                    >
                      {alreadyWatched ? "담김" : "관심목록"}
                    </button>
                    {groups.length > 0 ? (
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          addCourseToGroup(e.target.value, course.id, semester?.semesterCode);
                          e.target.value = "";
                        }}
                        aria-label={`${course.courseName}을 시간표 그룹에 담기`}
                        className="rounded-full border border-neutral px-2 py-1 text-[11px] text-text-secondary outline-none focus:border-primary"
                      >
                        <option value="">그룹에 담기</option>
                        {groups.map((g, idx) => {
                          const alreadyInGroup = g.courseIds.includes(course.id);
                          return (
                            <option key={g.id} value={g.id} disabled={alreadyInGroup}>
                              {groupDisplayName(g, idx)}
                              {alreadyInGroup ? " (담김)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <Link href="/wizard" className="text-[11px] text-text-secondary hover:text-primary">
                        그룹 없음 · 만들기
                      </Link>
                    )}
                  </div>
                );
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
