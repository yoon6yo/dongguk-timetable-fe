import type { MetadataRoute } from "next";

const SITE_URL = "https://dongguk-timetable.duckdns.org";

// /saved is intentionally omitted -- its content is per-visitor localStorage
// state, nothing indexable exists there for a crawler.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 }];
}
