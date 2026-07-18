import { describe, expect, it } from "vitest";

import { computeEtag } from "../etag";

describe("computeEtag", () => {
  it("is deterministic for the same payload", () => {
    const payload = { semester: { id: 1 }, courses: [{ id: 1 }] };
    expect(computeEtag(payload)).toBe(computeEtag(payload));
  });

  it("differs when the payload differs", () => {
    const a = computeEtag({ courses: [{ id: 1 }] });
    const b = computeEtag({ courses: [{ id: 2 }] });
    expect(a).not.toBe(b);
  });

  it("is a quoted string, per the ETag header spec", () => {
    const etag = computeEtag({ a: 1 });
    expect(etag.startsWith('"')).toBe(true);
    expect(etag.endsWith('"')).toBe(true);
  });

  it("handles primitives and empty structures without throwing", () => {
    expect(() => computeEtag(null)).not.toThrow();
    expect(() => computeEtag([])).not.toThrow();
    expect(() => computeEtag({})).not.toThrow();
  });
});
