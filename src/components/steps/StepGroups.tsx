"use client";

import { useMemo, useState } from "react";

import { getCompetitionRate } from "@/lib/competitionRate";
import { listColleges, listDepartments, searchCourses } from "@/lib/courseSearch";
import { computeCreditRangeWarning, type CreditRangeWarning } from "@/lib/creditRangeWarning";
import type { CourseRow } from "@/lib/types";
import { MAX_SCHOOL_CREDIT, MIN_SCHOOL_CREDIT, useCreditLimitStore } from "@/store/creditLimitStore";
import { useCoursesStore } from "@/store/coursesStore";
import { useGroupsStore, type CourseGroup } from "@/store/groupsStore";

export function StepGroups() {
  const groups = useGroupsStore((s) => s.groups);
  const addGroup = useGroupsStore((s) => s.addGroup);
  const courses = useCoursesStore((s) => s.courses);
  const maxCredit = useCreditLimitStore((s) => s.maxCredit);

  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const warning = useMemo(
    () => computeCreditRangeWarning(groups, courseById, MIN_SCHOOL_CREDIT, maxCredit ?? MAX_SCHOOL_CREDIT),
    [groups, courseById, maxCredit]
  );

  return (
    <div className="space-y-4">
      <p className="text-text-secondary">
        그룹을 만들고 각 그룹에 후보 과목을 담으세요. 그룹 이름은 안 정해도 괜찮아요 — 그룹에서 한 과목을
        꼭 골라야 하는지(필수) 안 골라도 되는지(선택)만 정하면 됩니다.
      </p>

      {warning && <CreditRangeWarningBanner warning={warning} />}

      <button
        type="button"
        onClick={() => addGroup()}
        className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-button transition-all duration-150 hover:bg-primary-hover active:scale-95 active:bg-primary-active active:shadow-none"
      >
        + 그룹 추가
      </button>

      <div className="space-y-3">
        {groups.map((group) => (
          <GroupCard key={group.id} group={group} courses={courses} courseById={courseById} />
        ))}
        {groups.length === 0 && <p className="text-sm text-text-secondary">아직 만든 그룹이 없습니다.</p>}
      </div>
    </div>
  );
}

function CreditRangeWarningBanner({ warning }: { warning: CreditRangeWarning }) {
  const message =
    warning.type === "empty-required"
      ? `"${warning.groupName}" 그룹이 필수인데 담긴 과목이 없어요 — 과목을 최소 1개 담아야 조합을 만들 수 있어요.`
      : warning.type === "above-max"
        ? `필수 그룹만 골라도 최소 ${warning.minPossible}학점이라 목표 학점(${warning.maxCredit}학점)을 넘어요 — 필수 그룹을 줄이거나 학점이 적은 과목을 담아보세요.`
        : `필수 그룹만으로는 최대 ${warning.maxPossible}학점이라 최소 학점(${warning.minCredit}학점)에 못 미쳐요 — 선택 그룹에서 과목을 더 담아보세요.`;

  return <div className="rounded-xl bg-error/10 p-3 text-sm text-error shadow-card">⚠ {message}</div>;
}

