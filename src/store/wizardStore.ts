import { create } from "zustand";

export const WIZARD_STEPS = ["start", "groups", "weights", "results"] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

interface WizardState {
  stepIndex: number;
  setStep: (index: number) => void;
  next: () => void;
  back: () => void;
  /** True once the user has clicked "시간표 조합 생성하기" at least once —
   * gates validation banners (e.g. empty required group) so they don't show
   * while the user is still mid-way through building groups, only once
   * they've actually tried to generate. */
  hasAttemptedGenerate: boolean;
  markGenerateAttempted: () => void;
}

/** Ephemeral, not persisted — re-entering the wizard always starts at step 0,
 * while the underlying groups/weights data (which IS persisted) is preserved. */
export const useWizardStore = create<WizardState>((set) => ({
  stepIndex: 0,
  setStep: (index) => set({ stepIndex: clamp(index) }),
  next: () => set((state) => ({ stepIndex: clamp(state.stepIndex + 1) })),
  back: () => set((state) => ({ stepIndex: clamp(state.stepIndex - 1) })),
  hasAttemptedGenerate: false,
  markGenerateAttempted: () => set({ hasAttemptedGenerate: true }),
}));

function clamp(index: number): number {
  return Math.min(WIZARD_STEPS.length - 1, Math.max(0, index));
}
