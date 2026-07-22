import { getLatestSemesterCacheEntry } from "@/lib/latestSemesterCache";

/**
 * Ships the entire latest-semester course catalog in one response — search,
 * filtering, and combination generation all happen client-side (see project
 * plan section 4), so there is deliberately no query-string filtering here.
 *
 * Backed by a 5-minute server-side TTL cache (the crawler updates MySQL
 * hourly) plus an ETag: a client re-fetching on page refresh sends
 * If-None-Match and gets a bodyless 304 when nothing changed, instead of
 * re-downloading the whole catalog every time.
 */
export async function GET(request: Request) {
  try {
    const { data, etag } = await getLatestSemesterCacheEntry();

    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, { status: 304, headers: { ETag: etag } });
    }

    return Response.json(data, {
      status: data.semester ? 200 : 404,
      headers: { ETag: etag, "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("[/api/courses] DB query failed:", error);
    return Response.json({ error: "일시적인 서버 오류입니다" }, { status: 500 });
  }
}
