import { getCoursesForSemester } from "@/lib/courses";
import { getPool } from "@/lib/db";
import { getLatestSemester } from "@/lib/semesters";

/**
 * Ships the entire latest-semester course catalog in one response — search,
 * filtering, and combination generation all happen client-side (see project
 * plan section 4), so there is deliberately no query-string filtering here.
 */
export async function GET() {
  const pool = getPool();
  try {
    const semester = await getLatestSemester(pool);
    if (!semester) {
      return Response.json({ semester: null, courses: [] }, { status: 404 });
    }

    const courses = await getCoursesForSemester(pool, semester.id);
    return Response.json({ semester, courses });
  } catch (error) {
    console.error("[/api/courses] DB query failed:", error);
    return Response.json({ error: "일시적인 서버 오류입니다" }, { status: 500 });
  }
}
