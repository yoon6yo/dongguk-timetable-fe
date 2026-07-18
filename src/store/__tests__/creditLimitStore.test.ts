import { beforeEach, describe, expect, it } from "vitest";

import { MAX_SCHOOL_CREDIT, MIN_SCHOOL_CREDIT, useCreditLimitStore } from "../creditLimitStore";

beforeEach(() => {
  useCreditLimitStore.setState({ maxCredit: MAX_SCHOOL_CREDIT });
  window.localStorage.clear();
});

describe("useCreditLimitStore", () => {
  it("defaults to the school's registration max (21)", () => {
    expect(useCreditLimitStore.getState().maxCredit).toBe(21);
  });

  it("sets a numeric cap within the valid range", () => {
    useCreditLimitStore.getState().setMaxCredit(18);
    expect(useCreditLimitStore.getState().maxCredit).toBe(18);
  });

  it("clamps a value below the school minimum (12) up to 12", () => {
    useCreditLimitStore.getState().setMaxCredit(5);
    expect(useCreditLimitStore.getState().maxCredit).toBe(MIN_SCHOOL_CREDIT);
  });

  it("clamps a value above the school maximum (21) down to 21", () => {
    useCreditLimitStore.getState().setMaxCredit(30);
    expect(useCreditLimitStore.getState().maxCredit).toBe(MAX_SCHOOL_CREDIT);
  });

  it("can still be cleared to null (no limit) if explicitly requested", () => {
    useCreditLimitStore.getState().setMaxCredit(18);
    useCreditLimitStore.getState().setMaxCredit(null);
    expect(useCreditLimitStore.getState().maxCredit).toBeNull();
  });
});
