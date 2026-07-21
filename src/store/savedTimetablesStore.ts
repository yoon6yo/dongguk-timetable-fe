import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { ScoreBreakdown } from "@/lib/scoring";
import type { CourseRow } from "@/lib/types";

const MAX_SAVED = 50;

export interface SavedTimetable {
  id: string;
  /** User label; "" falls back to a display default (same pattern as groupDisplayName). */
  label: string;
  savedAt: string;
  semesterId: number;
  semesterLabel: string;
  totalCredit: number;
  score: ScoreBreakdown;
  /** Full denormalized course snapshot -- self-contained so this stays
   * renderable (TimetableGrid/CourseTable) even after a semester rollover
   * makes the original courseIds stop resolving against the live catalog. */
  courses: CourseRow[];
}

interface SavedTimetablesState {
  saved: SavedTimetable[];
  saveTimetable: (input: {
    semester: { id: number; label: string };
    courses: CourseRow[];
    totalCredit: number;
    score: ScoreBreakdown;
    label?: string;
  }) => void;
  removeTimetable: (id: string) => void;
  renameTimetable: (id: string, label: string) => void;
}

function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `saved-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function savedTimetableDisplayName(saved: SavedTimetable): string {
  return saved.label.trim() || new Date(saved.savedAt).toLocaleString("ko-KR");
}

export const useSavedTimetablesStore = create<SavedTimetablesState>()(
  persist(
    (set) => ({
      saved: [],

      saveTimetable: (input) =>
        set((state) => ({
          saved: [
            {
              id: makeId(),
              label: input.label?.trim() ?? "",
              savedAt: new Date().toISOString(),
              semesterId: input.semester.id,
              semesterLabel: input.semester.label,
              totalCredit: input.totalCredit,
              score: input.score,
              courses: input.courses,
            },
            ...state.saved,
          ].slice(0, MAX_SAVED),
        })),

      removeTimetable: (id) => set((state) => ({ saved: state.saved.filter((s) => s.id !== id) })),

      renameTimetable: (id, label) =>
        set((state) => ({ saved: state.saved.map((s) => (s.id === id ? { ...s, label } : s)) })),
    }),
    { name: "timetable-saved", version: 1 }
  )
);
