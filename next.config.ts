import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // There's another lockfile in the home directory; pin the workspace root so
  // Turbopack doesn't guess wrong.
  turbopack: {
    root: path.join(__dirname),
  },

  async headers() {
    return [
      {
        // Next serves everything in `public/` with a long-lived cache header.
        // For the service worker that would pin users to whichever version
        // they first installed: the browser re-fetches `sw.js` to look for
        // changes, and a cached copy means it never sees any.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
