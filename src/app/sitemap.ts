import type { MetadataRoute } from "next";

const SITE_URL = "https://dongguk-timetable.duckdns.org";

// /saved and /watchlist are intentionally omitted -- their content is
// per-visitor localStorage state, nothing indexable exists there for a
// crawler. "/" is now a static landing page; /wizard is the actual product.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/wizard`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
  ];
}
