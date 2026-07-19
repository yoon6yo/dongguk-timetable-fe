import { describe, expect, it } from "vitest";

import { isLikelyBot } from "../botDetection";

function requestWithUA(userAgent: string | null): Request {
  return new Request("http://localhost/api/courses", userAgent == null ? {} : { headers: { "User-Agent": userAgent } });
}

const REAL_BROWSER_UAS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
];

const BOT_UAS = [
  "curl/8.4.0",
  "Wget/1.21.3",
  "python-requests/2.31.0",
  "Scrapy/2.11 (+https://scrapy.org)",
  "Go-http-client/1.1",
  "okhttp/4.9.0",
  "Java/17.0.1",
  "Googlebot/2.1 (+http://www.google.com/bot.html)",
  "Mozilla/5.0 (compatible; SomeCrawler/1.0)",
];

describe("isLikelyBot", () => {
  it("treats a missing User-Agent header as a bot", () => {
    expect(isLikelyBot(requestWithUA(null))).toBe(true);
  });

  it("treats an empty/whitespace User-Agent as a bot", () => {
    expect(isLikelyBot(requestWithUA(""))).toBe(true);
    expect(isLikelyBot(requestWithUA("   "))).toBe(true);
  });

  it.each(REAL_BROWSER_UAS)("does not flag a real browser User-Agent: %s", (ua) => {
    expect(isLikelyBot(requestWithUA(ua))).toBe(false);
  });

  it.each(BOT_UAS)("flags a known scraper/bot User-Agent: %s", (ua) => {
    expect(isLikelyBot(requestWithUA(ua))).toBe(true);
  });
});
