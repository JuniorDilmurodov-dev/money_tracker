import { appIcon } from "@/lib/app-icon";

// The mark never changes, so this is rendered once at build time rather than on
// every request from a launcher.
export const dynamic = "force-static";

export function GET() {
  return appIcon(192);
}
