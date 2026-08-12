#!/usr/bin/env node
// Orbit — demo seed
//
// Creates (or reuses) a deterministic demo user with a team, workspace, and
// board set up exactly like the app's onboarding flow, then fills the board's
// default columns (Backlog / Todo / In Progress / Done) with ~18 sample tasks.
//
// RLS is respected throughout: the Auth admin API is used ONLY to provision
// the demo user's credentials (no data rows), and every data insert — team,
// workspace, board, columns-trigger, tasks — goes through an authenticated
// session client, exactly like the app's server actions. No service-role
// inserts on tenant tables.
//
// Safe to re-run:
//   - The demo user, team (by name), workspace (by slug), and board (by name)
//     are looked up first and reused if they already exist.
//   - Tasks on the demo board are DELETED and re-seeded. Only that board is
//     touched; no other team's data is modified.
//
// Usage: node scripts/seed-demo.mjs   (reads .env.local if present)
import { createClient } from "@supabase/supabase-js"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

function loadEnvFile() {
  const path = join(ROOT, ".env.local")
  if (!existsSync(path)) return
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    const [, key, raw] = m
    let value = raw.trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}
loadEnvFile()

const env = {
  url:
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    "http://127.0.0.1:54321",
  anon: process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  service: process.env.SUPABASE_SERVICE_ROLE_KEY,
  app: process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000",
}

if (!env.anon || !env.service) {
  console.error(
    "Missing Supabase keys. Set NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
  )
  process.exit(1)
}

const DEMO = {
  email: "demo@orbit.test",
  password: "OrbitDemo123!",
  fullName: "Orbit Demo",
  teamName: "Orbit Demo Team",
  teamSlug: "orbit-demo-team",
  workspaceName: "Orbit Workspace",
  workspaceSlug: "orbit-workspace",
  boardName: "Orbit Board",
}

function section(name) {
  console.log(`\n=== ${name} ===`)
}

