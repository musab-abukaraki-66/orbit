#!/usr/bin/env node
// M4 verification: workspaces & boards — data layer, RLS isolation, HTTP smoke.
// Usage: node scripts/verify-m4.mjs   (requires `npm run build && npm run start` + local Supabase)
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
    console.log(`  FAIL  ${name} ${detail ? "-- " + JSON.stringify(detail).slice(0, 400) : ""}`)
  }
}
function section(name) {
  console.log(`\n=== ${name} ===`)
}

function makeSessionClient(email) {
  const cookieStore = new Map()
  const client = createServerClient(env.url, env.anon, {
    cookies: {
      getAll: () => [...cookieStore.entries()].map(([name, value]) => ({ name, value })),
      setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value }) => cookieStore.set(name, value)),
    },
  })
  return {
    client,
    cookieHeader: () => [...cookieStore.entries()].map(([n, v]) => `${n}=${v}`).join("; "),
  }
}

async function signUpUser(tag) {
  const email = `m4-${tag}-${randomUUID().slice(0, 8)}@test.local`
  const { data, error } = await adminClient.auth.signUp({
    email,
    password: "TestPass123!",
    options: { data: { full_name: `Test ${tag}` } },
  })
  if (error || !data?.user) throw new Error(`signUp ${tag}: ${error?.message}`)
  return { email, user: data.user }
}

async function createTeam(client, tag) {
  const { data, error } = await client
    .from("teams")
    .insert({ name: `Team ${tag} ${randomUUID().slice(0, 6)}`, slug: `team-${tag}-${randomUUID().slice(0, 8)}` })
    .select("id, name")
    .single()
  if (error) throw new Error(`createTeam ${tag}: ${error.message}`)
  return data
}

async function getSessionCookie(email) {
  const s = makeSessionClient(email)
  const { error } = await s.client.auth.signInWithPassword({ email, password: "TestPass123!" })
  if (error) throw new Error(`signIn ${email}: ${error.message}`)
  return s.cookieHeader()
}

async function httpGet(path, cookie) {
  const headers = {}
  if (cookie) headers.cookie = cookie
  const res = await fetch(env.app + path, { headers, redirect: "manual" })
  return res
}