function GroupCard({
  group,
  courses,
  courseById,
}: {
  group: CourseGroup;
  courses: CourseRow[];
  courseById: Map<number, CourseRow>;
}) {
  const renameGroup = useGroupsStore((s) => s.renameGroup);
  const removeGroup = useGroupsStore((s) => s.removeGroup);
  const toggleRequired = useGroupsStore((s) => s.toggleRequired);
  const addCourseToGroup = useGroupsStore((s) => s.addCourseToGroup);
  const removeCourseFromGroup = useGroupsStore((s) => s.removeCourseFromGroup);

  const [searchOpen, setSearchOpen] = useState(false);
  const [college, setCollege] = useState("");
  const [department, setDepartment] = useState("");
  const [query, setQuery] = useState("");

  const colleges = useMemo(() => listColleges(courses), [courses]);
  const departments = useMemo(() => listDepartments(courses, college || undefined), [courses, college]);
  const results = useMemo(
    () =>
      searchCourses(courses, { college: college || undefined, department: department || undefined, query }).slice(
        0,
        50
      ),
    [courses, college, department, query]
  );

  return (
    <div className="rounded-xl bg-surface p-3 shadow-card transition-shadow hover:shadow-card-hover">
      <div className="flex items-center justify-between">
        <input
          type="text"
          value={group.name}
          onChange={(e) => renameGroup(group.id, e.target.value)}
          className="rounded border border-transparent bg-transparent font-medium outline-none transition-colors hover:border-neutral focus:border-primary"
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => toggleRequired(group.id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150 active:scale-95 ${
              group.required ? "bg-primary text-white" : "bg-neutral/30 text-text-secondary hover:bg-neutral/50"
            }`}
          >
            {group.required ? "필수" : "선택"}
          </button>
          <button
            type="button"
            onClick={() => removeGroup(group.id)}
            aria-label={`${group.name} 그룹 삭제`}
            className="rounded-md px-1 text-text-secondary transition-all duration-150 hover:text-error active:scale-95"
          >
            삭제
          </button>
        </div>
      </div>

      {group.courseIds.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {group.courseIds.map((id) => {
            const course = courseById.get(id);
            if (!course) return null;
            return (
              <span key={id} className="flex items-center gap-1 rounded-full bg-primary-tint px-3 py-1 text-xs">
                {course.courseName}
                <button
                  type="button"
                  onClick={() => removeCourseFromGroup(group.id, id)}
                  aria-label={`${course.courseName} 제거`}
                  className="text-text-secondary hover:text-error"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => setSearchOpen((v) => !v)}
        className="mt-2 text-xs font-semibold text-primary underline decoration-primary-tint underline-offset-2 transition-colors hover:text-primary-hover"
      >
        {searchOpen ? "과목 검색 닫기" : "+ 과목 추가"}
      </button>

      {searchOpen && (
        <div className="mt-2 space-y-2 border-t border-neutral/20 pt-2">
          <div className="grid grid-cols-2 gap-2">
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
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="과목명 / 학수번호 / 교수명 검색"
            className="w-full rounded-lg border border-neutral px-2 py-1.5 text-xs outline-none focus:border-primary"
          />

          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {results.map((course) => {
              const alreadyAdded = group.courseIds.includes(course.id);
              const competitionRate = getCompetitionRate(course);
              return (
                <li key={course.id} className="flex items-center justify-between rounded-lg bg-background p-2 text-xs">
                  <div>
                    <p className="font-medium">{course.courseName}</p>
                    <p className="text-text-secondary">
                      {course.courseNo} · {course.professor ?? "교수 미정"} · {course.department ?? course.college}
                    </p>
                    <p className="mt-0.5 text-text-secondary">
                      경쟁률 {competitionRate.enrolled}/{competitionRate.capacity}명 ({competitionRate.ratePercent}%)
                      {competitionRate.isMock && <span className="ml-1 text-neutral">· 추정</span>}
                    </p>
                    {course.remarks && <p className="mt-0.5 text-[11px] text-neutral">{course.remarks}</p>}
                  </div>
                  <button
                    type="button"
                    disabled={alreadyAdded}
                    onClick={() => addCourseToGroup(group.id, course.id)}
                    className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow-button transition-all duration-150 hover:bg-primary-hover active:scale-95 active:bg-primary-active active:shadow-none disabled:scale-100 disabled:bg-neutral/30 disabled:text-text-secondary disabled:shadow-none"
                  >
                    {alreadyAdded ? "담김" : "담기"}
                  </button>
                </li>
              );
            })}
            {results.length === 0 && <p className="text-xs text-text-secondary">검색 결과가 없습니다.</p>}
          </ul>
        </div>
      )}
    </div>
  );
}
