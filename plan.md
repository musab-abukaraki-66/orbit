# Orbit — Build Plan

Track implementation progress against [prd.md](./prd.md). App code lives in `orbit/`. Agent context: `orbit/CLAUDE.md`.

**Legend:** `[ ]` not started · `[~]` in progress · `[x]` done

---

## Overview

| Milestone | Name | Status | Target |
|-----------|------|--------|--------|
| M1 | Foundation & design system | `[x]` Done | — |
| M2 | Supabase local & data model | `[x]` Done | — |
| M3 | Auth & onboarding | `[x]` Done | — |
| M4 | Workspaces & boards | `[ ]` Not started | — |
| M5 | Kanban & drag-and-drop | `[ ]` Not started | — |
| M6 | Team & user management | `[ ]` Not started | — |
| M7 | Stripe billing | `[ ]` Not started | — |
| M8 | AI features | `[ ]` Not started | — |
| M9 | Polish & production readiness | `[ ]` Not started | — |

---

## M1 — Foundation & design system

**Goal:** Usable app shell with Orbit branding, theming, and route protection scaffolding.

- [ ] Install and configure shadcn/ui on Tailwind v4
- [ ] App shell: sidebar, header, main content area
- [ ] Dark mode default with light/dark toggle (class-based)
- [ ] Replace create-next-app boilerplate with Orbit landing/home
- [ ] Add `proxy.ts` for auth guards and redirects (Next.js 16)
- [ ] Add `.env.local.example` with placeholder keys

**Done when:** App loads with Orbit UI shell, theme toggle works, proxy.ts stub redirects unauthenticated routes.

---

## M2 — Supabase local & data model

**Goal:** Local Supabase running in Docker with a multi-tenant schema and typed clients.

- [x] Initialize Supabase project (`supabase init`, Docker via `supabase start`)
- [x] Migration: teams, workspaces, boards, columns, tasks
- [x] Migration: memberships (team + workspace roles)
- [x] Row Level Security policies for tenant isolation
- [x] Supabase server/client helpers in `lib/supabase/`
- [x] Generate TypeScript types from schema

**Done when:** `supabase start` succeeds, migrations apply cleanly, types generate, RLS blocks cross-tenant access.

---

## M3 — Auth & onboarding

**Goal:** Users can sign up, create a team, and land in the app.

- [x] Supabase Auth: sign up, sign in, sign out
- [x] Auth pages: login, signup (route group `(auth)/`)
- [x] Team creation onboarding (post-signup first-run)
- [x] Wire `proxy.ts` to protect app routes
- [x] Resend welcome email on signup
- [x] Basic user profile page

**Done when:** New user can register, receive welcome email, create a team, and reach the app shell.

---

## M4 — Workspaces & boards

**Goal:** Teams can organize work into workspaces and boards.

- [ ] Create and list workspaces
- [ ] Switch active workspace (picker in sidebar)
- [ ] Create and list boards within a workspace
- [ ] Board detail page (column shell, no DnD yet)
- [ ] Server actions for workspace/board CRUD
- [ ] Sidebar navigation: workspace → boards

**Done when:** User can create workspaces and boards and navigate between them.

---

## M5 — Kanban & drag-and-drop

**Goal:** Full Kanban board experience with live updates.

- [ ] Column model (status lanes) seeded per board
- [ ] Task cards: title, description, assignee, priority, status
- [ ] Task CRUD server actions
- [ ] Drag-and-drop: reorder within column, move across columns
- [ ] Supabase Realtime subscriptions for board changes
- [ ] Keyboard-accessible DnD fallbacks

**Done when:** Two clients see the same board update in real time; tasks move smoothly via drag-and-drop.

---

## M6 — Team & user management

**Goal:** Teams can grow and admins can manage access.

- [ ] Invite members by email
- [ ] Roles: owner, admin, member (enforced in RLS)
- [ ] Team settings page
- [ ] Update and remove member roles
- [ ] Pending invite accept flow

**Done when:** Admin can invite a user who joins the team with the correct role.

---

## M7 — Stripe billing

**Goal:** Monetize with Lite and Pro subscription tiers.

- [ ] Create Lite and Pro products/prices in Stripe
- [ ] Checkout flow for new subscriptions
- [ ] Stripe customer portal (manage billing)
- [ ] Webhook handler: subscription created/updated/canceled
- [ ] Feature gating by plan (define limits in PRD)
- [ ] Billing settings UI in app

**Done when:** User can subscribe, portal works, webhooks sync plan state, gated features respect plan.

---

## M8 — AI features

**Goal:** Ship AI-powered workflows via Vercel AI SDK.

- [ ] Integrate Vercel AI SDK
- [ ] Choose and implement first AI workflow (e.g. task description generation)
- [ ] Stream responses to client; API keys server-side only
- [ ] Respect plan limits (e.g. Pro-only or usage caps)

**Done when:** At least one AI feature is usable in production-like conditions.

---

## M9 — Polish & production readiness

**Goal:** Ship a stable, deployable product.

- [ ] Error boundaries, empty states, loading skeletons
- [ ] E2E smoke tests for auth, board, billing paths
- [ ] Production config: Supabase, Stripe, Resend
- [ ] Performance pass (vercel-react-best-practices skill)
- [ ] Deploy to Vercel

**Done when:** App is deployed, critical paths tested, and third-party services configured for production.

---

## Open questions (resolve before relevant milestone)

| Question | Blocks | Notes |
|----------|--------|-------|
| Lite vs Pro limits (seats, boards, AI usage) | M7, M8 | Define in PRD before billing |
| Auth methods (email, OAuth, magic link) | M3 | Default: email/password unless specified |
| Specific AI features | M8 | e.g. task writing, summaries, search |
| Multi-team membership per user | M2, M6 | Likely yes — confirm in schema design |

---

## Changelog

| Date | Milestone | Notes |
|------|-----------|-------|
| 2026-08-09 | — | Initial plan created from PRD |
| 2026-08-10 | M2 | Supabase local + multi-tenant schema: teams, workspaces, boards, columns, tasks; team/workspace memberships with owner/admin/member roles; RLS via SECURITY DEFINER helpers in `private` schema; `lib/supabase/` server+browser clients; generated `database.types.ts`; `supabase db reset` clean; verified cross-tenant isolation; build + lint pass |
| 2026-08-10 | M3 | Auth & onboarding implemented and tested: Supabase sign up/sign in/sign out, auth pages in `(auth)/` route group, team creation onboarding, `proxy.ts` route protection, Resend welcome email, basic user profile page |
