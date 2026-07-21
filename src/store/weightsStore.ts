import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Weights } from "@/lib/scoring";

/** Neutral defaults: 50 for every slider (timeOfDay=50 means "no morning/afternoon
 * preference at all" — see scoring.ts's importance-from-distance-to-neutral design). */
export const DEFAULT_WEIGHTS: Weights = { gap: 50, lunch: 50, freeDay: 50, timeOfDay: 50, commute: 50 };

interface WeightsState {
  weights: Weights;
  setWeight: (key: keyof Weights, value: number) => void;
  /** Replaces every weight at once -- used by the results-view preset chips
   * (see lib/weightPresets.ts), where a single click sets all five axes. */
  setWeights: (weights: Weights) => void;
  reset: () => void;
}

// zustand's default merge is a shallow top-level spread, which would replace
// `weights` wholesale on rehydrate — a returning user's localStorage saved
// before a new criterion (e.g. `commute`) existed would then have that field
// `undefined`, turning every score's `total` into NaN (see scoring.ts's
// totalImportance sum) and silently breaking ranking. Deep-merge into
// DEFAULT_WEIGHTS instead so any field missing from old persisted state
// falls back cleanly. Exported standalone so it's unit-testable without
// going through zustand's actual rehydrate lifecycle.
export function mergeWeightsState(
  persistedState: unknown,
  currentState: WeightsState
): WeightsState {
  return {
    ...currentState,
    weights: { ...DEFAULT_WEIGHTS, ...(persistedState as Partial<WeightsState> | undefined)?.weights },
  };
}

export const useWeightsStore = create<WeightsState>()(
  persist(
    (set) => ({
      weights: DEFAULT_WEIGHTS,
      setWeight: (key, value) =>
        set((state) => ({ weights: { ...state.weights, [key]: clamp(value) } })),
      setWeights: (weights) => set({ weights }),
      reset: () => set({ weights: DEFAULT_WEIGHTS }),
    }),
    { name: "timetable-weights", merge: mergeWeightsState }
  )
);

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}
