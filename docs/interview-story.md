# Interview story: "Tell me about Orbit"

Three lengths of the same answer. Same facts each time — the difference is how much detail I go into.

## 30 seconds

"Orbit is a project-management app for small teams — think a lightweight Linear. Workspaces, projects, a realtime Kanban board, task detail with comments and activity, and a page called Pulse that shows who's working on what so people stop asking each other for status. I built it end-to-end on Next.js and Supabase: Postgres with Row Level Security is the actual authorization boundary, not just the UI, and Supabase Realtime keeps everyone's board in sync live. It's deployed on Vercel and I've got Playwright end-to-end tests covering auth, realtime, and permissions."

## 60 seconds

"Small teams' work tends to live scattered across chat, meetings, and half-updated spreadsheets — not because people aren't working, but because the current state of the work is hard to see. Orbit centralizes that into one workspace: projects hold work items, work items have a status, priority, assignee, and due date, and everything is realtime, so if you move a card, everyone looking at that board sees it move immediately.

I built the whole stack — Next.js 16 with Server Components and Server Actions, Supabase for Postgres, Auth, and Realtime. The part I'm most proud of is the security model: every table has Row Level Security enabled, and role checks, last-owner protection, and 'an assignee must be a workspace member' are all enforced in Postgres itself, with triggers and `SECURITY DEFINER` functions — not just in the frontend. So even if a Server Action had a bug, the database would still refuse the bad write.

I also hit and fixed some real bugs along the way — a Realtime auth race where channels sometimes joined with the wrong credentials and silently stopped receiving events, and a case where removing a team member could leave a task pointing at an assignee who was no longer on the team. Both are documented with the fix and a regression test."

## 2 minutes

"The idea behind Orbit came from a pretty ordinary problem: on a small team, the blocker usually isn't that people aren't working, it's that nobody can see the current state of the work without asking. It's scattered across chat, meetings, and spreadsheets that go stale the moment someone updates a task somewhere else. Orbit's answer is one workspace where a project's work items carry status, priority, assignee, and due date, and the whole thing updates live — so 'where are you with this' becomes a question you can answer by looking, not asking.

Product-wise, the structure is workspace → projects → work items, with comments and an activity log attached to each item, and notifications that fan out from that activity to the right people — the assignee, whoever created the item, anyone `@mentioned`. There's a page called Pulse that's basically 'what changed and what needs attention,' and a My Work view that's the same lens but scoped to just you.

Technically, it's Next.js 16 with the App Router — Server Components for reads, Server Actions for writes — on top of Supabase: Postgres, Auth, and Realtime. The decision I'd point to first is putting the actual security boundary in the database, not the frontend. Every table has Row Level Security, and things like role hierarchy, last-owner protection, and 'you can only assign work to an actual member of this workspace' are enforced with Postgres triggers and `SECURITY DEFINER` helper functions with a locked `search_path`. If a Server Action forgets a check, the database still refuses the write — the frontend genuinely cannot bypass this, because there's no privileged key anywhere in the app; every query goes through the same session the browser has.

Realtime was the trickiest part to get right. The naive version — just refresh on focus — didn't feel like the product I was going for, and Supabase Realtime's filters are evaluated against whatever token the socket authenticated with, not necessarily the session you'd expect. I actually shipped a bug where channels sometimes subscribed before the session token was pushed to the socket, so they silently joined as `anon`, which has no table grants — so the channel just never got events instead of erroring. That kind of failure is genuinely hard to spot because nothing crashes; it looks like a flaky feature until you know to check the socket's auth state. I fixed it by making sure the token is pushed before every subscribe, and now there's a two-browser-context Playwright test that would catch it again.

The other one I'm proud of: removing someone from a workspace used to leave their open tasks pointing at an assignee who was no longer a member — nothing cleaned that up. I added a trigger that clears just the assignee pointer on delete and leaves the task, its history, and everyone else's assignments untouched, so the team loses a person, not the work. Both of those are written up with the fix and the regression test in the repo, because I think showing what broke and how I found it says more than a clean feature list."
