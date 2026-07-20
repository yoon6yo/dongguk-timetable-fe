import { describe, expect, it } from "vitest";

import { getLatestSemester } from "../semesters";
import { FakeQueryable } from "./fakeDb";

describe("getLatestSemester", () => {
  it("returns the row when one exists", async () => {
    const db = new FakeQueryable([
      {
        match: "FROM semesters",
        rows: [
          {
            id: 1,
            year: 2026,
            semesterCode: "CM160.20",
            label: "2026학년도 2학기",
            coursesSyncedAt: "2026-07-20T05:00:00.000Z",
            appliedCountSyncedAt: "2026-07-20T04:00:00.000Z",
          },
        ],
      },
    ]);

    const result = await getLatestSemester(db);

    expect(result).toEqual({
      id: 1,
      year: 2026,
      semesterCode: "CM160.20",
      label: "2026학년도 2학기",
      coursesSyncedAt: "2026-07-20T05:00:00.000Z",
      appliedCountSyncedAt: "2026-07-20T04:00:00.000Z",
    });
  });

  it("returns null when no semester is marked latest", async () => {
    const db = new FakeQueryable([{ match: "FROM semesters", rows: [] }]);

    const result = await getLatestSemester(db);

    expect(result).toBeNull();
  });

  it("queries only for is_latest = TRUE", async () => {
    const db = new FakeQueryable([{ match: "FROM semesters", rows: [] }]);

    await getLatestSemester(db);

    expect(db.calls).toHaveLength(1);
    expect(db.calls[0].sql).toContain("is_latest = TRUE");
  });
});
