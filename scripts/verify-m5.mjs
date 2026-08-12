#!/usr/bin/env node
// M5 verification: Kanban — default columns, task CRUD, ordering/status
// persistence, Supabase Realtime, RLS isolation, and HTTP smoke tests.
// Usage: node scripts/verify-m5.mjs  (requires `npm run build && npm run start` + local Supabase)
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { randomUUID } from "node:crypto"

const env = {
  url: process.env.SUPABASE_URL ?? "http://127.0.0.1:54321",
  anon: process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  service: process.env.SUPABASE_SERVICE_ROLE_KEY,
  app: process.env.APP_URL ?? "http://127.0.0.1:3111",
}

if (!env.anon || !env.service) {
  console.error("Missing SUPABASE env vars (anon key + service role key).")
  process.exit(1)
}

const adminClient = createClient(env.url, env.service, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEFAULT_COLUMNS = [
  { name: "Backlog", position: 0 },
  { name: "Todo", position: 1 },
  { name: "In Progress", position: 2 },
  { name: "Done", position: 3 },
]

let passed = 0
let failed = 0
const failures = []

function check(name, cond, detail) {
  if (cond) {
    passed++
    console.log(`  PASS  ${name}`)
  } else {
    failed++
    failures.push({ name, detail })
    console.log(
      `  FAIL  ${name} ${detail ? "-- " + JSON.stringify(detail).slice(0, 400) : ""}`,
    )
  }
}
function section(name) {
  console.log(`\n=== ${name} ===`)
}

function makeSessionClient(_email) {
  const cookieStore = new Map()
  const client = createServerClient(env.url, env.anon, {
    cookies: {
      getAll: () =>
        [...cookieStore.entries()].map(([name, value]) => ({ name, value })),
      setAll: (cookiesToSet) =>
        cookiesToSet.forEach(({ name, value }) => cookieStore.set(name, value)),
    },
  })
  return {
    client,
    cookieHeader: () =>
      [...cookieStore.entries()].map(([n, v]) => `${n}=${v}`).join("; "),
  }
}

async function signUpUser(tag) {
  const email = `m5-${tag}-${randomUUID().slice(0, 8)}@test.local`
  const { data, error } = await adminClient.auth.signUp({
    email,
    password: "TestPass123!",
    options: { data: { full_name: `Test ${tag} ${randomUUID().slice(0, 4)}` } },
  })
  if (error || !data?.user) throw new Error(`signUp ${tag}: ${error?.message}`)
  return { email, user: data.user }
}

async function httpGet(path, cookie) {
  const headers = {}
  if (cookie) headers.cookie = cookie
  const res = await fetch(env.app + path, { headers, redirect: "manual" })
  return res
}

try {
  section("SETUP users + team + workspace")
  const uA = await signUpUser("a")
  const uB = await signUpUser("b")

  const ca = createClient(env.url, env.anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const cb = createClient(env.url, env.anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  await ca.auth.signInWithPassword({ email: uA.email, password: "TestPass123!" })
  await cb.auth.signInWithPassword({ email: uB.email, password: "TestPass123!" })

  const teamA = await ca
    .from("teams")
    .insert({ name: "Team A", slug: `team-a-${randomUUID().slice(0, 8)}` })
    .select("id, name")
    .single()
  if (teamA.error) throw new Error("team A: " + teamA.error.message)

  const teamB = await cb
    .from("teams")
    .insert({ name: "Team B", slug: `team-b-${randomUUID().slice(0, 8)}` })
    .select("id, name")
    .single()
  if (teamB.error) throw new Error("team B: " + teamB.error.message)

  const wsA = await ca
    .from("workspaces")
    .insert({ team_id: teamA.data.id, name: "Engineering", slug: "eng" })
    .select("id, name")
    .single()
  if (wsA.error) throw new Error("workspace A: " + wsA.error.message)

  section("COLUMN MODEL: default lanes seeded per board")
  const board1 = await ca
    .from("boards")
    .insert({ workspace_id: wsA.data.id, name: "Launch" })
    .select("id, name")
    .single()
  if (board1.error) throw new Error("board: " + board1.error.message)
  const bId = board1.data.id

  const { data: cols1 } = await ca
    .from("columns")
    .select("id, name, position")
    .eq("board_id", bId)
    .order("position", { ascending: true })
  check("new board gets 4 default columns", cols1?.length === 4, cols1)
  check(
    "default columns in deterministic order",
    cols1?.map((c) => c.name).join("|") ===
      DEFAULT_COLUMNS.map((c) => c.name).join("|"),
    cols1?.map((c) => c.name),
  )
  check(
    "default columns have positions 0..3",
    cols1?.map((c) => c.position).join(",") === "0,1,2,3",
    cols1?.map((c) => c.position),
  )

  const board2 = await ca
    .from("boards")
    .insert({ workspace_id: wsA.data.id, name: "Bugfix" })
    .select("id, name")
    .single()
  const { data: cols2 } = await ca
    .from("columns")
    .select("id, name")
    .eq("board_id", board2.data.id)
    .order("position", { ascending: true })
  check(
    "every new board is seeded",
    cols2?.map((c) => c.name).join("|") ===
      DEFAULT_COLUMNS.map((c) => c.name).join("|"),
    cols2?.map((c) => c.name),
  )

  const todoCol = cols1.find((c) => c.name === "Todo")
  const doneCol = cols1.find((c) => c.name === "Done")
  const inProgressCol = cols1.find((c) => c.name === "In Progress")

  section("TASK CREATE")
  const { data: t1 } = await ca
    .from("tasks")
    .insert({
      board_id: bId,
      column_id: todoCol.id,
      title: "Build the kanban",
      description: "Drag between columns",
      priority: "high",
      position: 1,
    })
    .select(
      "id, column_id, title, priority, status, position, board_id, assignee_id",
    )
    .single()
  check("create task lands in column", !t1 && false ? null : t1?.column_id === todoCol.id, t1)
  check("create task appends at position 1", t1?.position === 1, t1?.position)
  check("create task derives status from column", t1?.status === "Todo", t1?.status)
  check("create task derives board_id", t1?.board_id === bId, t1?.board_id)

  const { data: t2 } = await ca
    .from("tasks")
    .insert({
      board_id: bId,
      column_id: todoCol.id,
      title: "Add drag and drop",
      priority: "medium",
      position: 2,
    })
    .select("id, position")
    .single()
  check("second task appends at position 2", t2?.position === 2, t2?.position)

  const { data: t3 } = await ca
    .from("tasks")
    .insert({
      board_id: bId,
      column_id: doneCol.id,
      title: "Ship it",
      priority: "urgent",
    })
    .select("id, position, status")
    .single()
  check("task in Done column derives status 'Done'", t3?.status === "Done", t3?.status)

  section("TASK LIST (deterministic ordering)")
  const { data: listTodo } = await ca
    .from("tasks")
    .select("id, title, position")
    .eq("column_id", todoCol.id)
    .order("position", { ascending: true })
  check(
    "tasks in column ordered by position",
    listTodo?.map((t) => t.title).join("|") ===
      "Build the kanban|Add drag and drop",
    listTodo?.map((t) => t.title),
  )

  section("TASK UPDATE")
  const upd = await ca
    .from("tasks")
    .update({ title: "Build the kanban v2", priority: "urgent", assignee_id: uA.user.id })
    .eq("id", t1.id)
    .select("title, priority, assignee_id, status, position, column_id")
    .single()
  check("task title updates", upd.data?.title === "Build the kanban v2", upd.data?.title)
  check("task priority updates", upd.data?.priority === "urgent", upd.data?.priority)
  check("task assignee updates", upd.data?.assignee_id === uA.user.id, upd.data?.assignee_id)
  check("task keeps column/position on field update", upd.data?.column_id === todoCol.id && upd.data?.position === 1, upd.data)

  section("PROFILES (assignee pool)")
  const { data: profilesA } = await ca
    .from("profiles")
    .select("id, full_name, email")
  check(
    "creator can see own profile",
    profilesA?.some((p) => p.id === uA.user.id && p.full_name),
    profilesA,
  )
  const { data: profilesB } = await cb
    .from("profiles")
    .select("id")
  check(
    "user B cannot see user A's profile (no shared team)",
    !profilesB?.some((p) => p.id === uA.user.id),
    profilesB?.map((p) => p.id),
  )

  section("TASK MOVE ACROSS COLUMNS (status + position + board)")
  const targetDone = await ca
    .from("tasks")
    .select("id, position")
    .eq("column_id", doneCol.id)
    .order("position", { ascending: true })
  const targetIndex = targetDone.data?.length ?? 0
  const moved = await ca
    .from("tasks")
    .update({ column_id: doneCol.id, position: targetIndex + 1 })
    .eq("id", t1.id)
    .select("id, column_id, status, position, board_id, title")
    .single()
  check("moving task updates column_id", moved.data?.column_id === doneCol.id, moved.data)
  check("moving task syncs status to new column", moved.data?.status === "Done", moved.data?.status)
  check("moving task preserves board_id", moved.data?.board_id === bId, moved.data?.board_id)

  const { data: doneList } = await ca
    .from("tasks")
    .select("id, title, position")
    .eq("column_id", doneCol.id)
    .order("position", { ascending: true })
  check(
    "target column ordering is monotonic after move",
    doneList.every((t, i, arr) => i === 0 || arr[i - 1].position < t.position),
    doneList,
  )

  section("TASK REORDER WITHIN COLUMN (order persists after refresh)")
  await ca
    .from("tasks")
    .update({ position: 0.5 })
    .eq("id", t3.id)
    .select("id, position")
    .single()
  const { data: recheck } = await ca
    .from("tasks")
    .select("id, title, position")
    .eq("column_id", doneCol.id)
    .order("position", { ascending: true })
  check(
    "reorder moves task to front",
    recheck?.[0]?.id === t3.id,
    recheck?.map((t) => [t.title, t.position]),
  )
  check(
    "reorder persists after refresh (re-query)",
    recheck?.[0]?.id === t3.id &&
      recheck.every((t, i, arr) => i === 0 || arr[i - 1].position < t.position),
    recheck?.map((t) => [t.title, t.position]),
  )

  section("TASK DELETE")
  const del = await ca.from("tasks").delete().eq("id", t2.id).select("id")
  check("task deletes", !del.error && del.data?.length === 1, del.error)
  const { data: afterDel } = await ca
    .from("tasks")
    .select("id")
    .eq("id", t2.id)
  check("deleted task no longer visible", afterDel?.length === 0, afterDel)

  section("CROSS-TENANT ISOLATION (B cannot touch A's tasks)")
  const { data: bSeesTask } = await cb
    .from("tasks")
    .select("id")
    .eq("id", t1.id)
  check("B cannot SELECT A's task", bSeesTask?.length === 0, bSeesTask)

  const { data: bSeesBoard } = await cb
    .from("boards")
    .select("id")
    .eq("id", bId)
  check("B cannot SELECT A's board", bSeesBoard?.length === 0, bSeesBoard)

  const ins = await cb
    .from("tasks")
    .insert({ board_id: bId, column_id: todoCol.id, title: "Intrusion" })
    .select("id")
  check("B cannot INSERT a task into A's board", ins.error !== null, {
    err: ins.error?.message,
    data: ins.data,
  })

  const updB = await cb
    .from("tasks")
    .update({ title: "Hijacked" })
    .eq("id", t1.id)
    .select("id")
  check("B cannot UPDATE A's task (0 rows affected)", !updB.error && updB.data?.length === 0, updB.data)

  const delB = await cb
    .from("tasks")
    .delete()
    .eq("id", t3.id)
    .select("id")
  check("B cannot DELETE A's task (0 rows affected)", !delB.error && delB.data?.length === 0, delB.data)

  const moveB = await cb
    .from("tasks")
    .update({ column_id: inProgressCol.id, position: 5 })
    .eq("id", t1.id)
    .select("id")
  check("B cannot MOVE A's task (0 rows affected)", !moveB.error && moveB.data?.length === 0, moveB.data)

  const { data: verifyIntact } = await ca
    .from("tasks")
    .select("id, column_id, title")
    .eq("id", t1.id)
    .single()
  check(
    "A's task intact after B's attempts",
    verifyIntact?.title === "Build the kanban v2" && verifyIntact?.column_id === doneCol.id,
    verifyIntact,
  )

  section("REALTIME: board-scoped task changes")
  const sessA = makeSessionClient(uA.email)
  await sessA.client.auth.signInWithPassword({ email: uA.email, password: "TestPass123!" })
  const sessB = makeSessionClient(uB.email)
  await sessB.client.auth.signInWithPassword({ email: uB.email, password: "TestPass123!" })

  const rtTitle = `Realtime task ${randomUUID().slice(0, 6)}`

  // Subscribe both clients, then drive writes through user A's authenticated
  // session (exactly like the app's server actions — never the service role).
  // Each write happens first; we then wait for the matching event.
  const evA = []
  const evB = []
  const chanA = await new Promise((resolve, reject) => {
    const ch = sessA.client
      .channel(`verify-board-a-${randomUUID().slice(0, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `board_id=eq.${bId}` },
        (p) => evA.push(p),
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") resolve(ch)
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
          reject(new Error(`sub A: ${status} ${err?.message ?? ""}`))
      })
  })
  const chanB = await new Promise((resolve, reject) => {
    const ch = sessB.client
      .channel(`verify-board-b-${randomUUID().slice(0, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `board_id=eq.${bId}` },
        (p) => evB.push(p),
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") resolve(ch)
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
          reject(new Error(`sub B: ${status} ${err?.message ?? ""}`))
      })
  })

  const waitFor = (arr, predicate, timeoutMs = 6000) =>
    new Promise((resolve) => {
      const started = Date.now()
      const poll = setInterval(() => {
        const hit = arr.find(predicate)
        if (hit) {
          clearInterval(poll)
          resolve(hit)
        } else if (Date.now() - started > timeoutMs) {
          clearInterval(poll)
          resolve(null)
        }
      }, 150)
    })

  // Prime the Realtime pipeline. After `supabase db reset` (or a Realtime
  // container restart) the server acks SUBSCRIBED as soon as the channel
  // registers, but its WAL replication slot takes up to ~20-30s to catch up,
  // so the very FIRST events after restart are dropped while later events
  // flow instantly. Insert a throwaway probe task and require its INSERT +
  // DELETE to arrive, retrying briefly, before the timed assertions below run
  // on a warm pipeline. A genuine outage still fails fast with a clear message.
  let pipelineWarm = false
  for (let attempt = 1; attempt <= 5 && !pipelineWarm; attempt++) {
    const probeTitle = `Realtime probe ${attempt} ${randomUUID().slice(0, 6)}`
    const probe = await ca
      .from("tasks")
      .insert({ board_id: bId, column_id: todoCol.id, title: probeTitle })
      .select("id, title")
      .single()
    if (probe.error) throw new Error("realtime probe insert: " + probe.error.message)

    const probeInsert = await waitFor(
      evA,
      (p) => p.eventType === "INSERT" && p.new?.id === probe.data.id,
      10000,
    )
    if (!probeInsert) {
      await ca.from("tasks").delete().eq("id", probe.data.id).then(() => {})
      continue
    }
    await ca.from("tasks").delete().eq("id", probe.data.id)
    const probeDelete = await waitFor(
      evA,
      (p) => p.eventType === "DELETE" && p.old?.id === probe.data.id,
      10000,
    )
    if (!probeDelete) continue
    pipelineWarm = true
  }
  if (!pipelineWarm) {
    throw new Error(
      "realtime probe: no INSERT/DELETE delivered across 5 attempts (~50s) - Realtime pipeline not delivering",
    )
  }

  const rtInsert = await ca
    .from("tasks")
    .insert({ board_id: bId, column_id: todoCol.id, title: rtTitle, priority: "low" })
    .select("id, title")
    .single()
  if (rtInsert.error) throw new Error("realtime insert: " + rtInsert.error.message)
  const gotInsert = await waitFor(evA, (p) => p.eventType === "INSERT" && p.new?.title === rtTitle)
  check("A receives Realtime INSERT for own board", !!gotInsert, gotInsert?.new)

  await ca.from("tasks").update({ priority: "urgent" }).eq("id", rtInsert.data.id)
  const gotUpdate = await waitFor(
    evA,
    (p) => p.eventType === "UPDATE" && p.new?.id === rtInsert.data.id && p.new?.priority === "urgent",
  )
  check("A receives Realtime UPDATE", !!gotUpdate, gotUpdate?.new)

  await ca.from("tasks").delete().eq("id", rtInsert.data.id)
  const gotDelete = await waitFor(evA, (p) => p.eventType === "DELETE" && p.old?.id === rtInsert.data.id)
  check("A receives Realtime DELETE", !!gotDelete, gotDelete?.old)

  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Supabase Realtime documented behavior: INSERT/UPDATE events are gated by
  // RLS (B must see none of A's), but DELETE events are broadcast to all
  // subscribers of the table with ONLY the primary key when RLS is on
  // ("Delete events are not filterable"). The app is safe because the Kanban
  // client only removes a card whose id already exists in its local state.
  check(
    "B receives NO INSERT/UPDATE Realtime events for A's board (RLS)",
    evB.every((p) => p.eventType === "DELETE"),
    evB.map((p) => `${p.eventType}:${p.new?.title ?? p.old?.id}`),
  )
  check(
    "Any DELETE event B sees carries only the primary key (no data leak)",
    evB.every(
      (p) => p.eventType !== "DELETE" || (p.old && Object.keys(p.old).length === 1 && p.old.id),
    ),
    evB.map((p) => p.old),
  )

  await sessA.client.removeChannel(chanA)
  await sessB.client.removeChannel(chanB)

  section("HTTP UNAUTHENTICATED")
  for (const path of ["/app", "/app/boards", `/app/boards/${bId}`]) {
    const res = await httpGet(path)
    check(
      `GET ${path} unauth => 307 /login`,
      res.status === 307 && res.headers.get("location")?.startsWith("/login"),
      { status: res.status, loc: res.headers.get("location") },
    )
  }
  const homeRes = await httpGet("/")
  check("GET / (landing) => 200", homeRes.status === 200, homeRes.status)

  section("HTTP AUTHENTICATED (board page renders columns + tasks)")
  const cookieA = sessA.cookieHeader()
  const boardPage = await httpGet(`/app/boards/${bId}`, cookieA)
  check("GET board page (authenticated) => 200", boardPage.status === 200, {
    status: boardPage.status,
    loc: boardPage.headers.get("location"),
  })
  const html = await boardPage.text()
  check("board page renders default columns (SSR)", ["Backlog", "Todo", "In Progress", "Done"].every((n) => html.includes(n)), "missing column name in html")
  check("board page renders tasks (SSR)", html.includes("Build the kanban v2"), "task title missing")

  const cookieB = sessB.cookieHeader()
  const crossPage = await httpGet(`/app/boards/${bId}`, cookieB)
  check("B accessing A's board page => 404", crossPage.status === 404, {
    status: crossPage.status,
    loc: crossPage.headers.get("location"),
  })

  const unknown = await httpGet("/app/boards/00000000-0000-0000-0000-000000000000", cookieA)
  check("unknown board => 404", unknown.status === 404, { status: unknown.status })
} catch (e) {
  failed++
  failures.push({ name: "harness", detail: e.message })
}

console.log(`\n======== SUMMARY ========`)
console.log(`PASSED: ${passed}`)
console.log(`FAILED: ${failed}`)
if (failures.length) {
  console.log("Failures:")
  for (const f of failures) console.log("  -", f.name, JSON.stringify(f.detail)?.slice(0, 400))
}
process.exit(failed ? 1 : 0)
