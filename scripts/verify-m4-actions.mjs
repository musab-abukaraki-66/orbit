#!/usr/bin/env node
// M4 verification: workspace & board server actions driven through Next.js's
// Server Action protocol (Next-Action header + React Flight encodeReply body).
// Usage: node scripts/verify-m4-actions.mjs
// NOTE: action IDs are hashes from the current production build; re-derive them
// if `npm run build` changes (grep client chunks for createServerReference).
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

const ADMIN = createClient(env.url, env.service, { auth: { autoRefreshToken: false, persistSession: false } })
const encodeReply = (await import("next/dist/compiled/react-server-dom-webpack/client.node.js")).encodeReply

let passed = 0
let failed = 0
const failures = []
const check = (name, cond, detail) => {
  if (cond) { passed++; console.log(`  PASS  ${name}`) }
  else { failed++; failures.push({ name, detail }); console.log(`  FAIL  ${name} -- ${JSON.stringify(detail)?.slice(0, 300)}`) }
}
const section = (s) => console.log(`\n=== ${s} ===`)

function makeSessionClient(email, password) {
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

const ACTION = {
  createBoard: "7068ddc0f3295cf6e5f0506baad6dfa702296f9286",
  createWorkspace: "60477907c85e4d699870cc25081474c53e1fbfd955",
  switchWorkspace: "4075f157fc0872a52a2069c6afb2528ae3a87103ca",
  deleteWorkspace: "40acbb4854b231cb365821b974a0e64e479185ef70",
  renameWorkspace: "706038a1644259a6b3ac1cfe5801c6185098083f1d",
  deleteBoard: "4000a95724faa46bfd51329aaaa98e8371f4428d86",
  renameBoard: "709111b6580f2a11c5d719eb2e8e0262384b2693bf",
}

async function postAction(path, actionId, cookie, args) {
  const body = await encodeReply(args)
  const res = await fetch(env.app + path, {
    method: "POST",
    headers: {
      "Next-Action": actionId,
      cookie: cookie,
      origin: env.app,
      accept: "text/x-component",
    },
    body,
    redirect: "manual",
  })
  const text = await res.text()
  return { status: res.status, text, setCookies: res.headers.getSetCookie?.() ?? [] }
}

async function main() {
  const email = `sa-${randomUUID().slice(0, 8)}@test.local`
  const { data: su, error: suErr } = await ADMIN.auth.signUp({
    email, password: "TestPass123!", options: { data: { full_name: "SA Test" } },
  })
  if (suErr) throw new Error("signup: " + suErr.message)

  const pw = createClient(env.url, env.anon, { auth: { autoRefreshToken: false, persistSession: false } })
  await pw.auth.signInWithPassword({ email, password: "TestPass123!" })
  const team = await pw.from("teams").insert({ name: "SA Team", slug: `sa-${randomUUID().slice(0, 8)}` }).select("id").single()
  if (team.error) throw new Error("team: " + team.error.message)

  const sess = makeSessionClient(email, "TestPass123!")
  const { error: siErr } = await sess.client.auth.signInWithPassword({ email, password: "TestPass123!" })
  if (siErr) throw new Error("session signin: " + siErr.message)
  const cookie = sess.cookieHeader()

  section("SERVER ACTION: createWorkspace")
  const wsName = "SA Workspace " + randomUUID().slice(0, 6)
  const fd = new FormData()
  fd.append("name", wsName)
  const r1 = await postAction("/app", ACTION.createWorkspace, cookie, [undefined, fd])
  check("createWorkspace responds (no 500)", r1.status !== 500, { status: r1.status, body: r1.text.slice(0, 200) })
  const { data: wsList } = await pw.from("workspaces").select("id, name").eq("team_id", team.data.id)
  const createdWs = wsList?.find((w) => w.name === wsName)
  check("workspace row created via server action", !!createdWs?.id, wsList)

  section("SERVER ACTION: switchWorkspace")
  const r2 = await postAction("/app", ACTION.switchWorkspace, cookie, [createdWs.id])
  check("switchWorkspace responds (no 500)", r2.status !== 500, { status: r2.status, body: r2.text.slice(0, 150) })
  const activeCookie = r2.setCookies.find((c) => c.includes("orbit_active_workspace"))
  check("switchWorkspace sets orbit_active_workspace cookie", !!activeCookie && activeCookie.includes(createdWs.id), activeCookie)

  section("SERVER ACTION: createBoard")
  const boardName = "SA Board " + randomUUID().slice(0, 6)
  const fdb = new FormData()
  fdb.append("name", boardName)
  const r3 = await postAction("/app", ACTION.createBoard, cookie, [createdWs.id, undefined, fdb])
  check("createBoard responds (no 500)", r3.status !== 500, { status: r3.status, body: r3.text.slice(0, 150) })
  const { data: boardList } = await pw.from("boards").select("id, name").eq("workspace_id", createdWs.id)
  const createdBoard = boardList?.find((b) => b.name === boardName)
  check("board row created via server action", !!createdBoard?.id, boardList)

  section("SERVER ACTION: renameBoard")
  const newBoardName = boardName + " v2"
  const fdr = new FormData()
  fdr.append("name", newBoardName)
  const r4 = await postAction("/app/boards/" + createdBoard.id, ACTION.renameBoard, cookie, [createdBoard.id, undefined, fdr])
  check("renameBoard responds (no 500)", r4.status !== 500, { status: r4.status, body: r4.text.slice(0, 150) })
  const { data: renamedBoard } = await pw.from("boards").select("name").eq("id", createdBoard.id).single()
  check("board renamed via server action", renamedBoard?.name === newBoardName, renamedBoard)

  section("SERVER ACTION: deleteBoard")
  const r5 = await postAction("/app/boards/" + createdBoard.id, ACTION.deleteBoard, cookie, [createdBoard.id])
  check("deleteBoard responds (no 500)", r5.status !== 500, { status: r5.status, body: r5.text.slice(0, 150) })
  const { data: afterDel } = await pw.from("boards").select("id").eq("id", createdBoard.id)
  check("board deleted via server action", afterDel?.length === 0, afterDel)

  section("SERVER ACTION: renameWorkspace")
  const newWsName = wsName + " (renamed)"
  const fdw = new FormData()
  fdw.append("name", newWsName)
  const r6 = await postAction("/app", ACTION.renameWorkspace, cookie, [createdWs.id, undefined, fdw])
  check("renameWorkspace responds (no 500)", r6.status !== 500, { status: r6.status, body: r6.text.slice(0, 150) })
  const { data: renamedWs } = await pw.from("workspaces").select("name").eq("id", createdWs.id).single()
  check("workspace renamed via server action", renamedWs?.name === newWsName, renamedWs)

  section("SERVER ACTION: deleteWorkspace")
  const r7 = await postAction("/app", ACTION.deleteWorkspace, cookie, [createdWs.id])
  check("deleteWorkspace responds (no 500)", r7.status !== 500, { status: r7.status, body: r7.text.slice(0, 150) })
  const { data: afterWsDel } = await pw.from("workspaces").select("id").eq("id", createdWs.id)
  check("workspace deleted via server action", afterWsDel?.length === 0, afterWsDel)

  console.log(`\n======== SUMMARY ========`)
  console.log(`PASSED: ${passed}`)
  console.log(`FAILED: ${failed}`)
  if (failures.length) for (const f of failures) console.log("  -", f.name, JSON.stringify(f.detail)?.slice(0, 300))
  process.exit(failed ? 1 : 0)
}

main().catch((e) => {
  console.error("FATAL:", e)
  process.exit(1)
})