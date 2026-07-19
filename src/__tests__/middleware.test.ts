import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { config, middleware } from "../middleware";

const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0";

function requestTo(path: string, userAgent: string | null): NextRequest {
  const headers: Record<string, string> = {};
  if (userAgent != null) headers["User-Agent"] = userAgent;
  return new NextRequest(new URL(path, "http://localhost"), { headers });
}

describe("middleware", () => {
  it("passes through a request with a real browser User-Agent", () => {
    const response = middleware(requestTo("/api/courses", BROWSER_UA));
    expect(response.status).toBe(200); // NextResponse.next() reports 200 with no body
  });

  it("blocks a request with a missing User-Agent", () => {
    const response = middleware(requestTo("/api/courses", null));
    expect(response.status).toBe(403);
  });

  it("blocks a request with a known scraper User-Agent", () => {
    const response = middleware(requestTo("/api/semesters/latest", "curl/8.4.0"));
    expect(response.status).toBe(403);
  });

  it("matcher covers the catalog routes but excludes /api/health", () => {
    expect(config.matcher).toContain("/api/courses");
    expect(config.matcher).toContain("/api/semesters/latest");
    expect(config.matcher).not.toContain("/api/health");
  });
});
