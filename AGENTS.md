<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# The service worker

`public/sw.js` is hand-written on purpose: Serwist and next-pwa still require a
webpack config and this project builds with Turbopack. Two rules it enforces
that are easy to undo by accident:

- **It must never cache a response carrying user data.** Every route here is
  per-user behind Supabase auth, so a cached page would outlive the session and
  could be served to whoever holds the phone next. Only `/_next/static/` and the
  public `/offline` page are stored. Do not "improve" this by caching
  navigations, RSC payloads (`?_rsc=`), or anything under `/api`.
- **Bump `VERSION` in `sw.js` whenever you change that file.** Activation
  deletes every cache whose name doesn't match, which is the only thing that
  evicts stale assets from installed clients.

`sw.js`, `offline`, the icon routes and `manifest.webmanifest` are excluded from
the `proxy.ts` matcher. They are fetched by the OS with no session; gated, the
service worker gets HTML where it expects JavaScript and registration fails.

Details in README §7.
