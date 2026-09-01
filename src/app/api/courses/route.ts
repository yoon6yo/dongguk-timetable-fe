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
    const { data, etag, body, gzipBody } = await getLatestSemesterCacheEntry();

    // Vary on both branches (including 304) -- a shared cache in front of
    // this route must never serve a gzip response to a client that didn't
    // ask for one, or vice versa.
    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, { status: 304, headers: { ETag: etag, Vary: "Accept-Encoding" } });
    }

    const status = data.semester ? 200 : 404;
    const acceptsGzip = (request.headers.get("accept-encoding") ?? "").includes("gzip");
    const baseHeaders = {
      ETag: etag,
      "Cache-Control": "no-cache",
      "Content-Type": "application/json",
      Vary: "Accept-Encoding",
    };

    // Response.json() can't be used here -- it has no way to set
    // Content-Encoding, and the whole point is sending the pre-gzipped
    // buffer instead of letting it re-serialize `data` per request.
    return acceptsGzip
      ? new Response(new Uint8Array(gzipBody), { status, headers: { ...baseHeaders, "Content-Encoding": "gzip" } })
      : new Response(body, { status, headers: baseHeaders });
  } catch (error) {
    console.error("[/api/courses] DB query failed:", error);
    return Response.json({ error: "일시적인 서버 오류입니다" }, { status: 500 });
  }
}
