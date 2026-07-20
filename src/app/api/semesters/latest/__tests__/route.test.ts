import { describe, expect, it, vi } from "vitest";

const mockGetLatestSemesterCacheEntry = vi.fn();
vi.mock("@/lib/latestSemesterCache", () => ({
  getLatestSemesterCacheEntry: () => mockGetLatestSemesterCacheEntry(),
}));

const { GET } = await import("../route");

const SEMESTER = {
  id: 1,
  year: 2026,
  semesterCode: "CM160.20",
  label: "2026학년도 2학기",
  coursesSyncedAt: "2026-07-20T05:00:00.000Z",
  appliedCountSyncedAt: "2026-07-20T04:00:00.000Z",
};
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0";

function browserRequest(url: string, init: RequestInit = {}): Request {
  return new Request(url, { ...init, headers: { "User-Agent": BROWSER_UA, ...init.headers } });
}

describe("GET /api/semesters/latest", () => {
  it("returns the semester with an ETag on a fresh request", async () => {
    mockGetLatestSemesterCacheEntry.mockResolvedValueOnce({ data: { semester: SEMESTER, courses: [] }, etag: '"e1"' });

    const response = await GET(browserRequest("http://localhost/api/semesters/latest"));

    expect(response.status).toBe(200);
    expect(response.headers.get("ETag")).toBe('"e1"');
    expect(await response.json()).toEqual(SEMESTER);
  });

  it("returns 304 when If-None-Match matches", async () => {
    mockGetLatestSemesterCacheEntry.mockResolvedValueOnce({ data: { semester: SEMESTER, courses: [] }, etag: '"e1"' });

    const response = await GET(
      browserRequest("http://localhost/api/semesters/latest", { headers: { "If-None-Match": '"e1"' } })
    );

    expect(response.status).toBe(304);
  });

  it("returns 404 when there is no latest semester yet", async () => {
    mockGetLatestSemesterCacheEntry.mockResolvedValueOnce({ data: { semester: null, courses: [] }, etag: '"empty"' });

    const response = await GET(browserRequest("http://localhost/api/semesters/latest"));

    expect(response.status).toBe(404);
  });

  it("returns a clean 500 on a DB failure", async () => {
    mockGetLatestSemesterCacheEntry.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));

    const response = await GET(browserRequest("http://localhost/api/semesters/latest"));

    expect(response.status).toBe(500);
  });
});
