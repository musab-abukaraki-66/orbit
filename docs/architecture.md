# Architecture

Orbit is a single Next.js application backed by Supabase. There is no separate backend service — Server Components and Server Actions *are* the backend, and Postgres is the only place authorization decisions are actually enforced.

```text
Browser
  │
  │  React 19 client components (board drag, realtime subscriptions, forms)
  ▼
Next.js 16 (App Router, Turbopack)
  │
  ├── Server Components — read data with the user's own Supabase session
  ├── Server Actions      — mutate data (create task, invite member, move card…)
  └── proxy.ts             — Next.js 16 proxy (route guard for /app, /w, /onboarding)
  │
  ▼
Supabase
  ├── Auth        — email/password, session cookies, password recovery
  ├── Postgres    — schema, triggers, RPCs (supabase/migrations/20260916200000_v2_schema.sql)
  ├── RLS         — every table; the real authorization boundary
  └── Realtime    — postgres_changes over the tables in the publication
  │
  ▼
Vercel (hosting + CI on every push)
```

## Why this shape

**No custom API layer.** Server Actions call the Supabase client directly with the signed-in user's own session — the same anon key and JWT the browser would use. There's no service-role key anywhere in the app (`.env.local.example` says so explicitly, and it's a rule in [`CLAUDE.md`](../CLAUDE.md)), so there's no privileged backend path that could accidentally skip RLS. A Server Action that forgot a permission check doesn't create a hole, because Postgres checks again regardless of what the action sent.

**Server Components for reads, Server Actions for writes.** Pages like the board, Pulse and My Work fetch data in Server Components — the query runs on the server with the user's session, and the HTML that reaches the browser only ever contained rows RLS already allowed. Every mutation (creating a task, inviting a member, moving a card, posting a comment) is a Server Action, so the browser never talks to Postgres directly except through Realtime's websocket.

**Optimistic UI, reconciled by version.** The Kanban board updates the dragged card's column immediately (`components/items/board.tsx`), then confirms with the Server Action and the eventual Realtime event for that row. `work_items` and `projects` carry a `version` column bumped by a trigger on every update; the board merges an incoming server or Realtime row by version so a slow request can't clobber a newer state that already landed from somewhere else.

**Realtime as its own concern, not bolted onto fetches.** `lib/supabase/realtime.ts` pushes the current session token to the socket before every channel subscribe — Realtime's row-level filters are evaluated with that token, not the anon key, so a channel that subscribed too early would silently see nothing. `components/realtime/use-live-refresh.ts` debounces a `router.refresh()` for the views (Pulse, lists, inbox) that read via Server Components instead of holding live rows in client state. See [Realtime Collaboration](../README.md#realtime-collaboration) for the full event path.

**`proxy.ts` as the one route guard.** Next.js 16 replaces the old edge middleware model with a proxy; Orbit uses it to gate `/app`, `/w/*` and `/onboarding` behind a valid session before a Server Component ever runs, so an unauthenticated request never reaches a page that would otherwise 500 on a missing user. This is a UX gate, not the security boundary — RLS is.

## Boundaries

| Layer | Responsible for | Not responsible for |
|---|---|---|
| React components | Rendering, optimistic UI, drag interactions | Deciding what a user is allowed to see or change |
| Server Actions | Calling Supabase with the user's session, `revalidatePath` after writes | Authorization — they can attempt anything; Postgres decides |
| `proxy.ts` | Redirecting signed-out users away from app routes | Multi-tenant isolation |
| Postgres RLS + triggers | The actual authorization boundary, data integrity, the audit trail | Presentation |
| Supabase Realtime | Pushing row changes to subscribed, authorized clients | Long-term history (that's `activity_log`) |

## Deployment

Vercel builds the app on every push to `main` (framework preset: Next.js). CI (`.github/workflows/ci.yml`) runs lint, typecheck and a production build with placeholder Supabase env vars on every push and pull request — a broken build never reaches `main` unreviewed. The real Supabase project URL and anon key are set as Vercel environment variables; `NEXT_PUBLIC_SITE_URL` is used for auth redirects, invitation links and Open Graph metadata. `npm run build` also runs a post-build check (`scripts/verify-bundle-isolation.mjs`) that fails the build if the GSAP landing-page animation library leaks into any route other than `/`.
