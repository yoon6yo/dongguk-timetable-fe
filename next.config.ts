import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keeps the runtime image lean — .next/standalone bundles only the traced
  // node_modules a request actually needs, no nginx required (this app's own
  // Node server serves pages + API routes; ingress-nginx proxies to it).
  output: "standalone",
  // Next.js already gzips responses by default under `next start`/standalone —
  // set explicitly so it can never be silently disabled by a future edit.
  compress: true,

  // Baseline hardening headers Next.js doesn't set on its own. No
  // Content-Security-Policy here yet -- this app has no next/script or
  // inline-script usage today, but writing a CSP without verifying that in
  // a real browser risks silently breaking the site, so that's left as a
  // follow-up rather than guessed at here.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