try {
  section("SETUP users + teams")
  const uA = await signUpUser("a")
  const uB = await signUpUser("b")

  const ca = createClient(env.url, env.anon, { auth: { autoRefreshToken: false, persistSession: false } })
  const cb = createClient(env.url, env.anon, { auth: { autoRefreshToken: false, persistSession: false } })
  await ca.auth.signInWithPassword({ email: uA.email, password: "TestPass123!" })
  await cb.auth.signInWithPassword({ email: uB.email, password: "TestPass123!" })

  const teamA = await createTeam(ca, "A")
  const teamB = await createTeam(cb, "B")
  check("user A has team", !!teamA?.id)
  check("user B has team", !!teamB?.id)

  section("WORKSPACE create/list (via RLS-aware client)")
  const wsA = await ca
    .from("workspaces")
    .insert({ team_id: teamA.id, name: "Engineering", slug: "engineering" })
    .select("id, name")
    .single()
  check("A creates workspace", !wsA.error && wsA.data?.id, wsA.error)

  const wsA2 = await ca
    .from("workspaces")
    .insert({ team_id: teamA.id, name: "Design", slug: "design" })
    .select("id, name")
    .single()
  check("A creates second workspace", !wsA2.error && wsA2.data?.id, wsA2.error)

  const { data: wsListA } = await ca
    .from("workspaces")
    .select("id, name")
    .eq("team_id", teamA.id)
  check("A lists 2 workspaces", wsListA?.length === 2, wsListA)

  section("BOARD create/list (within workspace)")
  const b1 = await ca
    .from("boards")
    .insert({ workspace_id: wsA.data.id, name: "Launch" })
    .select("id, name")
    .single()
  check("A creates board 'Launch'", !b1.error && b1.data?.id, b1.error)

  const b2 = await ca
    .from("boards")
    .insert({ workspace_id: wsA.data.id, name: "Bugfix" })
    .select("id, name")
    .single()
  check("A creates board 'Bugfix'", !b2.error && b2.data?.id, b2.error)

  const { data: bList } = await ca
    .from("boards")
    .select("id, name")
    .eq("workspace_id", wsA.data.id)
    .order("created_at", { ascending: true })
  check("A lists 2 boards in workspace", bList?.length === 2, bList)

  section("BOARD rename/delete")
  const rn = await ca.from("boards").update({ name: "Launch v2" }).eq("id", b1.data.id).select("name").single()
  check("A renames board", !rn.error && rn.data?.name === "Launch v2", rn.error)

  const del = await ca.from("boards").delete().eq("id", b2.data.id).select("id")
  check("A deletes board (row removed)", !del.error && del.data?.length === 1 && del.data[0].id === b2.data.id, { err: del.error, data: del.data })
  const { data: afterDel } = await ca.from("boards").select("id").eq("id", b2.data.id)
  check("A: deleted board no longer visible to A", afterDel?.length === 0, afterDel)

  section("CROSS-TENANT ISOLATION (B tries to touch A's data)")
  const { data: bSees } = await cb.from("boards").select("id").eq("id", b1.data.id)
  check("B cannot SELECT A's board", bSees?.length === 0, bSees)

  const { data: wsSees } = await cb.from("workspaces").select("id").eq("id", wsA.data.id)
  check("B cannot SELECT A's workspace", wsSees?.length === 0, wsSees)

  const { data: teamSees } = await cb.from("teams").select("id").eq("id", teamA.id)
  check("B cannot SELECT A's team", teamSees?.length === 0, teamSees)

  const ins = await cb.from("boards").insert({ workspace_id: wsA.data.id, name: "Intrude" }).select("id")
  check("B cannot INSERT into A's workspace", ins.error !== null, { err: ins.error?.message, data: ins.data })

  const upd = await cb.from("boards").update({ name: "Hijack" }).eq("id", b1.data.id).select("id")
  check("B cannot UPDATE A's board (0 rows affected)", !upd.error && upd.data?.length === 0, { err: upd.error?.message, data: upd.data })

  const delX = await cb.from("boards").delete().eq("id", b1.data.id).select("id")
  check("B cannot DELETE A's board (0 rows affected)", !delX.error && delX.data?.length === 0, { err: delX.error?.message, data: delX.data })

  const { data: verifyAfterAttack } = await ca.from("boards").select("id, name").eq("id", b1.data.id)
  check("A's board intact after B's update/delete attempts", verifyAfterAttack?.length === 1 && verifyAfterAttack[0].name === "Launch v2", verifyAfterAttack)

  section("COLUMN shell data model")
  const col = await ca
    .from("columns")
    .insert({ board_id: b1.data.id, name: "Backlog", position: 0 })
    .select("id, name, position")
    .single()
  check("A can add column to own board", !col.error && col.data?.name === "Backlog", col.error)

  section("HTTP UNAUTHENTICATED routes -> redirect to /login")
  for (const path of ["/app", "/app/boards", "/app/boards/unknown-board"]) {
    const res = await httpGet(path)
    check(`GET ${path} unauth => 307 /login`, res.status === 307 && res.headers.get("location")?.startsWith("/login"), { status: res.status, loc: res.headers.get("location") })
  }
  const loginRes = await httpGet("/login")
  check("GET /login unauth => 200", loginRes.status === 200, loginRes.status)
  const homeRes = await httpGet("/")
  check("GET / (landing) => 200", homeRes.status === 200, homeRes.status)

  section("HTTP AUTHENTICATED routes (real session cookie)")
  const cookieA = await getSessionCookie(uA.email)
  check("got real session cookie for A", cookieA.length > 10, cookieA.slice(0, 60))

  const appRes = await httpGet("/app", cookieA)
  check("GET /app (authenticated) => 200", appRes.status === 200, { status: appRes.status, loc: appRes.headers.get("location") })

  const boardsRes = await httpGet("/app/boards", cookieA)
  check("GET /app/boards (authenticated) => 200", boardsRes.status === 200, { status: boardsRes.status, loc: boardsRes.headers.get("location") })

  const boardPage = await httpGet(`/app/boards/${b1.data.id}`, cookieA)
  check("GET /app/boards/[boardId] (authenticated) => 200", boardPage.status === 200, { status: boardPage.status, loc: boardPage.headers.get("location") })

  const notFoundRes = await httpGet("/app/boards/00000000-0000-0000-0000-000000000000", cookieA)
  check("GET unknown board => 404", notFoundRes.status === 404, { status: notFoundRes.status })

  const notFoundBogus = await httpGet("/app/boards/not-a-real-id", cookieA)
  check("GET bogus board id handled (no 500)", notFoundBogus.status !== 500, { status: notFoundBogus.status })

  const onbRes = await httpGet("/onboarding", cookieA)
  check("GET /onboarding (authenticated) => 200 or redirect", [200, 307].includes(onbRes.status), { status: onbRes.status, loc: onbRes.headers.get("location") })

  const cookieB = await getSessionCookie(uB.email)
  const crossRes = await httpGet(`/app/boards/${b1.data.id}`, cookieB)
  check("B accessing A's board page => 404 (isolation)", crossRes.status === 404, { status: crossRes.status })

  section("ACTIVE WORKSPACE cookie round-trip")
  const wsCookie = `${cookieA}; orbit_active_workspace=${wsA2.data.id}`
  const appWithPref = await httpGet("/app", wsCookie)
  const html = await appWithPref.text()
  check("Active-workspace cookie respected in /app render", appWithPref.status === 200 && html.includes("Design"), { status: appWithPref.status, hasDesign: html.includes("Design") })
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
