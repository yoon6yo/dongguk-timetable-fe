import { beforeEach, describe, expect, it } from "vitest";

import { DEFAULT_WEIGHTS, useWeightsStore } from "../weightsStore";

beforeEach(() => {
  useWeightsStore.setState({ weights: DEFAULT_WEIGHTS });
  window.localStorage.clear();
});

describe("useWeightsStore", () => {
  it("defaults every slider to 50 (neutral)", () => {
    expect(useWeightsStore.getState().weights).toEqual({ gap: 50, lunch: 50, freeDay: 50, timeOfDay: 50 });
  });

  it("updates a single slider without touching the others", () => {
    useWeightsStore.getState().setWeight("gap", 80);

    expect(useWeightsStore.getState().weights).toEqual({ gap: 80, lunch: 50, freeDay: 50, timeOfDay: 50 });
  });

  it("clamps values above 100 down to 100", () => {
    useWeightsStore.getState().setWeight("lunch", 150);
    expect(useWeightsStore.getState().weights.lunch).toBe(100);
  });

  it("clamps values below 0 up to 0", () => {
    useWeightsStore.getState().setWeight("freeDay", -20);
    expect(useWeightsStore.getState().weights.freeDay).toBe(0);
  });

  it("reset restores all defaults", () => {
    useWeightsStore.getState().setWeight("gap", 90);
    useWeightsStore.getState().setWeight("timeOfDay", 10);

    useWeightsStore.getState().reset();

    expect(useWeightsStore.getState().weights).toEqual(DEFAULT_WEIGHTS);
  });
});
