import { appIcon, MASKABLE_SCALE } from "@/lib/app-icon";

export const dynamic = "force-static";

export function GET() {
  return appIcon(512, MASKABLE_SCALE);
}
