import { getLatestSemesterCacheEntry } from "@/lib/latestSemesterCache";

export async function GET(request: Request) {
  try {
    const { data, etag } = await getLatestSemesterCacheEntry();

    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, { status: 304, headers: { ETag: etag } });
    }

    if (!data.semester) {
      return Response.json(
        { error: "아직 적재된 학기 데이터가 없습니다" },
        { status: 404, headers: { ETag: etag } }
      );
    }

    return Response.json(data.semester, { headers: { ETag: etag, "Cache-Control": "no-cache" } });
  } catch (error) {
    console.error("[/api/semesters/latest] DB query failed:", error);
    return Response.json({ error: "일시적인 서버 오류입니다" }, { status: 500 });
  }
}
