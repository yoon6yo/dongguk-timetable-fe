import { beforeEach, describe, expect, it } from "vitest";

import { DEFAULT_WEIGHTS, mergeWeightsState, useWeightsStore } from "../weightsStore";

beforeEach(() => {
  useWeightsStore.setState({ weights: DEFAULT_WEIGHTS });
  window.localStorage.clear();
});

describe("useWeightsStore", () => {
  it("defaults every slider to 50 (neutral)", () => {
    expect(useWeightsStore.getState().weights).toEqual({ gap: 50, lunch: 50, freeDay: 50, timeOfDay: 50, commute: 50 });
  });

  it("updates a single slider without touching the others", () => {
    useWeightsStore.getState().setWeight("gap", 80);

    expect(useWeightsStore.getState().weights).toEqual({ gap: 80, lunch: 50, freeDay: 50, timeOfDay: 50, commute: 50 });
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

describe("mergeWeightsState", () => {
  const currentState = { weights: DEFAULT_WEIGHTS, setWeight: () => {}, reset: () => {} };

  it("fills in a field missing from stale persisted state (e.g. commute added after the user's localStorage was saved) with its default", () => {
    const stalePersisted = { weights: { gap: 80, lunch: 20, freeDay: 60, timeOfDay: 50 } };
    const merged = mergeWeightsState(stalePersisted, currentState);
    expect(merged.weights).toEqual({ gap: 80, lunch: 20, freeDay: 60, timeOfDay: 50, commute: 50 });
  });

  it("keeps every field from fully up-to-date persisted state", () => {
    const fullPersisted = { weights: { gap: 10, lunch: 20, freeDay: 30, timeOfDay: 40, commute: 90 } };
    const merged = mergeWeightsState(fullPersisted, currentState);
    expect(merged.weights).toEqual({ gap: 10, lunch: 20, freeDay: 30, timeOfDay: 40, commute: 90 });
  });

  it("falls back to all defaults when there is no persisted state at all (first visit)", () => {
    const merged = mergeWeightsState(undefined, currentState);
    expect(merged.weights).toEqual(DEFAULT_WEIGHTS);
  });

  it("never produces a NaN-triggering undefined field", () => {
    const stalePersisted = { weights: { gap: 80, lunch: 20, freeDay: 60, timeOfDay: 50 } };
    const merged = mergeWeightsState(stalePersisted, currentState);
    expect(Object.values(merged.weights).every((v) => typeof v === "number" && !Number.isNaN(v))).toBe(true);
  });
});
