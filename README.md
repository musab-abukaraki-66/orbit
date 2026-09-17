# Orbit

Orbit is a free, collaborative project-management app for small teams: workspaces, projects, a realtime Kanban board, task details with comments and activity, an inbox, and a **Pulse** page that shows who is working on what — so nobody has to ask "where are you with this?".

Built with Next.js 16 (App Router, Server Actions), React 19, Tailwind v4, shadcn/Base UI, `@dnd-kit`, and Supabase (Postgres, Auth, Row Level Security, Realtime). No paid infrastructure is required.

## Features

- **Auth** — email + password sign up / sign in / sign out, forgot / reset password (Supabase Auth recovery links), protected routes, friendly error states.
- **Onboarding** — name your workspace → default team, statuses and labels are created automatically → optional sample project → straight into the app with a short tour.
- **Workspaces** — switcher, settings, members & roles (owner / admin / member), leave, transfer ownership, delete.
- **Invitations without an email service** — admins create an invite and get a shareable link. The invitee opens it, signs up (or in) with the invited email, and joins automatically. Links expire after 14 days and can be revoked. If `RESEND_API_KEY` is set the link is also emailed.
- **Projects** — create / edit / archive, status, health, lead, members, target date, progress, updates. Board, list and overview views.
- **Tasks** — human-readable keys (`ACME-12`), title, description, status, priority, assignee, labels, due date. Click a card to open the detail sheet (deep-linkable with `?item=KEY`). Comments with `@mentions`, edit/delete, activity timeline.
- **Kanban** — drag & drop between and within columns (pointer + keyboard), optimistic updates, statuses editable per workspace in settings.
- **Realtime** — Supabase Realtime keeps boards, lists, members, inbox and Pulse in sync across browsers; resyncs on reconnect and when a tab becomes visible again.
- **Inbox** — notifications for assignments, mentions, comments, status changes, invitations and new members; mark read.
- **Pulse, My work, Search, ⌘K command menu.**
- **AI assistant / Billing** — UI previews only. No AI API and no Stripe are integrated.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then fill in the Supabase values
npm run dev
```

Open <http://localhost:3000>.

### Supabase

1. Create a Supabase project and apply `supabase/migrations/20260916200000_v2_schema.sql` (SQL editor, `supabase db push`, or the Supabase MCP `apply_migration`).
2. In **Authentication → Providers → Email** turn **Confirm email** off (Orbit signs users in immediately after sign-up), or keep it on if you prefer confirmation emails.
3. Copy the project URL and anon key into `.env.local`:

| Variable | Where used |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server (safe to expose; RLS protects data) |
| `NEXT_PUBLIC_SITE_URL` | absolute origin for invite links and emails |
| `SUPABASE_SERVICE_ROLE_KEY` | **not used by the app**; server-only if you ever add admin scripts |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | optional (Resend free tier); emails invitation links in addition to showing them — see below |

Security model: every table has RLS enabled; anonymous access to tables is revoked; role hierarchy (owner > admin > member), last-owner protection, invitation token hashing and "assignee must be a member" are enforced in Postgres with `SECURITY DEFINER` helpers and triggers — not only in the UI.

### Email (optional, free)

Orbit never depends on email: every invitation is a link you can copy. With a free [Resend](https://resend.com) API key it also emails the link, and pending invitations get a **Resend email** button (which issues a fresh link and revokes the old one).

1. Resend → API Keys → create a key → put it in `RESEND_API_KEY` locally and on Vercel.
2. Free tier without a verified domain only delivers to the Resend account's own email address, from `onboarding@resend.dev`. Verify a domain in Resend (free) to email anyone, then set `RESEND_FROM_EMAIL` to an address on that domain.
3. If delivery fails, the UI says why and still shows the link. Manual check of a real send: `INVITE_TO=you@example.com npx playwright test e2e/send-real-invite.spec.ts` (skipped when `INVITE_TO` is unset).
4. Optional: route Supabase Auth's own emails (password reset, confirmation) through the same account — Supabase dashboard → Authentication → SMTP Settings → custom SMTP: host `smtp.resend.com`, port `465`, user `resend`, password = the API key, sender = your verified address.

### Password reset

`/login` → **Forgot password?** → `/forgot-password` asks Supabase Auth to email a recovery link (`resetPasswordForEmail`); the answer is the same whether or not the address has an account. The link lands on `/auth/callback`, which turns it into a session and continues to `/update-password`, where a new password (≥ 6 characters, with a letter and a number) is saved with `updateUser`. Only a session created by a recovery link within the last hour can use that page; a normal sign-in is refused. Supabase Auth stays the only password store.

Manual Supabase settings (dashboard → Authentication):

1. **URL Configuration → Redirect URLs**: add `http://localhost:3000/**` and `https://<your-domain>/**`, otherwise Supabase ignores our `redirectTo` and sends the user to the Site URL instead.
2. **Email Templates → Reset password** (recommended): the default template uses a PKCE code that only works in the browser that requested the reset. Point the link at `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/update-password` so it works from any browser or mail app.
3. **SMTP**: Supabase's built-in mailer is fine to try things out (low rate limits, only reliably delivers to project members). For real users set custom SMTP as in step 4 above (Resend, free).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | dev server |
| `npm run build` / `npm start` | production build (also verifies bundle isolation) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm run test:e2e` | Playwright journey (needs `E2E_*` vars in `.env.local` and a running dev server) |

The e2e suite (`e2e/v2-journey.spec.ts`) covers sign-up, onboarding, projects, tasks, drag & drop, comments, settings, invitations, a second browser context joining via link, cross-browser realtime, notifications, mobile overflow, 404 and sign-out. `e2e/console-audit.spec.ts` fails on any browser console error across the main routes.

## Deploying to Vercel

1. Import the GitHub repository into Vercel (framework preset: Next.js).
2. Add the environment variables above (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL=https://<your-domain>`). Do **not** add the service-role key unless a server-only script needs it.
3. In Supabase **Authentication → URL Configuration**, set the Site URL to your Vercel domain and add it to the redirect allow-list.
4. Deploy. CI (`.github/workflows/ci.yml`) runs lint, typecheck and build on every push.

## Project layout

```
app/(auth)        login, signup, forgot-password, update-password, onboarding
app/auth/callback Supabase Auth email-link landing (recovery)
app/invite        invitation landing + accept
app/(app)/w/[slug] workspace: pulse, my-work, inbox, projects, items, search, ai, profile, settings/*
components/       ui primitives, items (board/list/detail), projects, members, inbox, settings, realtime
lib/              auth, workspaces, members, projects, items, statuses, notifications, search, supabase
supabase/migrations/20260916200000_v2_schema.sql   full schema, triggers, RPCs, RLS, realtime publication
e2e/              Playwright suites
```
