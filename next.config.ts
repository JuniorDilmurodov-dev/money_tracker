import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // There's another lockfile in the home directory; pin the workspace root so
  // Turbopack doesn't guess wrong.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
