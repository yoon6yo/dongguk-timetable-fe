/**
 * Cheap, deliberately non-cryptographic scraper friction for the read-only
 * catalog endpoints (/api/courses, /api/semesters/latest). Not a real
 * security boundary — anyone can spoof a browser User-Agent — but it stops
 * the default behavior of common scraping tools (curl, requests, scrapy,
 * bare fetch scripts) that don't bother to. Paired with the ingress-level
 * per-IP rate limit (k8s/ingress.yaml's limit-rps) for the volume side of
 * the same problem; deliberately NOT applied to /api/health, which k8s's
 * kubelet probes hit without a browser User-Agent.
 */
const BOT_USER_AGENT_PATTERN =
  /curl|wget|python-requests|python-urllib|go-http-client|scrapy|okhttp|libwww-perl|httpclient|^java\/|phantomjs|headlesschrome|bot|spider|crawler/i;

export function isLikelyBot(request: Request): boolean {
  const userAgent = request.headers.get("user-agent");
  if (!userAgent || userAgent.trim() === "") return true;
  return BOT_USER_AGENT_PATTERN.test(userAgent);
}
