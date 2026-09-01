"use client";

import { useEffect } from "react";

import { useCoursesStore } from "@/store/coursesStore";

export function StepStart() {
  const { semester, status, error, fetchCourses } = useCoursesStore();

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return (
    <div className="space-y-4">
      <p className="text-text-secondary">
        그룹을 만들고 과목을 담으면, 충돌 없는 시간표 조합을 자동으로 찾아드립니다.
      </p>

      {status === "loading" && <p className="text-sm text-text-secondary">최신 학기 강의 정보를 불러오는 중...</p>}

      {status === "error" && (
        <p className="rounded-lg border border-error/40 bg-error/5 p-3 text-sm text-error">
          강의 정보를 불러오지 못했습니다: {error}
        </p>
      )}

      {status === "loaded" && semester && (
        <div className="rounded-lg border border-primary/30 bg-primary-tint p-4 shadow-card">
          <p className="text-sm text-text-secondary">최신 학기</p>
          <p className="text-lg font-semibold">{semester.label}</p>
        </div>
      )}

      {status === "loaded" && !semester && (
        <p className="rounded-lg border border-neutral bg-surface p-3 text-sm text-text-secondary">
          아직 적재된 학기 데이터가 없습니다. 크롤러가 최초 실행된 후 다시 시도해주세요.
        </p>
      )}
    </div>
  );
}
