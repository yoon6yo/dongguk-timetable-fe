import { gzipSync } from "node:zlib";

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
  /** Pre-serialized JSON body, computed once per TTL window rather than per
   * request, alongside its pre-gzipped form (courses/route.ts picks whichever
   * the client's Accept-Encoding supports) — the full catalog is ~1.8MB and
   * Next's built-in compression never applies to Route Handler responses
   * (confirmed live: no Vary/Content-Encoding on this endpoint), so without
   * this every request shipped the raw ~1.8MB uncompressed. */
  body: string;
  gzipBody: Buffer;
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
  const body = JSON.stringify(data);
  return { data, etag: computeEtag(data), body, gzipBody: gzipSync(body) };
});

export function getLatestSemesterCacheEntry(): Promise<LatestSemesterCacheEntry> {
  return cache.get();
}

/** Exposed for ops use (e.g. a future manual "refresh now" admin action) — not currently wired to any route. */
export function clearLatestSemesterCache(): void {
  cache.clear();
}
