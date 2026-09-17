import { expect, test, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test"

// Two independent browser contexts (owner "A", member "B") on the same board.
// Every change made in A must show up in B without B navigating or reloading,
// and B's realtime socket must never receive rows from a workspace B is not a
// member of. The member is invited through the real invitation flow and
// removed again at the end, so the suite is re-runnable.

const EMAIL = process.env.E2E_TEST_EMAIL ?? ""
const FRIEND_EMAIL = process.env.E2E_FRIEND_EMAIL ?? ""
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? ""

test.describe.configure({ mode: "serial" })
test.setTimeout(240_000)

type Actor = { context: BrowserContext; page: Page; console: string[]; frames: string[] }

let a: Actor
let b: Actor
let slug = ""
let projectSlug = ""
let otherSlug = ""

function column(p: Page, name: string): Locator {
  return p.locator("div.w-64", { has: p.getByRole("heading", { name, exact: true }) })
}

function cardIn(p: Page, lane: string, title: string): Locator {
  return column(p, lane).locator("[class*='group/card']", { has: p.getByText(title, { exact: true }) })
}

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

async function actor(browser: Browser, email: string): Promise<Actor> {
  const context = await browser.newContext()
  const page = await context.newPage()
  const consoleMessages: string[] = []
  const frames: string[] = []
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") consoleMessages.push(`[${m.type()}] ${m.text().split("\n")[0].slice(0, 200)}`)
  })
  page.on("pageerror", (e) => consoleMessages.push(`[pageerror] ${e.message.slice(0, 200)}`))
  page.on("websocket", (ws) => {
    if (!/realtime/.test(ws.url())) return
    ws.on("framereceived", (f) => frames.push(String(f.payload)))
  })
  await page.goto("/login")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL(/\/(w\/|onboarding)/)
  return { context, page, console: consoleMessages, frames }
}

async function waitLive(p: Page) {
  await expect(p.getByText("Live", { exact: true })).toBeVisible({ timeout: 30_000 })
}

