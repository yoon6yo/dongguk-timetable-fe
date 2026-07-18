import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keeps the runtime image lean — .next/standalone bundles only the traced
  // node_modules a request actually needs, no nginx required (this app's own
  // Node server serves pages + API routes; ingress-nginx proxies to it).
  output: "standalone",
  // Next.js already gzips responses by default under `next start`/standalone —
  // set explicitly so it can never be silently disabled by a future edit.
  compress: true,
};

export default nextConfig;
