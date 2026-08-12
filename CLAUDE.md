# Orbit — Agent Guide

## What this project is

**Orbit** is a team project-management app inspired by Linear. Teams collaborate on tasks across workspaces and Kanban boards. The product spec lives at [`../prd.md`](../prd.md) (repo root, one level above this directory).

**Current state:** Milestones M1–M5 (foundation & design system, Supabase data model, auth & onboarding, workspaces & boards, Kanban & drag-and-drop) are complete. M6 (team & user management) is next up (not yet started); M7–M9 are not started. See [`plan.md`](./plan.md) for the live status — it is the source of truth. All application code and config live in this directory (the directory containing `package.json`).

## Product scope (from PRD)

| Area | Requirements |
|------|----------------|
| Onboarding | Team creation, welcome flow |
| Workspaces | Multi-workspace support with boards |
| Boards | Kanban layout with drag-and-drop |
| People | Team and user management |
| Billing | Stripe subscriptions (Lite, Pro) |
| Email | Resend welcome emails |
| AI | AI SDK-powered features |
| UI | shadcn/ui, **dark mode default**, light mode toggle |

## Build milestones

Work in order. Each milestone should be shippable before starting the next.

### M1 — Foundation & design system
- Install and configure **shadcn/ui** on Tailwind v4
- App shell: sidebar, header, workspace layout
- **Dark mode default** with explicit light/dark toggle (class-based, not `prefers-color-scheme` alone)
- Replace create-next-app boilerplate with Orbit branding
- **`proxy.ts`** for auth guards and route protection (Next.js 16 pattern)
- Env var scaffolding (`.env.local.example`)

### M2 — Supabase local & data model
- Run **Supabase locally via Docker** (`supabase start`)
- Core schema: users, teams, workspaces, boards, columns, tasks, memberships
- Row Level Security (RLS) policies for multi-tenant isolation
- Supabase client helpers (`@/lib/supabase/server`, `@/lib/supabase/client`)
- Generate TypeScript types from schema

### M3 — Auth & onboarding
- Supabase Auth (sign up, sign in, sign out)
- Team creation onboarding flow (first-run after signup)
- Protected routes via `proxy.ts`
- **Resend** welcome email on signup (server action or route handler)
- Basic user profile page

### M4 — Workspaces & boards
- Create/list/switch workspaces
- Create/list boards within a workspace
- Board detail page (empty column shell)
- Navigation: workspace picker, board list in sidebar
- CRUD server actions with optimistic UI where appropriate

### M5 — Kanban & drag-and-drop
- Column model (status lanes) with task cards
- Task CRUD: title, description, assignee, priority, status
- Drag-and-drop between columns and reorder within column (`@dnd-kit` or equivalent)
- Supabase Realtime for live board updates across clients
- Keyboard-accessible DnD fallbacks

### M6 — Team & user management
- Invite members by email
- Roles: owner, admin, member (enforce in RLS)
- Team settings page
- Remove/update member roles
- Pending invite handling

### M7 — Stripe billing
- **Lite** and **Pro** subscription plans in Stripe
- Checkout and customer portal
- Webhook handler for subscription lifecycle
- Feature gating by plan (board limits, seats, etc. — define in PRD as needed)
- Billing settings UI

### M8 — AI features
- Integrate **Vercel AI SDK**
- Ship at least one user-facing AI workflow (e.g. task description generation, sprint summary)
- Server-side only for API keys; stream responses to client
- Respect plan limits (Pro-only if applicable)

### M9 — Polish & production readiness
- Error boundaries, empty states, loading skeletons
- E2E smoke tests for critical paths
- Production Supabase + Stripe + Resend config
- Performance pass (see `vercel-react-best-practices` skill)
- Deploy to Vercel

## Tech stack

| Tool | Version / notes |
|------|-----------------|
| Next.js | 16.3.0 — App Router, **`proxy.ts`** for middleware-style logic |
| React | 19.2.8 |
| TypeScript | ^5, `strict: true` |
| Tailwind CSS | ^4 |
| shadcn/ui | To be added (M1) |
| Supabase | Local Docker first, then hosted |
| Stripe | Subscriptions (Lite, Pro) |
| Resend | Transactional email |
| Vercel AI SDK | AI features |
| ESLint | ^9 (`eslint-config-next` 16.3.0) |

**Also used today:** Geist fonts via `next/font/google`, PostCSS with `@tailwindcss/postcss`.

## Project structure

