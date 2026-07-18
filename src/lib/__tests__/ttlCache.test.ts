import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTtlCache } from "../ttlCache";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createTtlCache", () => {
  it("calls the loader once and reuses the value within the TTL", async () => {
    const loader = vi.fn().mockResolvedValue("value");
    const cache = createTtlCache(1000, loader);

    expect(await cache.get()).toBe("value");
    expect(await cache.get()).toBe("value");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("reloads once the TTL has elapsed", async () => {
    const loader = vi.fn().mockResolvedValueOnce("first").mockResolvedValueOnce("second");
    const cache = createTtlCache(1000, loader);

    expect(await cache.get()).toBe("first");
    vi.advanceTimersByTime(1001);
    expect(await cache.get()).toBe("second");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("does not reload before the TTL elapses", async () => {
    const loader = vi.fn().mockResolvedValue("value");
    const cache = createTtlCache(1000, loader);

    await cache.get();
    vi.advanceTimersByTime(999);
    await cache.get();

    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("clear() forces the next get() to reload", async () => {
    const loader = vi.fn().mockResolvedValueOnce("first").mockResolvedValueOnce("second");
    const cache = createTtlCache(1000, loader);

    await cache.get();
    cache.clear();

    expect(await cache.get()).toBe("second");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("coalesces concurrent misses into a single loader call", async () => {
    let resolveLoader!: (value: string) => void;
    const loader = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveLoader = resolve;
        })
    );
    const cache = createTtlCache(1000, loader);

    const first = cache.get();
    const second = cache.get();
    resolveLoader("value");

    expect(await first).toBe("value");
    expect(await second).toBe("value");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("propagates a loader rejection without caching it", async () => {
    const loader = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce("recovered");
    const cache = createTtlCache(1000, loader);

    await expect(cache.get()).rejects.toThrow("boom");
    expect(await cache.get()).toBe("recovered");
  });
});
