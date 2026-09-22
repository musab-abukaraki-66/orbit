# LinkedIn Project entry

Ready to paste into the LinkedIn "Projects" section. Every claim below is verified against the current `main` branch (commit `c281556`) — see [docs/database.md](database.md) and [docs/engineering-challenges.md](engineering-challenges.md) for the underlying evidence.

---

**Title:** Orbit — Real-time Collaborative Project Management

**Description:**

Orbit is a free, real-time project management app for small teams — workspaces, projects, a Kanban board, task detail with comments and activity, and a page called Pulse that shows who's working on what, so people stop asking each other for status updates.

I designed and built the full product: the data model (workspace → projects → work items), the Postgres schema with Row Level Security as the actual authorization boundary — not just UI checks — realtime sync across connected clients with Supabase Realtime, invitation-by-link onboarding that doesn't require email infrastructure, and an activity/notification system that fans out from a single append-only audit log.

Technical highlights:

- Next.js 16 (App Router, Server Components, Server Actions) + React 19 + TypeScript, deployed on Vercel with CI (lint, typecheck, build) on every push
- Supabase: Postgres, Auth, Realtime, and Row Level Security enforced on all 15 tables — role hierarchy, workspace isolation, and data-integrity constraints (e.g., "an assignee must be a workspace member") are enforced in the database with triggers and `SECURITY DEFINER` functions, not only in the frontend
- Drag-and-drop Kanban board with optimistic UI, reconciled against live updates by row version
- 8 Playwright end-to-end suites (57 test cases across them), including a two-independent-browser-context realtime journey
- Found and fixed real bugs along the way — a Realtime auth race and a dangling-assignee data-integrity issue — both documented with root cause, fix, and a regression test

**Live demo:** https://orbit-ten-cyan.vercel.app
**Repository:** https://github.com/musab-abukaraki-66/orbit

**Skills to add:** Next.js · React · TypeScript · Supabase · PostgreSQL · Row Level Security (RLS) · Realtime Systems · Server Actions · Playwright · CI/CD · Vercel · Product Design
