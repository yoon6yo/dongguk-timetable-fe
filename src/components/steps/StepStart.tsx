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
        <div className="flex flex-col items-center gap-3 rounded-lg border border-error/40 bg-error/5 p-3 text-center text-sm text-error">
          <p>강의 정보를 불러오지 못했습니다: {error}</p>
          <button
            type="button"
            onClick={() => fetchCourses()}
            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-button transition-all duration-150 hover:bg-primary-hover active:scale-95"
          >
            다시 시도
          </button>
        </div>
      )}

      {status === "loaded" && semester && (
        // Inline-width, not a full-row card -- "최신 학기 / 2026학년도 2학기"
        // is two short lines of text; stretching that across the whole
        // container the way the old card did left a wide box that was
        // mostly empty space either side of the actual content.
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary-tint px-5 py-2.5 shadow-card">
          <span className="text-xs text-text-secondary">최신 학기</span>
          <span className="text-sm font-semibold">{semester.label}</span>
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
