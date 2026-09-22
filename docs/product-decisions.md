# Product decisions

Why the product model looks the way it does. Every decision here is reflected in the current schema and code — this isn't an aspirational design doc.

### Why a Workspace, not just a list of projects?

A workspace is the tenant boundary: one `workspace_id` that every other table hangs off, and every RLS policy checks against. Small teams don't just have projects, they have *membership* — who's in, who's out, what role they hold — and that has to exist somewhere above "project" or invitations and permissions would have nowhere to live. I made the workspace the root so a person can belong to more than one team's workspace without their data ever mixing.

### Why Row Level Security instead of checking permissions in Server Actions?

Because a permission check in application code only holds until someone forgets to write it. I wanted the guarantee to sit one layer lower, where it can't be skipped by a new route, a refactor, or a bug — see [Security & Data Isolation](../README.md#security--data-isolation). RLS meant writing more SQL up front ([`database.md`](database.md) has the policy list), but it means the frontend is a rendering layer, not a lock.

### Why Realtime, and not just refresh-on-focus or polling?

The whole point of Orbit is answering "where does this stand?" without asking someone. If two people have the same board open and one moves a card, the other seeing it a few seconds later (or not until they refresh) reintroduces exactly the ambiguity the product exists to remove. Supabase Realtime over `postgres_changes` meant no extra infrastructure — the same Postgres tables are the source of truth for both the read and the live event.

### Why a Team between Workspace and Project?

Statuses (the Kanban columns) belong to a team, not to an individual project — I didn't want every project to redefine its own "Todo/In Progress/Done" and drift out of sync with the rest of the workspace. Today every workspace gets exactly one hidden default team, so in practice it behaves like "the workspace's statuses." Modeling it as a table now means a workspace could grow multiple teams with different status sets later without a schema change — but that's a possibility the schema leaves open, not a feature that exists yet.

### Why Project vs. Work Item as separate concepts?

A project is a body of work with its own lifecycle — a lead, a status, a health signal, a target date, and periodic updates. A work item is one piece of that work — assignable, movable between statuses, commentable. Collapsing them into one table would mean either projects lose the fields that make sense at the project level (health, updates) or work items carry a pile of nullable project-only columns. Keeping them separate also lets a project's `board`/`list`/`overview`/`updates` views all be different lenses over the same `work_items` rows instead of different tables to keep in sync.

### Why unassign a work item's owner instead of deleting the work item when a member is removed?

Removing someone from a workspace shouldn't erase the work that was happening. The `private.membership_after_delete` trigger clears `assignee_id` on that person's open items in the same workspace and leaves everything else — title, status, comments, activity history — exactly as it was. The team loses a *person*, not the record of what was being worked on. See [Engineering Challenges](engineering-challenges.md#membership-removal-and-dangling-assignments) for how this was found and fixed.

### Why invitation links instead of requiring email delivery?

Small teams often don't want to wait on email deliverability to get someone in. `create_invitation` returns a token; the UI shows the shareable link immediately, and the invite still works with zero email configuration. Resend is layered on top as an enhancement — if `RESEND_API_KEY` is set, the same link is also emailed — but it was never allowed to be a dependency the core flow needs. See [Live Demo](../README.md#live-demo) for exactly what "email" does and doesn't do today.

### Why hash the invitation token instead of storing it directly?

`invitations.token_hash` stores SHA-256 of the token; the raw token only ever exists in the URL and the response of `create_invitation`. A database read (a backup, a support query, a compromised row) can't be turned into a working invite link. `get_invitation` — the one RPC `anon` can call — also returns a masked email (`jo***@example.com`), not the full address, so the invite landing page can render before sign-in without leaking who was invited to anyone who guesses or intercepts a link.

### Why can't an admin grant a role above their own?

`create_invitation` and the `memberships_update` RLS policy both compare role rank (`private.rank`) and refuse to let a caller hand out a role equal to or above their own — an admin can invite members and other admins, never an owner; only `transfer_ownership` can create a second owner, and only the current owner can call it. Without this, an admin could invite themselves an owner-level account and there would be no ceiling on privilege escalation inside a workspace.

### Why AI and Billing as UI previews, not stubs hidden behind a flag?

Both pages are visible and clearly labeled "Coming soon" rather than cut from the build or gated behind a flag no one sees. That was a deliberate choice: showing the intended shape of the product without pretending it's already wired to an LLM or Stripe. See [Current Limitations & Next Steps](../README.md#current-limitations--next-steps) for exactly what's real and what isn't.
