import { beforeEach, describe, expect, it } from "vitest";

import { useWatchlistStore } from "../watchlistStore";

beforeEach(() => {
  useWatchlistStore.setState({ courseIds: [] });
  window.localStorage.clear();
});

describe("useWatchlistStore", () => {
  it("adds a course id", () => {
    useWatchlistStore.getState().addCourse(101);

    expect(useWatchlistStore.getState().courseIds).toEqual([101]);
  });

  it("does not add the same course id twice", () => {
    useWatchlistStore.getState().addCourse(101);
    useWatchlistStore.getState().addCourse(101);

    expect(useWatchlistStore.getState().courseIds).toEqual([101]);
  });

  it("preserves insertion order across multiple distinct adds", () => {
    useWatchlistStore.getState().addCourse(101);
    useWatchlistStore.getState().addCourse(202);
    useWatchlistStore.getState().addCourse(303);

    expect(useWatchlistStore.getState().courseIds).toEqual([101, 202, 303]);
  });

  it("removes a course id", () => {
    useWatchlistStore.getState().addCourse(101);
    useWatchlistStore.getState().addCourse(202);

    useWatchlistStore.getState().removeCourse(101);

    expect(useWatchlistStore.getState().courseIds).toEqual([202]);
  });

  it("removing an id that was never added is a no-op", () => {
    useWatchlistStore.getState().addCourse(101);

    useWatchlistStore.getState().removeCourse(999);

    expect(useWatchlistStore.getState().courseIds).toEqual([101]);
  });
});
