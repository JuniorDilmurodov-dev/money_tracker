import type { MetadataRoute } from "next";

import { getT } from "@/lib/i18n/server";

/**
 * Makes "Add to Home Screen" produce a real app entry rather than a browser
 * bookmark: its own name, no browser chrome, and the app's own dark ground
 * behind the splash instead of white.
 *
 * The name is a proper noun and stays put; only the description follows the
 * reader. Browsers fetch the manifest without cookies in some cases, so this
 * leans on `getLocale()`'s `Accept-Language` fallback rather than assuming the
 * locale cookie comes along.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { t } = await getT();

  return {
    name: t.appName,
    short_name: t.appName,
    description: t.meta.description,
    start_url: "/",
    display: "standalone",
    background_color: "#1a1a1c",
    theme_color: "#1a1a1c",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
      { src: "/apple-icon", type: "image/png", sizes: "180x180", purpose: "any" },
    ],
  };
}
