import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Create a new one per request — never share across requests.
 *
 * `cookies()` is async in Next 16, so this function is async too.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, which cannot write cookies.
            // proxy.ts refreshes the session on every request, so this is safe
            // to ignore.
          }
        },
      },
    },
  );
}

export type SessionUser = { id: string; email: string | null };

/**
 * The signed-in user, or null.
 *
 * Uses `getClaims()`, not `getUser()`. This project signs JWTs with an
 * asymmetric key (ES256), so the token's signature is verified locally against
 * a cached JWKS — no network round trip per request. `getUser()` calls
 * /auth/v1/user every single time, which added a full round trip to every page
 * render, before any data was fetched.
 *
 * This is not a security shortcut: the signature is cryptographically verified,
 * and row level security remains the real boundary on every query.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) return null;

  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
  };
}
