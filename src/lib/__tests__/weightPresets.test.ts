import { describe, expect, it } from "vitest";

import { matchWeightPreset, WEIGHT_PRESETS } from "../weightPresets";

describe("matchWeightPreset", () => {
  it("matches the balanced (default) preset", () => {
    expect(matchWeightPreset({ gap: 50, lunch: 50, freeDay: 50, timeOfDay: 50, commute: 50 })).toBe("balanced");
  });

  it("matches a single-axis preset exactly", () => {
    expect(matchWeightPreset({ gap: 100, lunch: 0, freeDay: 0, timeOfDay: 50, commute: 0 })).toBe("gap");
  });

  it("returns null for hand-tuned weights that match no preset", () => {
    expect(matchWeightPreset({ gap: 70, lunch: 30, freeDay: 10, timeOfDay: 60, commute: 20 })).toBeNull();
  });

  it("every preset is internally distinct (no duplicate weight combos)", () => {
    const signatures = WEIGHT_PRESETS.map((p) => JSON.stringify(p.weights));
    expect(new Set(signatures).size).toBe(WEIGHT_PRESETS.length);
  });
});
