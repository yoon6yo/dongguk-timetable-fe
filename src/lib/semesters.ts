import type { Queryable } from "./db";
import type { SemesterRow } from "./types";

/**
 * "Latest semester" is resolved purely by reading the single is_latest=TRUE
 * row — the scribe loader is solely responsible for maintaining that flag
 * (see docs/ndrims-response-notes.md), so this stays O(1) and never
 * duplicates that decision logic on the read path.
 */
export async function getLatestSemester(db: Queryable): Promise<SemesterRow | null> {
  const [rows] = await db.query<SemesterRow>(
    `SELECT id, year, semester_code AS semesterCode, label,
            courses_synced_at AS coursesSyncedAt, applied_count_synced_at AS appliedCountSyncedAt
     FROM semesters
     WHERE is_latest = TRUE
     LIMIT 1`
  );
  return rows[0] ?? null;
}
