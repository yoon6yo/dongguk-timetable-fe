import { describe, expect, it } from "vitest";

import { formatSyncTime } from "../formatSyncTime";

describe("formatSyncTime", () => {
  it("returns a fallback label for null", () => {
    expect(formatSyncTime(null)).toBe("정보 없음");
  });

  it("returns a fallback label for an unparseable string", () => {
    expect(formatSyncTime("not-a-date")).toBe("정보 없음");
  });

  it("formats a valid ISO string as a short month/day hour:minute label", () => {
    const result = formatSyncTime("2026-07-20T05:03:00.000Z");
    expect(result).not.toBe("정보 없음");
    expect(result).toMatch(/\d{1,2}[./]\s*\d{1,2}/); // month/day, separator varies by ICU version
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});
