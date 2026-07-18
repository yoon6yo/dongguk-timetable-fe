import { create } from "zustand";

import type { CourseRow, SemesterRow } from "@/lib/types";

interface CoursesState {
  semester: SemesterRow | null;
  courses: CourseRow[];
  status: "idle" | "loading" | "loaded" | "error";
  error: string | null;
  fetchCourses: () => Promise<void>;
}

export const useCoursesStore = create<CoursesState>((set, get) => ({
  semester: null,
  courses: [],
  status: "idle",
  error: null,

  fetchCourses: async () => {
    if (get().status === "loading" || get().status === "loaded") return;
    set({ status: "loading", error: null });
    try {
      const res = await fetch("/api/courses");
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error ?? `요청 실패 (${res.status})`);
      }
      set({ semester: body.semester, courses: body.courses, status: "loaded" });
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : "알 수 없는 오류" });
    }
  },
}));
