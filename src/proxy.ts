import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import {
  isLocale,
  localeFromAcceptLanguage,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
} from "@/lib/i18n/config";

/**
 * First visit only: pin the language the browser asked for so it survives the
 * `Accept-Language` header changing later. Server Components fall back to the
 * same header when the cookie is missing, so a request that skips this still
 * renders in the right language — it just won't be remembered.
 */
function persistLocale(response: NextResponse, request: NextRequest): NextResponse {
  if (isLocale(request.cookies.get(LOCALE_COOKIE)?.value)) return response;

  response.cookies.set(
    LOCALE_COOKIE,
    localeFromAcceptLanguage(request.headers.get("accept-language")),
    { path: "/", maxAge: LOCALE_COOKIE_MAX_AGE, sameSite: "lax" },
  );
  return response;
}

/**
 * Next 16 renamed `middleware` to `proxy`. This runs before every matched
 * request and refreshes the Supabase session so Server Components always see a
 * valid token, then gates the app behind auth.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          // Responses that set auth cookies must never be cached by a CDN.
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  // Must run before the response is returned so a refreshed token gets written.
  // getClaims() verifies the JWT locally against a cached JWKS (this project
  // uses ES256), so this costs no network round trip on the common path — only
  // an actual token refresh hits the network.
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims?.claims?.sub ? claims.claims : null;

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/auth");

  // Route handlers answer for themselves — redirecting them to an HTML page
  // would hand a fetch() caller markup instead of its JSON error.
  if (pathname.startsWith("/api")) return response;

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return persistLocale(NextResponse.redirect(url), request);
  }

  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return persistLocale(NextResponse.redirect(url), request);
  }

  return persistLocale(response, request);
}

export const config = {
  matcher: [
    // Everything except Next internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
