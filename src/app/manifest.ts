import type { MetadataRoute } from "next";

import { getT } from "@/lib/i18n/server";

/**
 * Makes "Add to Home Screen" produce a real app entry rather than a browser
 * bookmark: its own name, no browser chrome, and the app's own dark ground
 * behind the splash instead of white.
 *
 * The name is a proper noun and stays put; only the description and the
 * shortcut labels follow the reader. Browsers fetch the manifest without
 * cookies in some cases, so this leans on `getLocale()`'s `Accept-Language`
 * fallback rather than assuming the locale cookie comes along.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { t } = await getT();

  return {
    // Identity is pinned to the scope rather than to `start_url`, so changing
    // where the app opens later doesn't read as a different app and leave two
    // icons on the home screen.
    id: "/",
    name: t.appName,
    short_name: t.appName,
    description: t.meta.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1a1a1c",
    theme_color: "#1a1a1c",
    categories: ["finance", "productivity"],
    icons: [
      // Chrome picks by size, so both rasters are offered before the vector.
      { src: "/icon-192.png", type: "image/png", sizes: "192x192", purpose: "any" },
      { src: "/icon-512.png", type: "image/png", sizes: "512x512", purpose: "any" },
      // Separate entry: a maskable icon carries the padding Android's crop
      // needs, which would read as a shrunken mark anywhere else.
      {
        src: "/icon-maskable.png",
        type: "image/png",
        sizes: "512x512",
        purpose: "maskable",
      },
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
    ],
    // Long-press the home-screen icon: the two things worth a direct route.
    shortcuts: [
      {
        name: t.nav.add,
        url: "/",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: t.nav.week,
        url: "/week",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