async function main() {
  const admin = createClient(env.url, env.service, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const anon = createClient(env.url, env.anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  section("1. Demo user")
  let user
  const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  user = listed?.users?.find((u) => u.email === DEMO.email) ?? null
  if (user) {
    console.log(`  Reusing existing user ${DEMO.email}`)
    // Reset credentials so sign-in is deterministic across re-runs.
    const upd = await admin.auth.admin.updateUserById(user.id, {
      password: DEMO.password,
      email_confirm: true,
      user_metadata: { full_name: DEMO.fullName },
    })
    if (upd.error) throw new Error(`reset password: ${upd.error.message}`)
    user = upd.data.user
  } else {
    const created = await admin.auth.admin.createUser({
      email: DEMO.email,
      password: DEMO.password,
      email_confirm: true,
      user_metadata: { full_name: DEMO.fullName },
    })
    if (created.error) throw new Error(`create user: ${created.error.message}`)
    user = created.data.user
    console.log(`  Created user ${DEMO.email} (${user.id})`)
  }

  section("2. Authenticated session (RLS-respecting client)")
  const { data: signin, error: signinError } = await anon.auth.signInWithPassword({
    email: DEMO.email,
    password: DEMO.password,
  })
  if (signinError) throw new Error(`sign in: ${signinError.message}`)
  console.log(`  Signed in as ${DEMO.email}`)
  const demoUserId = signin.user.id

  section("3. Team (onboarding flow)")
  let team
  {
    const { data } = await anon
      .from("teams")
      .select("id, name, slug")
      .eq("name", DEMO.teamName)
      .limit(1)
      .maybeSingle()
    team = data ?? null
  }
  if (!team) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const suffix = attempt === 0 ? "" : `-${Math.random().toString(36).slice(2, 6)}`
      const { data, error } = await anon
        .from("teams")
        .insert({ name: DEMO.teamName, slug: `${DEMO.teamSlug}${suffix}` })
        .select("id, name, slug")
        .single()
      if (!error) {
        team = data
        break
      }
      if (error.code !== "23505") throw new Error(`create team: ${error.message}`)
    }
    if (!team) throw new Error("create team: slug conflicts exhausted")
    console.log(`  Created team "${team.name}" (${team.id})`)
  } else {
    console.log(`  Reusing team "${team.name}" (${team.id})`)
  }

  section("4. Workspace")
  let workspace
  {
    const { data } = await anon
      .from("workspaces")
      .select("id, name, slug")
      .eq("team_id", team.id)
      .eq("slug", DEMO.workspaceSlug)
      .maybeSingle()
    workspace = data ?? null
  }
  if (!workspace) {
    const { data, error } = await anon
      .from("workspaces")
      .insert({ team_id: team.id, name: DEMO.workspaceName, slug: DEMO.workspaceSlug })
      .select("id, name, slug")
      .single()
    if (error) throw new Error(`create workspace: ${error.message}`)
    workspace = data
    console.log(`  Created workspace "${workspace.name}" (${workspace.id})`)
  } else {
    console.log(`  Reusing workspace "${workspace.name}" (${workspace.id})`)
  }

  section("5. Board (default columns auto-seed via trigger)")
  let board
  {
    const { data } = await anon
      .from("boards")
      .select("id, name")
      .eq("workspace_id", workspace.id)
      .eq("name", DEMO.boardName)
      .maybeSingle()
    board = data ?? null
  }
  if (!board) {
    const { data, error } = await anon
      .from("boards")
      .insert({ workspace_id: workspace.id, name: DEMO.boardName })
      .select("id, name")
      .single()
    if (error) throw new Error(`create board: ${error.message}`)
    board = data
    console.log(`  Created board "${board.name}" (${board.id})`)
  } else {
    console.log(`  Reusing board "${board.name}" (${board.id})`)
  }

  const { data: columns, error: columnsError } = await anon
    .from("columns")
    .select("id, name, position")
    .eq("board_id", board.id)
    .order("position", { ascending: true })
  if (columnsError) throw new Error(`load columns: ${columnsError.message}`)
  if (!columns?.length) throw new Error("board has no columns")
  const columnByName = Object.fromEntries(columns.map((c) => [c.name, c]))
  for (const name of ["Backlog", "Todo", "In Progress", "Done"]) {
    if (!columnByName[name]) throw new Error(`default column "${name}" missing`)
  }
  console.log(`  Columns: ${columns.map((c) => c.name).join(" / ")}`)

  section("6. Sample tasks (destructive: re-seeds this board only)")
  const { data: existing, error: existingError } = await anon
    .from("tasks")
    .select("id")
    .eq("board_id", board.id)
  if (existingError) throw new Error(`count tasks: ${existingError.message}`)
  if (existing?.length) {
    console.log(
      `  WARNING: deleting ${existing.length} existing task(s) on board "${board.name}" to re-seed.`,
    )
    const del = await anon.from("tasks").delete().eq("board_id", board.id)
    if (del.error) throw new Error(`delete tasks: ${del.error.message}`)
  }

  const TASKS = [
    { column: "Backlog", position: 1, title: "Research competitor onboarding flows", description: "Linear, Notion, Asana — map their first-run experiences before M6.", priority: "medium", assigned: false },
    { column: "Backlog", position: 2, title: "Draft PRD for M7 billing tiers", description: "Lite vs Pro limits: seats, boards, and AI usage caps.", priority: "high", assigned: true },
    { column: "Backlog", position: 3, title: "Evaluate task-description AI prompts", description: null, priority: "low", assigned: false },
    { column: "Backlog", position: 4, title: "Collect drag-and-drop feedback", description: "Ask the beta group about reorder accuracy and keyboard fallbacks.", priority: "medium", assigned: true },

    { column: "Todo", position: 1, title: "Persist theme choice", description: "Store the light/dark preference so it survives reloads.", priority: "medium", assigned: false },
    { column: "Todo", position: 2, title: "Empty states for boards", description: null, priority: "low", assigned: false },
    { column: "Todo", position: 3, title: "Keyboard shortcuts for board navigation", description: "g then b to jump to boards, ? for the shortcut palette.", priority: "high", assigned: true },
    { column: "Todo", position: 4, title: "Fix sidebar collapse flicker", description: null, priority: "medium", assigned: false },
    { column: "Todo", position: 5, title: "Migrate remaining dialogs to shadcn", description: "Ensure consistent styling and focus trapping across all modals.", priority: "medium", assigned: true },

    { column: "In Progress", position: 1, title: "Drag-and-drop between columns", description: "dnd-kit move across lanes with midpoint positioning.", priority: "urgent", assigned: true },
    { column: "In Progress", position: 2, title: "Supabase Realtime board subscription", description: "Live task updates across open clients on the same board.", priority: "high", assigned: true },
    { column: "In Progress", position: 3, title: "Task edit dialog", description: "Title, description, priority, and assignee in one modal.", priority: "high", assigned: false },
    { column: "In Progress", position: 4, title: "Midpoint reindex fallback", description: null, priority: "high", assigned: true },
    { column: "In Progress", position: 5, title: "Keyboard-accessible DnD fallback", description: "Move tasks with arrow keys and Enter/Space when a pointer is unavailable.", priority: "medium", assigned: false },

    { column: "Done", position: 1, title: "Project scaffold on Next.js 16", description: "App Router, proxy.ts guards, shadcn on Tailwind v4.", priority: "high", assigned: true },
    { column: "Done", position: 2, title: "Supabase local + RLS", description: null, priority: "high", assigned: false },
    { column: "Done", position: 3, title: "Team creation onboarding flow", description: "Signup lands the user in a team with owner membership.", priority: "medium", assigned: true },
    { column: "Done", position: 4, title: "Workspace picker in sidebar", description: null, priority: "medium", assigned: false },
  ]

  let inserted = 0
  for (const t of TASKS) {
    const col = columnByName[t.column]
    const { error } = await anon.from("tasks").insert({
      board_id: board.id,
      column_id: col.id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      position: t.position,
      assignee_id: t.assigned ? demoUserId : null,
    })
    if (error) throw new Error(`insert task "${t.title}": ${error.message}`)
    inserted += 1
  }
  console.log(`  Inserted ${inserted} tasks across ${columns.length} columns.`)

  section("Done")
  console.log(`  Board:    ${env.app}/app/boards/${board.id}`)
  console.log(`  Email:    ${DEMO.email}`)
  console.log(`  Password: ${DEMO.password}`)
}

main().catch((e) => {
  console.error(`\nSeed failed: ${e.message}`)
  process.exit(1)
})
