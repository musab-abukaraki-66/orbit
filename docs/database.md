# Database

Everything below reflects the single migration that defines the schema:
[`supabase/migrations/20260916200000_v2_schema.sql`](../supabase/migrations/20260916200000_v2_schema.sql) (983 lines — tables, triggers, RPCs, grants, RLS and the Realtime publication, all in one file, verified against the live schema). Fifteen tables in `public`, one `private` schema for internal helpers that are never exposed to clients.

## Tables

| Table | Purpose |
|---|---|
| `profiles` | Mirrors `auth.users` (name, email, avatar) so the app can join on a plain Postgres table instead of the auth schema. |
| `workspaces` | The tenant boundary. Has a `slug` (URL), a short `key` (e.g. `ACME`, used to number work items `ACME-12`) and an `item_counter`. |
| `workspace_memberships` | Join table between users and workspaces, carrying the `ws_role` (`owner` / `admin` / `member`). |
| `teams` | One hidden default team per workspace; owns the workspace's `statuses`. Modeled as its own table so a workspace can grow more than one team later without a schema change. |
| `statuses` | Per-team Kanban columns (Backlog, Todo, In Progress, In Review, Done, Canceled by default), each with a `status_category` used to compute progress. |
| `labels` | Per-workspace tags (Bug, Feature, Improvement, Design by default). |
| `projects` | Lead, status, health, target date. A project belongs to one team. |
| `project_memberships` | Who is on a project; the lead is added automatically. |
| `project_updates` | Health check-ins on a project; each one also updates `projects.health` and writes an activity entry. |
| `work_items` | The task itself: title, description, status, priority, assignee, due date, human-readable `key`, drag position, soft-archive. |
| `work_item_labels` | Many-to-many between work items and labels. |
| `comments` | Threaded on a work item, with `@mention` user ids and an edited timestamp. |
| `activity_log` | Append-only history: every status/assignee/priority/title/due-date/description change, every comment, every project event. Clients cannot write to this table directly — only triggers do. |
| `notifications` | Per-user inbox rows, fanned out from `activity_log` by a trigger (assigned, mentioned, commented, status changed, invited, member joined, project update). |
| `invitations` | Pending/accepted/revoked/expired invites, keyed by a hashed token, never the raw token. |

## Relationships

```text
workspaces
  ├── workspace_memberships (user × role)
  ├── teams
  │     └── statuses
  ├── labels
  ├── invitations
  └── projects
        ├── project_memberships
        ├── project_updates
        └── work_items
              ├── work_item_labels ── labels
              ├── comments
              └── activity_log ──► notifications (fan-out trigger)
```

A work item's `team_id` and `status_id` are both foreign-keyed through the *same* team via a composite foreign key (`(status_id, team_id) references statuses (id, team_id)`), so a work item can never point at a status that belongs to a different team than the one its project uses.

## Enums

`ws_role` (owner/admin/member) · `status_category` (backlog/unstarted/started/completed/canceled) · `item_priority` (none/low/medium/high/urgent) · `project_status` (backlog/planned/in_progress/completed/canceled) · `project_health` (on_track/at_risk/off_track) · `invite_status` (pending/accepted/revoked/expired) · `notification_kind` (assigned/mentioned/commented/status_changed/invited/member_joined/project_update).

## Triggers and RPCs, in one line each

- **`private.workspace_after_insert`** — creates the owner membership, the default team and the four default labels the moment a workspace is inserted, so a new workspace is never in a half-set-up state.
- **`private.team_after_insert`** — seeds the six default statuses for a new team.
- **`private.work_item_before_insert`** — assigns the workspace/team from the project, the next `key` (atomically increments `workspaces.item_counter`), the default status, and a drag position at the end of the column.
- **`private.work_item_assignee_guard`** — refuses an insert/update if `assignee_id` is not a member of the item's workspace. This is the DB-level version of "assignee must be a member" — the UI only ever offers members as options, but the constraint holds even if a stale client sends something else.
- **`private.membership_guard`** — blocks removing or demoting the last `owner` of a workspace (`last_owner` error), and makes the identity columns of a membership row immutable.
- **`private.membership_after_delete`** — when a membership row is deleted, clears `assignee_id` on that person's open work items in that workspace. The work item and its history are untouched; only the now-invalid assignee pointer is cleared. See [Engineering Challenges](engineering-challenges.md).
- **`private.work_item_activity`** / **`private.comment_after_insert`** / **`private.project_after_write`** — write one `activity_log` row per meaningful change (status, assignee, priority, title, due date, description, comments, project status).
- **`private.notify_from_activity`** — reads `activity_log` and fans out `notifications` rows to the right users (assignee, creator, `@mentions`), skipping the actor who caused the change.
- **`public.create_workspace(name, slug, key)`** — the only way to create a workspace; runs as the caller.
- **`public.create_invitation(workspace, email, role)`** — checks the caller is an admin/owner, refuses to invite an existing member or grant a role above the caller's own rank, revokes any prior pending invite to that email, and returns a random token — only its SHA-256 hash is stored.
- **`public.get_invitation(token)`** — the one function grantable to `anon`; returns a masked email so the invite landing page can render before sign-in without leaking the full address.
- **`public.accept_invitation(token)`** — row-locks the invitation, checks status/expiry/email match, inserts the membership at the invited role, marks the invite accepted, notifies the inviter.
- **`public.transfer_ownership(workspace, user)`** — owner-only; makes the target the new owner and demotes the caller to admin in the same statement, so a workspace is never briefly ownerless.
- **`public.seed_sample_project(workspace)`** — creates the "Getting started with Orbit" onboarding project and its sample cards; tolerates a workspace whose default labels were already renamed or deleted.

## Row Level Security

Every table has RLS enabled and `anon` has zero table grants (`revoke all on all tables in schema public from anon`). Every policy is scoped through the workspace: most tables answer to `private.is_ws_member(workspace_id)` or `private.is_ws_admin(workspace_id)`, both `SECURITY DEFINER` functions with `search_path = ''` so they can't be tricked by a search-path attack. A few examples:

- **`work_items_delete`** — an admin, or whoever created the item; not just any member.
- **`projects_update`** — an admin, or the project's lead.
- **`comments_update` / `comments_delete`** — the comment's author only (delete also allows an admin).
- **`invitations_select|update|delete`** — admins only; a plain member cannot see or touch pending invitations.
- **`memberships_update`** — an admin can change a role, but only to a rank at or below their own, and only for someone currently ranked below them — a member can never promote themselves, and an admin can't hand out `owner`.

`activity_log` has a `select` policy and no `insert`/`update`/`delete` grants to `authenticated` at all — the only way a row gets in is through a trigger running as the row's own owner-level `SECURITY DEFINER` function, so the audit trail can't be edited or backdated by a client.

## Realtime

`supabase_realtime` publishes eight tables: `work_items`, `work_item_labels`, `comments`, `projects`, `notifications`, `activity_log`, `workspace_memberships`, `invitations`. `work_items`, `comments` and `projects` are set to `replica identity full` so an `UPDATE` event carries the complete previous row, not just the primary key — the board needs the old values to merge a live change into what's already on screen. See [Realtime Collaboration](../README.md#realtime-collaboration) in the README for the end-to-end flow.

## What's deliberately not modeled

There is no `billing`, `subscriptions`, `stripe_customers` or `ai_*` table. The Billing and AI screens in the product are UI-only previews (see [Current Limitations](../README.md#current-limitations--next-steps)) — nothing in the schema pretends otherwise.