```
Orbit/                      ← repo root; prd.md lives here
└── orbit/                  ← project root (run all npm commands here)
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── globals.css
    │   └── favicon.ico
    ├── public/
    ├── .agents/skills/     ← vercel-react-best-practices skill
    ├── proxy.ts            ← to be added (M1): auth, redirects
    ├── supabase/           ← to be added (M2): migrations, config
    ├── components/         ← to be added (M1): shadcn + app components
    ├── lib/                ← to be added: supabase, stripe, utils
    ├── next.config.ts
    ├── tsconfig.json       ← `@/*` → `./*`
    ├── postcss.config.mjs
    ├── eslint.config.mjs
    ├── skills-lock.json
    ├── AGENTS.md           ← auto-generated by `next dev`
    ├── CLAUDE.md           ← this file
    └── package.json
```

## Development server

From the project root (`orbit/`):

```bash
npm install          # first time only
npm run dev          # Next.js dev server → http://localhost:3000
```

Supabase local (after M2):

```bash
supabase start       # from orbit/ once supabase/ is initialized
```

Production:

```bash
npm run build
npm run start
```

## npm scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `next dev` | Start dev server with HMR |
| `build` | `next build` | Production build |
| `start` | `next start` | Serve production build |
| `lint` | `eslint` | Lint the codebase |

## Integrations (use MCP)

When wiring external services, prefer **MCP tools** where available (Supabase, Stripe, etc.) over guessing API shapes. Read service docs before implementing.

| Service | Env vars (examples) | Notes |
|---------|---------------------|-------|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Local URLs from `supabase start` |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Webhook route in `app/api/` |
| Resend | `RESEND_API_KEY` | Send from server only |
| AI SDK | Provider-specific (e.g. `OPENAI_API_KEY`) | Never expose to client |

## Coding conventions

- **Language:** TypeScript with `strict: true`. Prefer `.tsx` for components.
- **Imports:** Use `@/` path alias (maps to project root).
- **Components:** Default-export React function components; named exports for utilities/types.
- **Server vs client:** Server Components by default. `"use client"` only for hooks, events, browser APIs, DnD.
- **Data mutations:** Prefer Server Actions; Route Handlers for webhooks and third-party callbacks.
- **Styling:** Tailwind utilities + shadcn/ui; shared tokens in `app/globals.css`.
- **Images:** `next/image`; static assets in `public/`.
- **Scope:** Minimal, focused diffs. Match existing patterns before new abstractions.
- **Performance:** Follow `.agents/skills/vercel-react-best-practices/` when building React/Next.js features.
- **Lint:** Run `npm run lint` after substantive edits.

## Important development rules

1. **Next.js 16 differs from older versions.** Read guides in `node_modules/next/dist/docs/` before writing Next.js code. Use `proxy.ts` instead of legacy middleware patterns where applicable.
2. **Do not edit** `next-env.d.ts`.
3. **`AGENTS.md` (root)** is auto-generated by `next dev` — commit it with related work.
4. **Do not commit secrets** — use `.env.local` (gitignored) and `.env.local.example` (committed, no values).
5. **Only create commits or PRs when explicitly asked.**
6. **Read `../prd.md`** before implementing product features; do not invent scope beyond it without user confirmation.

## Next.js App Router conventions

- **Routing:** Filesystem-based under `app/`
  - `(auth)/` route groups for login/signup
  - `[workspaceSlug]/` for workspace-scoped pages
  - `[boardId]/` for board views
- **Layouts:** Nested `layout.tsx` for app shell vs auth pages
- **Loading/errors:** Colocate `loading.tsx`, `error.tsx`, `not-found.tsx`
- **proxy.ts:** Central place for session checks, redirects, header injection (M1)

## Tailwind & theming conventions

- **Tailwind v4:** `@import "tailwindcss"` in `globals.css` — no legacy `tailwind.config.js` unless shadcn requires it
- **shadcn/ui:** Use CLI to add components; keep variants consistent
- **Dark mode default:** Set `class="dark"` on `<html>` by default; toggle stores preference (localStorage/cookie)
- **Semantic tokens:** `--background`, `--foreground`, shadcn CSS variables in `@theme inline`
- **Fonts:** Geist sans/mono via `next/font` in root layout

## Quick reference

| Task | Where |
|------|-------|
| Product requirements | `../prd.md` |
| New page | `app/<route>/page.tsx` |
| UI components | `components/ui/` (shadcn), `components/` (app) |
| Supabase clients | `lib/supabase/` |
| DB migrations | `supabase/migrations/` |
| Server actions | `app/<feature>/actions.ts` or `lib/actions/` |
| Webhooks | `app/api/webhooks/<service>/route.ts` |
| Auth/routing guards | `proxy.ts` |
| Env template | `.env.local.example` |
