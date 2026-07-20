import { describe, expect, it, vi } from "vitest";

const mockGetLatestSemesterCacheEntry = vi.fn();
vi.mock("@/lib/latestSemesterCache", () => ({
  getLatestSemesterCacheEntry: () => mockGetLatestSemesterCacheEntry(),
}));

const { GET } = await import("../route");

const SAMPLE_ENTRY = {
  data: {
    semester: {
      id: 1,
      year: 2026,
      semesterCode: "CM160.20",
      label: "2026학년도 2학기",
      coursesSyncedAt: "2026-07-20T05:00:00.000Z",
      appliedCountSyncedAt: "2026-07-20T04:00:00.000Z",
    },
    courses: [],
  },
  etag: '"abc123"',
};

const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0";

function browserRequest(url: string, init: RequestInit = {}): Request {
  return new Request(url, { ...init, headers: { "User-Agent": BROWSER_UA, ...init.headers } });
}

describe("GET /api/courses", () => {
  it("returns 200 with the data and an ETag header on a fresh request", async () => {
    mockGetLatestSemesterCacheEntry.mockResolvedValueOnce(SAMPLE_ENTRY);

    const response = await GET(browserRequest("http://localhost/api/courses"));

    expect(response.status).toBe(200);
    expect(response.headers.get("ETag")).toBe('"abc123"');
    expect(response.headers.get("Cache-Control")).toBe("no-cache");
    expect(await response.json()).toEqual(SAMPLE_ENTRY.data);
  });

  it("returns a bodyless 304 when If-None-Match matches the current ETag", async () => {
    mockGetLatestSemesterCacheEntry.mockResolvedValueOnce(SAMPLE_ENTRY);

    const response = await GET(
      browserRequest("http://localhost/api/courses", { headers: { "If-None-Match": '"abc123"' } })
    );

    expect(response.status).toBe(304);
    expect(response.headers.get("ETag")).toBe('"abc123"');
    expect(await response.text()).toBe("");
  });

  it("returns fresh 200 when If-None-Match does not match (data changed)", async () => {
    mockGetLatestSemesterCacheEntry.mockResolvedValueOnce(SAMPLE_ENTRY);

    const response = await GET(
      browserRequest("http://localhost/api/courses", { headers: { "If-None-Match": '"stale-etag"' } })
    );

    expect(response.status).toBe(200);
  });

  it("returns 404 when no semester has been loaded yet", async () => {
    mockGetLatestSemesterCacheEntry.mockResolvedValueOnce({
      data: { semester: null, courses: [] },
      etag: '"empty"',
    });

    const response = await GET(browserRequest("http://localhost/api/courses"));

    expect(response.status).toBe(404);
  });

  it("returns a clean 500 JSON error without leaking the raw error when the cache/DB call throws", async () => {
    mockGetLatestSemesterCacheEntry.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));

    const response = await GET(browserRequest("http://localhost/api/courses"));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBeTruthy();
    expect(JSON.stringify(body)).not.toContain("ECONNREFUSED");
  });
});
