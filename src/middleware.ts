import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isLikelyBot } from "@/lib/botDetection";

/**
 * Centralizes the read-only catalog API's scraper guard — previously
 * duplicated verbatim in each route handler. `matcher` below is the
 * enforcement mechanism for keeping /api/health exempt (kubelet's
 * liveness/readiness probes hit it without a browser User-Agent), rather
 * than a comment reminding each new route to copy the check by hand.
 */
export function middleware(request: NextRequest) {
  if (isLikelyBot(request)) {
    return NextResponse.json({ error: "요청을 처리할 수 없습니다" }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/courses", "/api/semesters/latest"],
};
