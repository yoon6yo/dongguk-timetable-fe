import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Dongguk's own registration rules — used as the input's bounds and default. */
export const MIN_SCHOOL_CREDIT = 12;
export const MAX_SCHOOL_CREDIT = 21;

interface CreditLimitState {
  /** Upper bound only (see combinationGenerator's GenerateOptions.maxCredit) —
   * null means no constraint at all. A combination well under this value is
   * just as valid as one that fills it exactly; there's no lower bound in the
   * generator itself. Defaults to the school's own registration max (21),
   * since no plan can ever legitimately exceed it anyway. Any non-null value
   * is clamped into [MIN_SCHOOL_CREDIT, MAX_SCHOOL_CREDIT]. */
  maxCredit: number | null;
  setMaxCredit: (value: number | null) => void;
}

export const useCreditLimitStore = create<CreditLimitState>()(
  persist(
    (set) => ({
      maxCredit: MAX_SCHOOL_CREDIT,
      setMaxCredit: (value) =>
        set({
          maxCredit: value == null ? null : Math.min(MAX_SCHOOL_CREDIT, Math.max(MIN_SCHOOL_CREDIT, value)),
        }),
    }),
    { name: "timetable-credit-limit" }
  )
);
