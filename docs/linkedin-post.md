# LinkedIn announcement post

Ready to publish as-is.

---

Small teams spend a surprising amount of time asking where work stands instead of simply seeing it. Not because anyone's slacking — the status just lives scattered across chat threads, meetings, and a spreadsheet someone forgot to update. So I built Orbit: a real-time project management app that keeps a team's projects, tasks, and activity in one workspace that actually stays current.

Workspaces hold projects, projects hold work items, and every work item carries a status, priority, assignee, and due date. Move a card and everyone looking at that board sees it move — no refresh, no "let me check and get back to you."

The part I spent the most time getting right wasn't the UI, it was the security and sync underneath it:

→ Every one of the 15 tables has Row Level Security enabled in Postgres, and there's no service-role key anywhere in the app. Role hierarchy, workspace isolation, and constraints like "you can only assign work to an actual member of this workspace" are enforced in the database itself — so the frontend can't accidentally become the security boundary.

→ Realtime sync runs on Supabase Realtime over Postgres change events. I hit a real bug here: channels sometimes subscribed before the session token reached the socket, so they silently joined as an unauthenticated role and just stopped receiving updates — no error, no crash, just a board that quietly went stale. Fixed it, and now there's a two-browser-context Playwright test that would catch it again.

→ Invitations work as shareable links with zero email configuration required, with optional email delivery layered on top through Resend.

Stack: Next.js 16 (App Router, Server Actions) + React 19 + TypeScript, Supabase (Postgres, Auth, Realtime, RLS), deployed on Vercel with CI running lint/typecheck/build on every push, and 8 Playwright end-to-end suites covering auth, permissions, and realtime.

It's live and free to try, and the repo is public if you want to see how the pieces fit together — the schema, the RLS policies, and a few real bugs I found and fixed, written up with root cause and fix.

GitHub: https://github.com/musab-abukaraki-66/orbit
Live: https://orbit-ten-cyan.vercel.app

Next up: I'd like to wire the AI panel (currently a UI preview) up to a real model for project summaries, and expand test coverage around project-level permissions.

#softwareengineering #nextjs #supabase #postgresql #webdevelopment
