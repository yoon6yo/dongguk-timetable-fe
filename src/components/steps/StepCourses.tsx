"use client";

import { useMemo, useState } from "react";

import { getCompetitionRate } from "@/lib/competitionRate";
import { listColleges, listDepartments, searchCourses } from "@/lib/courseSearch";
import { useCoursesStore } from "@/store/coursesStore";
import { useGroupsStore } from "@/store/groupsStore";

export function StepCourses() {
  const groups = useGroupsStore((s) => s.groups);
  const addCourseToGroup = useGroupsStore((s) => s.addCourseToGroup);
  const removeCourseFromGroup = useGroupsStore((s) => s.removeCourseFromGroup);
  const courses = useCoursesStore((s) => s.courses);

  const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id ?? "");
  const [college, setCollege] = useState("");
  const [department, setDepartment] = useState("");
  const [query, setQuery] = useState("");

  const colleges = useMemo(() => listColleges(courses), [courses]);
  const departments = useMemo(() => listDepartments(courses, college || undefined), [courses, college]);
  const results = useMemo(
    () => searchCourses(courses, { college: college || undefined, department: department || undefined, query }).slice(0, 50),
    [courses, college, department, query]
  );

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  if (groups.length === 0) {
    return <p className="text-sm text-text-secondary">먼저 이전 단계에서 그룹을 하나 이상 만들어주세요.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">어느 그룹에 담을까요?</label>
        <select
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
          className="w-full rounded-lg border border-neutral px-3 py-2 text-sm"
        >
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} ({g.courseIds.length})
            </option>
          ))}
        </select>
      </div>

      {selectedGroup && selectedGroup.courseIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedGroup.courseIds.map((id) => {
            const course = courseById.get(id);
            if (!course) return null;
            return (
              <span key={id} className="flex items-center gap-1 rounded-full bg-primary-tint px-3 py-1 text-xs">
                {course.courseName}
                <button
                  type="button"
                  onClick={() => removeCourseFromGroup(selectedGroup.id, id)}
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

      <div className="grid grid-cols-2 gap-2">
        <select
          value={college}
          onChange={(e) => {
            setCollege(e.target.value);
            setDepartment("");
          }}
          className="rounded-lg border border-neutral px-3 py-2 text-sm"
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
          className="rounded-lg border border-neutral px-3 py-2 text-sm"
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
        className="w-full rounded-lg border border-neutral px-3 py-2 text-sm outline-none focus:border-primary"
      />

      <ul className="max-h-96 space-y-1 overflow-y-auto">
        {results.map((course) => {
          const alreadyAdded = selectedGroup?.courseIds.includes(course.id) ?? false;
          const competitionRate = getCompetitionRate(course);
          return (
            <li
              key={course.id}
              className="flex items-center justify-between rounded-xl bg-surface p-2.5 text-sm shadow-card transition-shadow hover:shadow-card-hover"
            >
              <div>
                <p className="font-medium">{course.courseName}</p>
                <p className="text-xs text-text-secondary">
                  {course.courseNo} · {course.professor ?? "교수 미정"} · {course.department ?? course.college}
                </p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  경쟁률 {competitionRate.enrolled}/{competitionRate.capacity}명 ({competitionRate.ratePercent}%)
                  {competitionRate.isMock && <span className="ml-1 text-neutral">· 추정</span>}
                </p>
              </div>
              <button
                type="button"
                disabled={alreadyAdded}
                onClick={() => selectedGroup && addCourseToGroup(selectedGroup.id, course.id)}
                className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow-button transition-all duration-150 hover:bg-primary-hover active:scale-95 active:bg-primary-active active:shadow-none disabled:scale-100 disabled:bg-neutral/30 disabled:text-text-secondary disabled:shadow-none"
              >
                {alreadyAdded ? "담김" : "담기"}
              </button>
            </li>
          );
        })}
        {results.length === 0 && <p className="text-sm text-text-secondary">검색 결과가 없습니다.</p>}
      </ul>
    </div>
  );
}
