import { mkdirSync } from "node:fs"
import { expect, test, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test"

// End-to-end walk through Orbit v2: signup → workspace → projects → board →
// task detail → invitation link → second user joins → realtime across two
// browsers. Re-runnable: signup falls back to login and creates are skipped
// when the entity already exists.

const EMAIL = process.env.E2E_TEST_EMAIL ?? "orbit.demo.local@example.com"
const FRIEND_EMAIL = process.env.E2E_FRIEND_EMAIL ?? "orbit.friend.local@example.com"
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? ""
const WORKSPACE = "Acme Digital"
const PROJECT = "Website Redesign"
const SHOTS = "e2e/screenshots"
mkdirSync(SHOTS, { recursive: true })

const findings: string[] = []
const note = (m: string) => {
  findings.push(m)
  console.log(`[finding] ${m}`)
}

test.describe.configure({ mode: "serial" })

let page: Page
let slug = ""
let projectSlug = ""

async function shot(p: Page, name: string) {
  await p.screenshot({ path: `${SHOTS}/${name}.png` })
}

async function signIn(p: Page, email: string, fullName: string) {
  await p.goto("/signup")
  await p.getByLabel("Full name").fill(fullName)
  await p.getByLabel("Email").fill(email)
  await p.getByLabel("Password").fill(PASSWORD)
  await p.getByRole("button", { name: "Create account" }).click()
  const alert = p.locator("form").getByRole("alert")
  await Promise.race([p.waitForURL(/\/(onboarding|app|w\/|invite)/, { timeout: 20_000 }), alert.waitFor({ timeout: 20_000 })])
  if (await alert.isVisible().catch(() => false)) {
    const text = (await alert.textContent()) ?? ""
    if (!/already|exists/i.test(text)) throw new Error(`Signup failed: ${text}`)
    const next = new URL(p.url()).searchParams.get("next")
    await p.goto(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`)
    await p.getByLabel("Email").fill(email)
    await p.getByLabel("Password").fill(PASSWORD)
    await p.getByRole("button", { name: "Sign in" }).click()
    await p.waitForURL(/\/(onboarding|app|w\/|invite)/)
  }
}

function column(p: Page, name: string): Locator {
  return p.locator("div.w-64", { has: p.getByRole("heading", { name, exact: true }) })
}

async function laneOf(p: Page, title: string, lanes: string[]): Promise<string> {
  for (const lane of lanes) if (await column(p, lane).getByText(title, { exact: true }).count()) return lane
  throw new Error(`card "${title}" not found in ${lanes.join(", ")}`)
}

// Pointer drag between lanes. Re-targets the destination lane a few times so
// dnd-kit's horizontal autoscroll cannot shift it out from under the pointer.
async function dragToLane(p: Page, title: string, fromLane: string, toLane: string) {
  const source = column(p, fromLane).getByText(title, { exact: true })
  await source.scrollIntoViewIfNeeded()
  const from = await source.boundingBox()
  if (!from) throw new Error("drag geometry")
  await p.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await p.mouse.down()
  await p.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2, { steps: 5 })
  for (let i = 0; i < 3; i++) {
    const target = await column(p, toLane).boundingBox()
    if (!target) throw new Error("drag geometry")
    await p.mouse.move(target.x + target.width / 2, target.y + Math.min(target.height / 2, 160), { steps: i === 0 ? 20 : 5 })
    await p.waitForTimeout(150)
  }
  await p.mouse.up()
}

function card(p: Page, lane: string, title: string): Locator {
  return column(p, lane).locator("[class*='group/card']", { has: p.getByText(title, { exact: true }) })
}

test.beforeAll(async ({ browser }) => {
  expect(PASSWORD, "E2E_TEST_PASSWORD must be set in .env.local").not.toBe("")
  page = await browser.newPage()
})

test.afterAll(async () => {
  console.log("\n=== FINDINGS ===\n" + (findings.length ? findings.map((f) => `- ${f}`).join("\n") : "- none"))
  await page.close()
})

test("landing and auth guard", async () => {
  await page.goto("/")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await page.goto("/app")
  await expect(page).toHaveURL(/\/login\?next=%2Fapp/)
})

test("sign up and create a workspace with sample data", async () => {
  await signIn(page, EMAIL, "Demo Local")
  await page.goto("/app")
  await page.waitForURL(/\/(onboarding|w\/)/)
  if (page.url().includes("/onboarding")) {
    await expect(page.getByRole("heading", { name: /set up your workspace/i })).toBeVisible()
    await shot(page, "v2-01-onboarding")
    await page.getByLabel("Workspace name").fill(WORKSPACE)
    await page.getByRole("button", { name: "Create workspace" }).click()
    await page.waitForURL(/\/w\/[^/?]+/)
  }
  slug = page.url().match(/\/w\/([^/?#]+)/)![1]
  expect(slug).toBeTruthy()
})

test("welcome tour can be skipped and does not return", async () => {
  await page.goto(`/w/${slug}?welcome=1`)
  const tour = page.getByRole("dialog")
  await expect(tour.getByText(/welcome to orbit/i)).toBeVisible()
  await shot(page, "v2-02-tour")
  await tour.getByRole("button", { name: "Skip tour" }).click()
  await expect(tour).toBeHidden()
  await page.goto(`/w/${slug}`)
  await expect(page.getByRole("heading", { name: "Pulse" })).toBeVisible()
  expect(await page.getByRole("dialog").isVisible().catch(() => false)).toBe(false)
})

test("pulse shows sample project and who is working", async () => {
  await expect(page.getByText("Who's working on what")).toBeVisible()
  await expect(page.getByRole("link", { name: "Getting started with Orbit" }).first()).toBeVisible()
  await shot(page, "v2-03-pulse")
})

test("create a project", async () => {
  await page.goto(`/w/${slug}/projects`)
  const existing = page.getByRole("link", { name: PROJECT, exact: true })
  if (await existing.count()) {
    await existing.first().click()
  } else {
    await page.getByRole("button", { name: "New project" }).first().click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("Name").fill(PROJECT)
    await dialog.getByLabel("Description").fill("Refresh the marketing site: new navigation, homepage and case studies.")
    await dialog.getByLabel("Status").selectOption("in_progress")
    await dialog.getByRole("button", { name: "Create project" }).click()
  }
  await page.waitForURL(/\/projects\/[^/?#]+$/)
  projectSlug = page.url().match(/\/projects\/([^/?#]+)/)![1]
  await expect(page.getByRole("heading", { name: PROJECT, level: 1 })).toBeVisible()
  for (const lane of ["Backlog", "Todo", "In Progress", "In Review", "Done", "Canceled"]) {
    await expect(page.getByRole("heading", { name: lane, exact: true })).toBeVisible()
  }
  await shot(page, "v2-04-board-empty")
})

const TASKS: [string, string][] = [
  ["Todo", "Redesign the homepage hero"],
  ["Todo", "Write case study: Acme Retail"],
  ["In Progress", "Build the new navigation"],
  ["In Review", "Audit accessibility of forms"],
  ["Done", "Set up analytics"],
]

test("create tasks from the board", async () => {
  for (const [lane, title] of TASKS) {
    if (await page.getByText(title, { exact: true }).count()) continue
    await column(page, lane).getByRole("button", { name: `Add task to ${lane}` }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByRole("heading", { name: "New task" })).toBeVisible()
    await dialog.getByLabel("Title").fill(title)
    await dialog.getByLabel("Description").fill(`Details for ${title.toLowerCase()}.`)
    await dialog.getByRole("button", { name: "Create task" }).click()
    await expect(dialog).toBeHidden()
    await expect(column(page, lane).getByText(title, { exact: true })).toBeVisible()
  }
  await expect(page.getByText(/^[A-Z]{2,5}-\d+$/).first()).toBeVisible()
  await shot(page, "v2-05-board-populated")
})

test("open a task by clicking, edit it, comment, and see activity", async () => {
  await card(page, "Todo", "Redesign the homepage hero").first().click()
  const sheet = page.getByRole("dialog")
  await expect(sheet.getByLabel("Title")).toHaveValue("Redesign the homepage hero")
  await sheet.getByRole("button", { name: /No priority|Low|Medium|High|Urgent/ }).first().click()
  await page.getByRole("menuitem", { name: "High" }).click()
  await expect(sheet.getByRole("button", { name: "High" })).toBeVisible()
  if (await sheet.getByRole("button", { name: "Unassigned" }).count()) {
    await sheet.getByRole("button", { name: "Unassigned" }).click()
    await page.getByRole("menuitem", { name: /Demo Local/ }).click()
  }
  await expect(sheet.getByRole("button", { name: /Demo Local/ })).toBeVisible()
  await sheet.getByLabel("New comment").fill("Kicking this off today. @Demo Local please review the copy.")
  await sheet.getByRole("button", { name: "Comment", exact: true }).click()
  await expect(sheet.getByText("Kicking this off today.", { exact: false }).first()).toBeVisible()
  await expect(sheet.getByText(/set .* priority to high/i).first()).toBeVisible()
  await shot(page, "v2-06-task-detail")
  await sheet.getByRole("button", { name: "Close" }).click()
  await expect(sheet).toBeHidden()
  await expect(page).toHaveURL(new RegExp(`/projects/${projectSlug}$`))
})

test("drag a task to another column and persist", async () => {
  const title = "Write case study: Acme Retail"
  const fromLane = await laneOf(page, title, ["Todo", "In Progress", "Backlog", "In Review", "Done"])
  const toLane = fromLane === "Todo" ? "In Progress" : "Todo"
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes(`/projects/${projectSlug}`), { timeout: 15_000 })
  await dragToLane(page, title, fromLane, toLane)
  await expect(column(page, toLane).getByText(title, { exact: true })).toBeVisible()
  await saved
  await page.reload()
  await expect(column(page, toLane).getByText(title, { exact: true })).toBeVisible()
  await shot(page, "v2-07-after-dnd")
})

test("list view, overview, updates, my work, search", async () => {
  await page.goto(`/w/${slug}/projects/${projectSlug}/list`)
  await expect(page.getByRole("cell", { name: "Build the new navigation" }).first()).toBeVisible()
  await page.getByRole("button", { name: /Filters/ }).click()
  await page.getByRole("menuitem", { name: "In Progress" }).click()
  await page.keyboard.press("Escape")
  await expect(page.getByText(/of \d+$/)).toBeVisible()
  await shot(page, "v2-08-list")

  await page.goto(`/w/${slug}/projects/${projectSlug}/overview`)
  await expect(page.getByText("Open work by person")).toBeVisible()

  await page.goto(`/w/${slug}/projects/${projectSlug}/updates`)
  await page.getByRole("radio", { name: "At risk" }).click()
  await page.getByPlaceholder(/What moved this week/).fill("Navigation is in progress; homepage hero starts tomorrow. Copy review is the risk.")
  await page.getByRole("button", { name: "Post update" }).click()
  await expect(page.getByText("Copy review is the risk.").first()).toBeVisible()
  await shot(page, "v2-09-updates")

  await page.goto(`/w/${slug}/my-work`)
  await expect(page.getByRole("heading", { name: "My work" })).toBeVisible()
  await expect(page.getByText("Redesign the homepage hero").first()).toBeVisible()

  await page.goto(`/w/${slug}/search?q=navigation`)
  await expect(page.getByText("Build the new navigation").first()).toBeVisible()
  await shot(page, "v2-10-search")
})

test("command menu opens with keyboard and navigates", async () => {
  await page.goto(`/w/${slug}`)
  await page.keyboard.press("Control+k")
  const menu = page.getByRole("dialog")
  await expect(menu.getByPlaceholder(/command or search/i)).toBeVisible()
  await menu.getByPlaceholder(/command or search/i).fill("my work")
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/\/my-work$/)
})

test("settings pages render; labels and statuses editable", async () => {
  for (const path of ["settings", "settings/labels", "settings/statuses", "settings/notifications", "settings/billing", "profile", "ai"]) {
    await page.goto(`/w/${slug}/${path}`)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  }
  await page.goto(`/w/${slug}/settings/statuses`)
  if (!(await page.getByText("Blocked", { exact: true }).count())) {
    await page.getByPlaceholder(/Blocked, QA, Shipped/).fill("Blocked")
    await page.getByRole("button", { name: "Add", exact: true }).click()
    await expect(page.locator("input[aria-label=\"Status name\"][value=\"Blocked\"]")).toBeVisible()
  }
  await page.goto(`/w/${slug}/projects/${projectSlug}`)
  await expect(page.getByRole("heading", { name: "Blocked", exact: true })).toBeVisible()
  await shot(page, "v2-11-custom-status")
})

let inviteLink = ""

test("invite a teammate and get a shareable link", async () => {
  await page.goto(`/w/${slug}/settings/members`)
  // Reruns: remove the friend if they already joined so the invite flow is exercised again.
  const manage = page.getByRole("button", { name: "Manage Friend Local" })
  if (await manage.count()) {
    await manage.click()
    await page.getByRole("menuitem", { name: "Remove from workspace" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Remove", exact: true }).click()
    await expect(page.getByText("Friend Local")).toHaveCount(0)
  }
  await page.getByRole("button", { name: "Invite people" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Email address").fill(FRIEND_EMAIL)
  await dialog.getByRole("button", { name: "Create invitation" }).click()
  const linkInput = dialog.getByLabel("Invitation link")
  await expect(linkInput).toBeVisible()
  inviteLink = await linkInput.inputValue()
  expect(inviteLink).toMatch(/\/invite\/[a-f0-9]{48}$/)
  await shot(page, "v2-12-invite-link")
  await dialog.getByRole("button", { name: "Done" }).click()
  await expect(page.getByText(FRIEND_EMAIL).first()).toBeVisible()
})

test("revoked invitation link stops working; wrong-email account is refused", async ({ browser }) => {
  await page.goto(`/w/${slug}/settings/members`)
  const throwaway = `revoke.${Date.now().toString(36)}@example.com`
  await page.getByRole("button", { name: "Invite people" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Email address").fill(throwaway)
  await dialog.getByRole("button", { name: "Create invitation" }).click()
  const revokedLink = await dialog.getByLabel("Invitation link").inputValue()
  await dialog.getByRole("button", { name: "Done" }).click()
  const row = page.locator("li", { hasText: throwaway })
  await expect(row).toBeVisible()
  // Reissue: a fresh link replaces the old one.
  await row.getByRole("button", { name: /New link|Resend email/ }).click()
  const fresh = page.getByLabel("New invitation link")
  await expect(fresh).toBeVisible()
  const freshLink = await fresh.inputValue()
  expect(freshLink).toMatch(/\/invite\/[a-f0-9]{48}$/)
  expect(freshLink).not.toBe(revokedLink)
  await page.reload()
  await expect(page.locator("li", { hasText: throwaway })).toHaveCount(1)
  await page.locator("li", { hasText: throwaway }).getByRole("button", { name: "Revoke" }).click()
  await expect(page.locator("li", { hasText: throwaway })).toHaveCount(0)

  // Logged-out visitor with the revoked link.
  const ctx = await browser.newContext()
  const p = await ctx.newPage()
  await p.goto(revokedLink)
  await expect(p.getByText(/revoked|isn't valid/i).first()).toBeVisible()
  await expect(p.getByRole("button", { name: "Accept invitation" })).toHaveCount(0)
  // A tampered token is refused too.
  await p.goto(revokedLink.slice(0, -4) + "0000")
  await expect(p.getByText(/isn't valid/i).first()).toBeVisible()
  await p.goto(freshLink)
  await expect(p.getByText(/revoked|isn't valid/i).first()).toBeVisible()
  await ctx.close()

  // The owner (wrong email) cannot accept the friend's pending invitation.
  await page.goto(inviteLink)
  await expect(page.getByText(/different email/i)).toBeVisible()
  await expect(page.getByRole("button", { name: "Accept invitation" })).toHaveCount(0)
  // "Switch account" signs out and returns to the invite after login.
  await page.getByRole("button", { name: "Switch account" }).click()
  await page.waitForURL(/\/login\?next=%2Finvite%2F/)
  await page.getByLabel("Email").fill(EMAIL)
  await page.getByLabel("Password").fill(PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL(/\/invite\//)
  await expect(page.getByText(/different email/i)).toBeVisible()
})

test("second user opens the link, signs up, and joins; realtime works across browsers", async ({ browser }) => {
  const friendContext: BrowserContext = await browser.newContext()
  const friend = await friendContext.newPage()
  await friend.goto(inviteLink)
  await expect(friend.getByText(new RegExp(`Join ${WORKSPACE}`))).toBeVisible()
  await shot(friend, "v2-13-invite-landing")
  await friend.getByRole("link", { name: "Create account" }).click()
  await friend.waitForURL(/\/signup\?next=/)
  await friend.getByLabel("Full name").fill("Friend Local")
  await friend.getByLabel("Email").fill(FRIEND_EMAIL)
  await friend.getByLabel("Password").fill(PASSWORD)
  await friend.getByRole("button", { name: "Create account" }).click()
  const alert = friend.locator("form").getByRole("alert")
  await Promise.race([friend.waitForURL(/\/invite\//, { timeout: 20_000 }), alert.waitFor({ timeout: 20_000 })])
  if (await alert.isVisible().catch(() => false)) {
    await friend.goto(`/login?next=${encodeURIComponent(new URL(inviteLink).pathname)}`)
    await friend.getByLabel("Email").fill(FRIEND_EMAIL)
    await friend.getByLabel("Password").fill(PASSWORD)
    await friend.getByRole("button", { name: "Sign in" }).click()
    await friend.waitForURL(/\/invite\//)
  }
  await friend.getByRole("button", { name: "Accept invitation" }).click()
  await friend.waitForURL(new RegExp(`/w/${slug}`))
  const friendSkip = friend.getByRole("dialog").getByRole("button", { name: "Skip tour" })
  await friendSkip.waitFor({ state: "visible", timeout: 8000 }).then(() => friendSkip.click()).catch(() => {})
  await expect(friend.getByRole("dialog")).toHaveCount(0)
  await expect(friend.getByRole("heading", { name: "Pulse" })).toBeVisible()
  await shot(friend, "v2-14-friend-joined")

  // Owner sees the new member without reloading (membership realtime).
  await page.goto(`/w/${slug}/settings/members`)
  await expect(page.getByText("Friend Local").first()).toBeVisible({ timeout: 15_000 })

  // Realtime board: friend moves a card, owner sees it live.
  await page.goto(`/w/${slug}/projects/${projectSlug}`)
  await expect(page.getByText("Live", { exact: true })).toBeVisible({ timeout: 20_000 })
  await friend.goto(`/w/${slug}/projects/${projectSlug}`)
  await expect(friend.getByText("Live", { exact: true })).toBeVisible({ timeout: 20_000 })
  const title = "Build the new navigation"
  const fromLane = await laneOf(friend, title, ["In Progress", "In Review", "Todo", "Backlog", "Done"])
  const toLane = fromLane === "In Review" ? "In Progress" : "In Review"
  await dragToLane(friend, title, fromLane, toLane)
  await expect(column(friend, toLane).getByText(title, { exact: true })).toBeVisible()
  const arrived = await column(page, toLane).getByText(title, { exact: true }).waitFor({ state: "visible", timeout: 30_000 }).then(() => true).catch(() => false)
  if (!arrived) note("BUG: realtime move not received by the other browser within 30s")
  expect(arrived).toBe(true)
  await shot(page, "v2-15-realtime-owner-view")

  // Friend creates a task; owner sees it appear.
  const friendTask = `Friend task ${Date.now().toString(36)}`
  await column(friend, "Backlog").getByRole("button", { name: "Add task to Backlog" }).click()
  const dialog = friend.getByRole("dialog")
  await dialog.getByLabel("Title").fill(friendTask)
  await dialog.getByRole("button", { name: "Create task" }).click()
  await expect(dialog).toBeHidden()
  await expect(column(page, "Backlog").getByText(friendTask, { exact: true })).toBeVisible({ timeout: 15_000 })

  // Friend assigns a task to owner → owner gets a notification.
  await card(friend, "Backlog", friendTask).first().click()
  const sheet = friend.getByRole("dialog")
  await sheet.getByRole("button", { name: "Unassigned" }).click()
  await friend.getByRole("menuitem", { name: /Demo Local/ }).click()
  await expect(sheet.getByRole("button", { name: /Demo Local/ })).toBeVisible()
  await page.goto(`/w/${slug}/inbox`)
  await expect(page.getByText(friendTask, { exact: true })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/assigned you/).first()).toBeVisible()
  await shot(page, "v2-16-inbox")

  // Member POV: no invite, no member management, read-only workspace settings,
  // no status/label editing, own work visible.
  await friend.goto(`/w/${slug}/settings/members`)
  await expect(friend.getByText("Demo Local")).toBeVisible()
  expect(await friend.getByRole("button", { name: "Invite people" }).count()).toBe(0)
  expect(await friend.getByRole("button", { name: /^Manage / }).count()).toBe(0)
  expect(await friend.getByText("Pending invitations").count()).toBe(0)
  await friend.goto(`/w/${slug}/settings`)
  await expect(friend.locator("#ws-name")).toBeDisabled()
  expect(await friend.getByRole("button", { name: "Save changes" }).count()).toBe(0)
  expect(await friend.getByRole("button", { name: "Delete everything" }).count()).toBe(0)
  await friend.goto(`/w/${slug}/settings/statuses`)
  expect(await friend.getByText("Add a status").count()).toBe(0)
  await friend.goto(`/w/${slug}/settings/labels`)
  // Members may add labels while working; only admins rename/recolor/delete them.
  expect(await friend.getByLabel("Label name").count()).toBe(0)
  await friend.goto(`/w/${slug}/my-work`)
  await expect(friend.getByRole("heading", { name: "My work" })).toBeVisible()
  await shot(friend, "v2-17-member-settings")

  // Isolation: owner creates a second workspace; the member cannot open it.
  await page.goto("/onboarding?new=1")
  await page.getByLabel("Workspace name").fill(`Private Space ${Date.now().toString(36)}`)
  await page.getByRole("button", { name: "Create workspace" }).click()
  await page.waitForURL(/\/w\/[^/?]+/)
  const otherSlug = page.url().match(/\/w\/([^/?#]+)/)![1]
  expect(otherSlug).not.toBe(slug)
  await friend.goto(`/w/${otherSlug}`)
  await expect(friend.getByText(/not found|drifted/i).first()).toBeVisible()
  await friend.goto(`/w/${otherSlug}/settings/members`)
  await expect(friend.getByText(/not found|drifted/i).first()).toBeVisible()
  // The member's switcher only lists their own workspace.
  await friend.goto(`/w/${slug}`)
  await friend.getByRole("button", { name: new RegExp(WORKSPACE) }).first().click()
  expect(await friend.getByRole("menuitem", { name: /Private Space/ }).count()).toBe(0)
  await friend.keyboard.press("Escape")
  // Clean up the extra workspace (owner-only delete).
  await page.goto(`/w/${otherSlug}/settings`)
  await page.getByRole("button", { name: "Delete workspace" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Delete everything" }).click()
  await page.waitForURL((u) => !u.pathname.includes(otherSlug))

  // Admin removes the member; the member loses access immediately.
  await page.goto(`/w/${slug}/settings/members`)
  await page.getByRole("button", { name: "Manage Friend Local" }).click()
  await page.getByRole("menuitem", { name: "Remove from workspace" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Remove", exact: true }).click()
  await expect(page.getByText("Friend Local")).toHaveCount(0)
  await friend.goto(`/w/${slug}`)
  await expect(friend.getByText(/not found|drifted|no workspace/i).first()).toBeVisible({ timeout: 15_000 })
  await shot(page, "v2-18-member-removed")
  await friendContext.close()
})

test("mobile viewport has no horizontal overflow", async ({ browser }: { browser: Browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const m = await ctx.newPage()
  await m.goto("/login")
  await m.getByLabel("Email").fill(EMAIL)
  await m.getByLabel("Password").fill(PASSWORD)
  await m.getByRole("button", { name: "Sign in" }).click()
  await m.waitForURL(/\/w\//)
  for (const path of ["", `/projects/${projectSlug}`, "/my-work", "/inbox"]) {
    await m.goto(`/w/${slug}${path}`)
    await expect(m.getByRole("heading", { level: 1 })).toBeVisible()
    const overflow = await m.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
    if (overflow) note(`UX: horizontal overflow at 390px on ${path || "/"}`)
    expect(overflow).toBe(false)
  }
  await shot(m, "v2-17-mobile-board")
  await ctx.close()
})

test("404 and sign out", async () => {
  await page.goto(`/w/${slug}/projects/does-not-exist`)
  await expect(page.getByText(/not found/i).first()).toBeVisible()
  await page.goto(`/w/not-a-workspace`)
  await expect(page.getByText(/not found|drifted/i).first()).toBeVisible()
  await page.goto(`/w/${slug}/profile`)
  await page.getByRole("main").getByRole("button", { name: "Sign out" }).click()
  await page.waitForURL(/\/login$/)
  await page.goto(`/w/${slug}`)
  await expect(page).toHaveURL(/\/login\?next=/)
})
