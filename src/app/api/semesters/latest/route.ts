import { getPool } from "@/lib/db";
import { getLatestSemester } from "@/lib/semesters";

export async function GET() {
  let semester;
  try {
    semester = await getLatestSemester(getPool());
  } catch (error) {
    console.error("[/api/semesters/latest] DB query failed:", error);
    return Response.json({ error: "일시적인 서버 오류입니다" }, { status: 500 });
  }

  if (!semester) {
    return Response.json({ error: "아직 적재된 학기 데이터가 없습니다" }, { status: 404 });
  }
  return Response.json(semester);
}
