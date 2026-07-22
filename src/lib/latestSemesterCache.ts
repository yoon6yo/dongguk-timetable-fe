import { getCoursesForSemester } from "./courses";
import { getPool } from "./db";
import { computeEtag } from "./etag";
import { getLatestSemester } from "./semesters";
import { createTtlCache } from "./ttlCache";
import type { CourseRow, SemesterRow } from "./types";

export interface LatestSemesterData {
  semester: SemesterRow | null;
  courses: CourseRow[];
}

export interface LatestSemesterCacheEntry {
  data: LatestSemesterData;
  etag: string;
}

// The scribe crawler updates MySQL hourly — there's no need for every
// visitor's page load to hit the DB fresh. 5 minutes just absorbs traffic
// bursts; the ETag below is what actually saves bandwidth on top of that
// (see route handlers), by letting an unchanged client skip the body.
const CACHE_TTL_MS = 5 * 60 * 1000;

const cache = createTtlCache<LatestSemesterCacheEntry>(CACHE_TTL_MS, async () => {
  const pool = getPool();
  const semester = await getLatestSemester(pool);
  const data: LatestSemesterData = semester
    ? { semester, courses: await getCoursesForSemester(pool, semester.id) }
    : { semester: null, courses: [] };
  return { data, etag: computeEtag(data) };
});

export function getLatestSemesterCacheEntry(): Promise<LatestSemesterCacheEntry> {
  return cache.get();
}

/** Exposed for ops use (e.g. a future manual "refresh now" admin action) — not currently wired to any route. */
export function clearLatestSemesterCache(): void {
  cache.clear();
}
