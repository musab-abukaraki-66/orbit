# Engineering challenges

Three real problems found and fixed during development, in the order they happened. Each one is backed by an actual commit and an e2e test that would fail if the bug came back — this is what the commit history shows happened, not a retrospective gloss.

## Realtime channel joined with the wrong credentials

**Commit:** [`ea39a22`](https://github.com/musab-abukaraki-66/orbit/commit/ea39a22c0e66d8cbff06d310a2f3395a7ec32949) — *fix: realtime auth race, native select theming, owner workspace delete, role checks*

**Problem.** Live boards and the inbox would sometimes just stop updating — no error, no console warning, the socket looked connected. It was intermittent, which made it easy to dismiss as a fluke on first sight.

**Root cause.** Supabase Realtime evaluates a channel's row-level filters using whatever auth token was on the socket *at subscribe time*. The Supabase browser client is a singleton, and the app was subscribing to channels before reliably pushing the signed-in user's session token to the socket — so some channels joined authenticated as `anon`. `anon` has no table grants (RLS revokes all table access from `anon` by design), so Realtime silently rejected the row filter instead of erroring loudly. The failure mode was "no events, ever," not a crash — which is why it looked intermittent rather than broken.

**Fix.** The session token is now pushed to the socket before every channel subscribe, not once at app load. Because the client is a singleton, channel topics were also made unique per mount so two mounted components don't fight over one channel's state.

**Result.** Boards, task sheets, labels, members, inbox and Pulse all resync correctly, including after a reconnect. `e2e/realtime-two-browsers.spec.ts` drives two independent browser contexts through create/assign/move/edit/label/comment/delete and asserts both sides see every change, plus offline/reconnect and reload — the exact scenario that used to fail silently.

## A live update from a teammate erased labels you could already see

**Commit:** [`f0fdf18`](https://github.com/musab-abukaraki-66/orbit/commit/f0fdf1863cb39c03a1c9e188856742fd5d885279) — *chore: production audit — realtime label sync, sign-up password rule, dead code*

**Problem.** If your teammate changed anything about a card — moved it, renamed it, changed its priority — the labels you'd already loaded on that card would disappear from your screen, even though nothing about the labels had changed.

**Root cause.** The board's Realtime handler merged an incoming `UPDATE` event into local state by taking the new row from the event and treating it as the full truth. But `work_item_labels` is a separate join table — it wasn't part of the `work_items` row Realtime sent — so every merge reset `label_ids` to `[]` regardless of what was actually on the card. Any `work_items` event, for any reason, wiped every viewer's labels for that card until their next full refresh.

**Fix.** `work_item_labels` was added to the `supabase_realtime` publication (`supabase/migrations/20260916200000_v2_schema.sql`, applied live as `v2_07_realtime_work_item_labels`) and given its own subscription on the board and the task detail sheet, so label changes arrive as their own event instead of being inferred (wrongly) from unrelated work-item events.

**Result.** Label edits now propagate correctly, and a card's labels survive unrelated updates from other users.

## Removing a member could leave a work item pointing at nobody meaningful — and a failed save could strand the UI

**Commit:** [`c281556`](https://github.com/musab-abukaraki-66/orbit/commit/c28155690ced2abbbe9fbab6ad4b90421aabb95d) — *fix: clear assignee on removed-member work items; harden item-detail save error handling*

**Problem, part one.** `work_items.assignee_id` references `profiles`, and `profiles` rows persist even after someone leaves a workspace (they might still be a member elsewhere). Removing a member from `workspace_memberships` had no foreign-key cascade to work items in *that* workspace — so a departed member's open tasks kept silently pointing at someone who could no longer be resolved as "a member of this workspace," an inconsistency nothing would ever clean up on its own.

**Fix, part one.** A new `private.membership_after_delete` trigger fires on `workspace_memberships` delete: it clears `assignee_id` on that person's work items in that same workspace and touches nothing else — not the title, not the status, not the comments or activity history, not other members' assignments. The work item survives; only the invalid assignee pointer is removed.

**Problem, part two.** While looking at that path, a second issue surfaced in the task detail sheet: if `updateItem()` failed partway through a save (a dropped connection, a transient server error), the component could be left showing "Saving…" indefinitely, with an edited title on screen that was never actually persisted — no error, no way to tell the save had failed.

**Fix, part two.** `item-detail.tsx`'s `save()` now catches transport/runtime errors from `updateItem()`, always resets the saving state in a `finally`, surfaces an error to the user, and reverts the title field to its last known server value instead of leaving an unconfirmed edit on screen.

**Result.** `e2e/membership-assignee-cleanup.spec.ts` removes a member with an open, assigned work item and asserts the item survives with `assignee_id` cleared and its history intact. `e2e/item-save-error-handling.spec.ts` simulates a failed `fetch` mid-save and asserts the UI recovers to a consistent, truthful state instead of hanging.