test.beforeAll(async ({ browser }) => {
  expect(PASSWORD, "E2E_TEST_PASSWORD must be set").not.toBe("")
  expect(FRIEND_EMAIL, "E2E_FRIEND_EMAIL must be set").not.toBe("")
  a = await actor(browser, EMAIL)
  slug = a.page.url().match(/\/w\/([^/?#]+)/)![1]
})

test.afterAll(async () => {
  await a?.context.close()
  await b?.context.close()
})

test("owner invites the member through the real invitation flow", async () => {
  await a.page.goto(`/w/${slug}/settings/members`)
  // Remove a stale membership from a previous interrupted run.
  const manage = a.page.getByRole("button", { name: /^Manage Friend/ })
  if (await manage.count()) {
    await manage.first().click()
    await a.page.getByRole("menuitem", { name: "Remove from workspace" }).click()
    await a.page.getByRole("dialog").getByRole("button", { name: "Remove", exact: true }).click()
    await expect(a.page.getByRole("button", { name: /^Manage Friend/ })).toHaveCount(0)
  }
  await a.page.getByRole("button", { name: "Invite people" }).click()
  const dialog = a.page.getByRole("dialog")
  await dialog.getByLabel("Email address").fill(FRIEND_EMAIL)
  await dialog.getByRole("button", { name: "Create invitation" }).click()
  const link = await dialog.getByLabel("Invitation link").inputValue()
  expect(link).toMatch(/\/invite\/[a-f0-9]{48}$/)
  await a.page.keyboard.press("Escape")

  b = await actor(a.page.context().browser()!, FRIEND_EMAIL)
  await b.page.goto(new URL(link).pathname)
  await b.page.getByRole("button", { name: "Accept invitation" }).click()
  await b.page.waitForURL(new RegExp(`/w/${slug}`))
  const skip = b.page.getByRole("dialog").getByRole("button", { name: "Skip tour" })
  await skip.waitFor({ state: "visible", timeout: 8000 }).then(() => skip.click()).catch(() => {})
  await expect(b.page.getByRole("heading", { name: "Pulse" })).toBeVisible()
})

test("owner creates a dedicated project; both boards go live", async () => {
  await a.page.goto(`/w/${slug}/projects`)
  await a.page.getByRole("button", { name: "New project" }).first().click()
  const dialog = a.page.getByRole("dialog")
  await dialog.getByLabel("Name").fill(`Realtime audit ${Date.now().toString(36)}`)
  await dialog.getByLabel("Status").selectOption("in_progress")
  await dialog.getByRole("button", { name: "Create project" }).click()
  await a.page.waitForURL(/\/projects\/[^/?#]+$/)
  projectSlug = a.page.url().match(/\/projects\/([^/?#]+)/)![1]
  await waitLive(a.page)
  await b.page.goto(`/w/${slug}/projects/${projectSlug}`)
  await waitLive(b.page)
})

const TITLE = `Live card ${Date.now().toString(36)}`
const RENAMED = `${TITLE} renamed`
const LABEL = `L${Date.now().toString(36).slice(-5)}`

test("A creates a task → B sees it without reload", async () => {
  await column(a.page, "Todo").getByRole("button", { name: "Add task to Todo" }).click()
  const dialog = a.page.getByRole("dialog")
  await dialog.getByLabel("Title").fill(TITLE)
  await dialog.getByRole("button", { name: "Create task" }).click()
  await expect(dialog).toBeHidden()
  await expect(column(b.page, "Todo").getByText(TITLE, { exact: true })).toBeVisible({ timeout: 15_000 })
  expect(await b.page.getByText(TITLE, { exact: true }).count()).toBe(1)
})

test("A assigns the task to B → B's card and inbox badge update live", async () => {
  await cardIn(a.page, "Todo", TITLE).first().click()
  const sheet = a.page.getByRole("dialog")
  await sheet.getByRole("button", { name: "Unassigned" }).click()
  await a.page.getByRole("menuitem", { name: /Friend/ }).click()
  await expect(sheet.getByRole("button", { name: /Friend/ })).toBeVisible()
  await a.page.keyboard.press("Escape")
  await expect(cardIn(b.page, "Todo", TITLE).first().getByTitle("Assigned to you")).toBeVisible({ timeout: 15_000 })
  // Inbox badge in B's sidebar is rendered by the server tree and refreshed by the notifications channel.
  await expect(b.page.getByRole("link", { name: /^Inbox/ }).locator("..").getByText(/^\d+$/)).toBeVisible({ timeout: 15_000 })
})

test("A moves the task → B sees the new column; assignee unchanged", async () => {
  await dragToLane(a.page, TITLE, "Todo", "In Progress")
  await expect(column(a.page, "In Progress").getByText(TITLE, { exact: true })).toBeVisible()
  await expect(column(b.page, "In Progress").getByText(TITLE, { exact: true })).toBeVisible({ timeout: 15_000 })
  await expect(column(b.page, "Todo").getByText(TITLE, { exact: true })).toHaveCount(0)
  await expect(cardIn(b.page, "In Progress", TITLE).first().getByTitle("Assigned to you")).toBeVisible()
  expect(await b.page.getByText(TITLE, { exact: true }).count()).toBe(1)
})

test("A edits title and label → B sees both without reload", async () => {
  await cardIn(a.page, "In Progress", TITLE).first().click()
  const sheet = a.page.getByRole("dialog")
  const titleInput = sheet.getByLabel("Title")
  await titleInput.fill(RENAMED)
  await titleInput.press("Enter")
  await expect(column(b.page, "In Progress").getByText(RENAMED, { exact: true })).toBeVisible({ timeout: 15_000 })

  // Create a fresh label from the picker (creates it and attaches it in one go).
  await sheet.getByRole("button", { name: /Add label|Edit labels/ }).click()
  await a.page.getByRole("menuitem", { name: "New label" }).click()
  await sheet.getByPlaceholder("Label name").fill(LABEL)
  await sheet.getByRole("button", { name: "Create label" }).click()
  await expect(sheet.getByRole("button", { name: `Remove label ${LABEL}` })).toBeVisible()
  await expect(cardIn(b.page, "In Progress", RENAMED).first().getByText(LABEL, { exact: true })).toBeVisible({ timeout: 15_000 })
  await a.page.keyboard.press("Escape")
  await expect(a.page.getByRole("dialog")).toHaveCount(0)
})

test("A comments while B has the task open → B sees the comment; nothing duplicates", async () => {
  await cardIn(b.page, "In Progress", RENAMED).first().click()
  const bSheet = b.page.getByRole("dialog")
  await expect(bSheet.getByLabel("Title")).toHaveValue(RENAMED)

  await cardIn(a.page, "In Progress", RENAMED).first().click()
  const aSheet = a.page.getByRole("dialog")
  const comment = `Live comment ${Date.now().toString(36)}`
  await aSheet.getByLabel("New comment").fill(comment)
  await aSheet.getByRole("button", { name: "Comment" }).click()
  await expect(aSheet.getByText(comment)).toBeVisible()
  await expect(bSheet.getByText(comment)).toBeVisible({ timeout: 15_000 })
  await b.page.waitForTimeout(1500)
  expect(await bSheet.getByText(comment).count()).toBe(1)
  expect(await aSheet.getByText(comment).count()).toBe(1)
  await a.page.keyboard.press("Escape")
  await b.page.keyboard.press("Escape")
  await expect(b.page.getByRole("dialog")).toHaveCount(0)
  // Comment count on B's card came through the server refresh.
  await expect(cardIn(b.page, "In Progress", RENAMED).first().getByText("1", { exact: true })).toBeVisible({ timeout: 15_000 })
})

test("B goes offline and back → still live; A's move arrives", async () => {
  await b.context.setOffline(true)
  await expect(b.page.getByText(/Reconnecting|Connecting/)).toBeVisible({ timeout: 75_000 })
  await dragToLane(a.page, RENAMED, "In Progress", "In Review")
  await expect(column(a.page, "In Review").getByText(RENAMED, { exact: true })).toBeVisible()
  await b.context.setOffline(false)
  await waitLive(b.page)
  await expect(column(b.page, "In Review").getByText(RENAMED, { exact: true })).toBeVisible({ timeout: 30_000 })
  expect(await b.page.getByText(RENAMED, { exact: true }).count()).toBe(1)
})

test("B reloads and navigates away and back → still live", async () => {
  await b.page.reload()
  await waitLive(b.page)
  await dragToLane(a.page, RENAMED, "In Review", "Todo")
  await expect(column(b.page, "Todo").getByText(RENAMED, { exact: true })).toBeVisible({ timeout: 15_000 })
  // A live move must not wipe the labels B already knows about.
  await expect(cardIn(b.page, "Todo", RENAMED).first().getByText(LABEL, { exact: true })).toBeVisible()
  await b.page.getByRole("link", { name: "List" }).click()
  await b.page.waitForURL(/\/list$/)
  await b.page.getByRole("link", { name: "Board" }).click()
  await b.page.waitForURL(/\/projects\/[^/?#]+$/)
  await waitLive(b.page)
  await dragToLane(a.page, RENAMED, "Todo", "In Progress")
  await expect(column(b.page, "In Progress").getByText(RENAMED, { exact: true })).toBeVisible({ timeout: 15_000 })
})

test("events from another workspace never reach B's socket", async () => {
  await a.page.goto("/onboarding?new=1")
  await a.page.getByLabel("Workspace name").fill(`Isolation ${Date.now().toString(36)}`)
  await a.page.getByRole("button", { name: "Create workspace" }).click()
  await a.page.waitForURL(/\/w\/[^/?]+/)
  otherSlug = a.page.url().match(/\/w\/([^/?#]+)/)![1]
  expect(otherSlug).not.toBe(slug)
  const skip = a.page.getByRole("dialog").getByRole("button", { name: "Skip tour" })
  await skip.waitFor({ state: "visible", timeout: 8000 }).then(() => skip.click()).catch(() => {})
  await a.page.goto(`/w/${otherSlug}/projects/getting-started`)
  await waitLive(a.page)
  const before = b.frames.length
  const marker = `Isolation card ${Date.now().toString(36)}`
  await column(a.page, "Todo").getByRole("button", { name: "Add task to Todo" }).click()
  const dialog = a.page.getByRole("dialog")
  await dialog.getByLabel("Title").fill(marker)
  await dialog.getByRole("button", { name: "Create task" }).click()
  await expect(dialog).toBeHidden()
  await dragToLane(a.page, marker, "Todo", "In Progress")
  await expect(column(a.page, "In Progress").getByText(marker, { exact: true })).toBeVisible()
  await b.page.waitForTimeout(4000)
  const leaked = b.frames.slice(before).filter((f) => f.includes(marker) || f.includes(otherSlug))
  expect(leaked).toEqual([])
  expect(await b.page.getByText(marker).count()).toBe(0)
  // Clean up the isolation workspace.
  await a.page.goto(`/w/${otherSlug}/settings`)
  await a.page.getByRole("button", { name: "Delete workspace" }).click()
  await a.page.getByRole("dialog").getByRole("button", { name: "Delete everything" }).click()
  await a.page.waitForURL((u) => !u.pathname.includes(otherSlug))
})

test("A deletes the task → B sees it disappear; no duplicate notifications", async () => {
  await a.page.goto(`/w/${slug}/projects/${projectSlug}`)
  await waitLive(a.page)
  await cardIn(a.page, "In Progress", RENAMED).first().click()
  const sheet = a.page.getByRole("dialog")
  await sheet.getByRole("button", { name: "Task actions" }).click()
  await a.page.getByRole("menuitem", { name: "Delete task" }).click()
  await a.page.getByRole("dialog").getByRole("button", { name: "Delete task" }).last().click()
  await expect(a.page.getByText(RENAMED, { exact: true })).toHaveCount(0)
  await expect(b.page.getByText(RENAMED, { exact: true })).toHaveCount(0, { timeout: 15_000 })

  // Deleting the task cascades its notifications, so nothing about it may remain in B's inbox.
  await b.page.goto(`/w/${slug}/inbox`)
  await expect(b.page.getByRole("heading", { name: "Inbox" })).toBeVisible()
  expect(await b.page.getByText(TITLE, { exact: true }).count()).toBe(0)
  expect(await b.page.getByText(RENAMED, { exact: true }).count()).toBe(0)
})

test("no subscription errors or console errors on either side", async () => {
  const bad = /invalid column|"status":"error"|unauthorized|TooManyRequests|channel_error/i
  const errFrames = [...a.frames, ...b.frames].filter((f) => bad.test(f))
  expect(errFrames).toEqual([])
  const ignored = /React DevTools|\[Fast Refresh\]|\[HMR\]/
  expect(a.console.filter((m) => !ignored.test(m))).toEqual([])
  expect(b.console.filter((m) => !ignored.test(m))).toEqual([])
})

test("cleanup: delete the audit project and remove the member", async () => {
  await a.page.goto(`/w/${slug}/projects/${projectSlug}`)
  await a.page.getByRole("button", { name: "Project actions" }).click()
  await a.page.getByRole("menuitem", { name: "Delete project" }).click()
  await a.page.getByRole("dialog").getByRole("button", { name: "Delete project" }).click()
  await a.page.waitForURL(/\/projects$/)
  await a.page.goto(`/w/${slug}/settings/labels`)
  await a.page.getByRole("button", { name: `Delete ${LABEL}` }).click()
  await expect(a.page.getByRole("button", { name: `Delete ${LABEL}` })).toHaveCount(0)
  await a.page.goto(`/w/${slug}/settings/members`)
  await a.page.getByRole("button", { name: /^Manage Friend/ }).click()
  await a.page.getByRole("menuitem", { name: "Remove from workspace" }).click()
  await a.page.getByRole("dialog").getByRole("button", { name: "Remove", exact: true }).click()
  await expect(a.page.getByRole("button", { name: /^Manage Friend/ })).toHaveCount(0)
  await b.page.goto(`/w/${slug}`)
  await expect(b.page.getByText(/not found|drifted|no workspace/i).first()).toBeVisible({ timeout: 15_000 })
})
