import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Weights } from "@/lib/scoring";

/** Neutral defaults: 50 for every slider (timeOfDay=50 means "no morning/afternoon
 * preference at all" — see scoring.ts's importance-from-distance-to-neutral design). */
export const DEFAULT_WEIGHTS: Weights = { gap: 50, lunch: 50, freeDay: 50, timeOfDay: 50, commute: 50 };

interface WeightsState {
  weights: Weights;
  setWeight: (key: keyof Weights, value: number) => void;
  reset: () => void;
}

export const useWeightsStore = create<WeightsState>()(
  persist(
    (set) => ({
      weights: DEFAULT_WEIGHTS,
      setWeight: (key, value) =>
        set((state) => ({ weights: { ...state.weights, [key]: clamp(value) } })),
      reset: () => set({ weights: DEFAULT_WEIGHTS }),
    }),
    { name: "timetable-weights" }
  )
);

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}
