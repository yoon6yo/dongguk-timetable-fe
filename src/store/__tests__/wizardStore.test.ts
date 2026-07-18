import { beforeEach, describe, expect, it } from "vitest";

import { useWizardStore, WIZARD_STEPS } from "../wizardStore";

beforeEach(() => {
  useWizardStore.setState({ stepIndex: 0 });
});

describe("useWizardStore", () => {
  it("starts at step 0", () => {
    expect(useWizardStore.getState().stepIndex).toBe(0);
  });

  it("next advances by one", () => {
    useWizardStore.getState().next();
    expect(useWizardStore.getState().stepIndex).toBe(1);
  });

  it("back retreats by one", () => {
    useWizardStore.setState({ stepIndex: 2 });
    useWizardStore.getState().back();
    expect(useWizardStore.getState().stepIndex).toBe(1);
  });

  it("cannot go past the last step", () => {
    useWizardStore.setState({ stepIndex: WIZARD_STEPS.length - 1 });
    useWizardStore.getState().next();
    expect(useWizardStore.getState().stepIndex).toBe(WIZARD_STEPS.length - 1);
  });

  it("cannot go before the first step", () => {
    useWizardStore.getState().back();
    expect(useWizardStore.getState().stepIndex).toBe(0);
  });

  it("setStep clamps out-of-range values", () => {
    useWizardStore.getState().setStep(999);
    expect(useWizardStore.getState().stepIndex).toBe(WIZARD_STEPS.length - 1);

    useWizardStore.getState().setStep(-5);
    expect(useWizardStore.getState().stepIndex).toBe(0);
  });
});
