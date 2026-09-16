import { mkdirSync } from "node:fs"
import { expect, test, type Locator, type Page } from "@playwright/test"

// Walks Orbit the way a first-time user would and leaves behind a realistic
// demo workspace. Re-runnable: signup falls back to login, and every create
// step skips items that already exist.

const EMAIL = process.env.E2E_TEST_EMAIL ?? "orbit.demo.local@example.com"
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? ""
const FULL_NAME = "Demo Local"
const TEAM = "Orbit Demo Team (local)"
const WORKSPACE = "Orbit Product Team"
const BOARDS = ["Product Development", "Marketing Campaign", "Personal Tasks"]

// Boards always ship with these four lanes; there is no UI to add a "Review"
// column, so review items go to "In Progress" tagged with a "Review" label.
const CARDS: Record<string, { title: string; description: string; label?: string }[]> = {
  Backlog: [
    { title: "Research onboarding improvements", description: "Interview five new users and collect the top three points of confusion in their first session." },
    { title: "Define notification system", description: "Decide which events notify (assignment, mention, due soon) and through which channels." },
    { title: "Review dashboard UX", description: "Audit the Home page: are the stat cards and empty states pulling their weight?" },
  ],
  Todo: [
    { title: "Redesign signup flow", description: "Reduce the form to name, email, password and move team creation to a clearly separate step." },
    { title: "Add empty states", description: "Every list view needs a friendly empty state with one obvious next action." },
    { title: "Improve mobile navigation", description: "Sidebar collapses on small screens; make sure the toggle is discoverable and the sheet is swipeable." },
  ],
  "In Progress": [
    { title: "Build onboarding tour", description: "Three-step welcome tour after the first login: welcome, navigation, boards." },
    { title: "Fix board creation flow", description: "New board must open its page immediately after creation, with the default lanes in place." },
    { title: "Improve workspace navigation", description: "Workspace switcher in the sidebar plus a clear 'active' badge on the Home page." },
    { title: "Test authentication", description: "Sign up, sign in, sign out, session persistence across refresh, protected-route redirects.", label: "Review" },
    { title: "Review responsive layout", description: "Check the board on a 390px viewport: columns scroll horizontally, cards stay readable.", label: "Review" },
  ],
  Done: [
    { title: "Initial database setup", description: "Tables, RLS policies, helper functions and triggers applied from the migration set." },
    { title: "Create dashboard", description: "Home page with stats, boards in the active workspace, and the workspace list." },
    { title: "Configure Supabase authentication", description: "Email/password auth with cookie sessions via @supabase/ssr." },
  ],
}

const SHOTS = "e2e/screenshots"
mkdirSync(SHOTS, { recursive: true })

const findings: string[] = []
function note(message: string) {
  findings.push(message)
  console.log(`[finding] ${message}`)
}

test.describe.configure({ mode: "serial" })

let page: Page

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage()
  expect(PASSWORD, "E2E_TEST_PASSWORD must be set in .env.local").not.toBe("")
})

test.afterAll(async () => {
  console.log("\n=== FINDINGS ===\n" + (findings.length ? findings.map((f) => `- ${f}`).join("\n") : "- none"))
  await page.close()
})

async function shot(name: string) {
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false })
}

// Board links read "<name> N tasks", so match on the leading name only.
function boardLink(name: string): Locator {
  return page.getByRole("link", { name: new RegExp(`^${name}\\s`) })
}

function card(lane: string, title: string): Locator {
  return column(lane).locator("div.group\\/card", {
    has: page.getByText(title, { exact: true }),
  })
}

function column(name: string): Locator {
  return page.locator("div.w-64", { has: page.getByRole("heading", { name, exact: true }) })
}

async function createBoardFromDashboard(name: string) {
  await page.goto("/app")
  if (await boardLink(name).count()) return
  await page.getByRole("button", { name: "New board" }).first().click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByRole("heading", { name: "Create board" })).toBeVisible()
  await dialog.getByLabel("Board name").fill(name)
  await dialog.getByRole("button", { name: "Create board" }).click()
  await page.waitForURL(/\/app\/boards\/[0-9a-f-]{36}$/)
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible()
  for (const lane of ["Backlog", "Todo", "In Progress", "Done"]) {
    await expect(page.getByRole("heading", { name: lane, exact: true })).toBeVisible()
  }
}

async function createTask(lane: string, title: string, description: string, label?: string) {
  const col = column(lane)
  if (await page.getByText(title, { exact: true }).count()) return
  await col.getByRole("button", { name: "New task" }).click()
  const sheet = page.getByRole("dialog")
  await expect(sheet.getByRole("heading", { name: "New task" })).toBeVisible()
  await sheet.getByLabel("Title").fill(title)
  await sheet.getByLabel("Description").fill(description)
  if (label) {
    const existing = sheet.getByRole("button", { name: /Add label|Labels/ })
    if (await existing.count()) {
      await existing.first().click()
      const option = page.getByRole("menuitem", { name: label, exact: true })
      if (await option.count()) {
        await option.click()
      } else {
        await page.keyboard.press("Escape")
        await sheet.getByRole("button", { name: "New label" }).click()
        await sheet.getByPlaceholder(/label/i).fill(label)
        await sheet.getByRole("button", { name: "Create label" }).click()
      }
    } else {
      await sheet.getByRole("button", { name: "New label" }).click()
      await sheet.getByPlaceholder(/label/i).fill(label)
      await sheet.getByRole("button", { name: "Create label" }).click()
    }
  }
  const submit = sheet.getByRole("button", { name: "Create task" })
  await submit.click()
  await expect(sheet).toBeHidden()
  await expect(col.getByText(title, { exact: true })).toBeVisible()
}

test("landing page renders", async () => {
  await page.goto("/")
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/orbit|together/i)
  await expect(page.getByRole("link", { name: /open the app/i }).first()).toBeVisible()
  await shot("01-landing")
})

test("protected routes redirect to login", async () => {
  await page.goto("/app")
  await expect(page).toHaveURL(/\/login\?next=%2Fapp/)
  await shot("02-login-redirect")
})

test("sign up (or log in) with the local demo account", async () => {
  await page.goto("/signup")
  await page.getByLabel("Full name").fill(FULL_NAME)
  await page.getByLabel("Email").fill(EMAIL)
  await page.getByLabel("Password").fill(PASSWORD)
  await page.getByRole("button", { name: "Create account" }).click()

  const alert = page.locator("form").getByRole("alert")
  await Promise.race([
    page.waitForURL(/\/(onboarding|app)/, { timeout: 20_000 }),
    alert.waitFor({ timeout: 20_000 }),
  ])
  if (await alert.isVisible().catch(() => false)) {
    const text = (await alert.textContent()) ?? ""
    if (/already|registered|exists/i.test(text)) {
      await page.goto("/login")
      await page.getByLabel("Email").fill(EMAIL)
      await page.getByLabel("Password").fill(PASSWORD)
      await page.getByRole("button", { name: "Sign in" }).click()
      await page.waitForURL(/\/(onboarding|app)/)
    } else {
      throw new Error(`Signup failed: ${text}`)
    }
  }
})

test("first-run: create a team", async () => {
  await page.goto("/app")
  await page.waitForURL(/\/(onboarding|app)$/)
  if (!page.url().includes("/onboarding")) return
  await expect(page.getByRole("heading", { name: /create your team/i })).toBeVisible()
  await shot("03-onboarding-team")
  await page.getByLabel("Team name").fill(TEAM)
  await page.getByRole("button", { name: "Create team" }).click()
  await page.waitForURL(/\/app$/)
})

test("welcome tour appears for a new user and leads to workspace creation", async () => {
  await page.goto("/app")
  const tour = page.getByRole("dialog")
  const tourVisible = await tour.getByText(/welcome to orbit/i).isVisible().catch(() => false)
  if (!tourVisible) {
    note("Tour did not appear (account had already completed it) - skipping tour checks")
    return
  }
  await expect(tour.getByText("Step 1 of 3")).toBeVisible()
  await shot("04-tour-step1")
  await tour.getByRole("button", { name: "Continue" }).click()
  await expect(tour.getByText("Step 2 of 3")).toBeVisible()
  await expect(tour.getByText("Find your way around")).toBeVisible()
  await shot("05-tour-step2")
  await tour.getByRole("button", { name: "Back" }).click()
  await expect(tour.getByText("Step 1 of 3")).toBeVisible()
  await tour.getByRole("button", { name: "Continue" }).click()
  await tour.getByRole("button", { name: "Continue" }).click()
  await expect(tour.getByText("Step 3 of 3")).toBeVisible()
  await shot("06-tour-step3")
  await tour.getByRole("button", { name: /create a workspace|create your first board/i }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByRole("heading", { name: /create (workspace|board)/i })).toBeVisible()
  await shot("07-tour-handoff-dialog")
  await page.keyboard.press("Escape")
})

test("create the workspace", async () => {
  await page.goto("/app")
  if (await page.getByText(WORKSPACE, { exact: true }).count()) return
  await page.getByRole("button", { name: /create workspace|new workspace/i }).first().click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Workspace name").fill(WORKSPACE)
  await dialog.getByRole("button", { name: "Create workspace" }).click()
  await page.waitForURL(/\/app$/)
  await expect(page.getByText(WORKSPACE, { exact: true }).first()).toBeVisible()
  await shot("08-dashboard-empty-workspace")
})

test("tour does not reappear after completion", async () => {
  await page.reload()
  await expect(page.getByRole("heading", { name: /welcome,/i })).toBeVisible()
  const reappeared = await page.getByRole("dialog").getByText(/welcome to orbit/i).isVisible().catch(() => false)
  if (reappeared) note("BUG: welcome tour reappeared after it had been completed")
  expect(reappeared).toBe(false)
})

test("create three boards", async () => {
  for (const name of BOARDS) await createBoardFromDashboard(name)
  await page.goto("/app")
  await shot("09-dashboard-with-boards")
  await page.goto("/app/boards")
  for (const name of BOARDS) await expect(page.getByText(name, { exact: true }).first()).toBeVisible()
  await shot("10-boards-index")
})

test("populate the Product Development board", async () => {
  await page.goto("/app")
  await boardLink(BOARDS[0]).first().click()
  await page.waitForURL(/\/app\/boards\//)
  await shot("11-board-empty")
  for (const [lane, cards] of Object.entries(CARDS)) {
    for (const card of cards) await createTask(lane, card.title, card.description, card.label)
  }
  await shot("12-board-populated")
})

async function renameTask(lane: string, from: string, to: string) {
  const target = card(lane, from).first()
  await target.hover()
  await target.getByRole("button", { name: "Task actions" }).click()
  await page.getByRole("menuitem", { name: "Edit" }).click()
  const sheet = page.getByRole("dialog")
  await expect(sheet.getByRole("heading", { name: "Edit task" })).toBeVisible()
  await expect(sheet.getByLabel("Title")).toHaveValue(from)
  await sheet.getByLabel("Title").fill(to)
  await sheet.getByRole("button", { name: "Save changes" }).click()
  await expect(sheet).toBeHidden()
  await expect(column(lane).getByText(to, { exact: true }).first()).toBeVisible()
}

test("edit a task (rename, then rename back)", async () => {
  await renameTask("Todo", "Add empty states", "Add empty states (edited)")
  await page.reload()
  await expect(column("Todo").getByText("Add empty states (edited)", { exact: true })).toBeVisible()
  await renameTask("Todo", "Add empty states (edited)", "Add empty states")
})

async function dragTask(title: string, fromLane: string, toLane: string) {
  const source = column(fromLane).getByText(title, { exact: true })
  const target = column(toLane)
  await source.scrollIntoViewIfNeeded()
  const from = await source.boundingBox()
  const heading = await target.getByRole("heading", { name: toLane, exact: true }).boundingBox()
  if (!from || !heading) throw new Error("could not resolve drag geometry")
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2, { steps: 5 })
  await page.mouse.move(heading.x + 60, heading.y + 120, { steps: 25 })
  await page.waitForTimeout(150)
  // The board updates optimistically on drop; wait for the server action
  // (a POST back to the page) so a reload afterwards sees the committed row.
  const saved = page.waitForResponse(
    (response) => response.request().method() === "POST" && response.url().includes("/app/boards/"),
    { timeout: 15_000 },
  )
  await page.mouse.up()
  await expect(target.getByText(title, { exact: true })).toBeVisible({ timeout: 10_000 })
  await expect(column(fromLane).getByText(title, { exact: true })).toHaveCount(0)
  await saved
}

test("move a task between columns with the mouse (and persist)", async () => {
  const title = "Improve mobile navigation"
  await dragTask(title, "Todo", "In Progress")
  await page.reload()
  await page.getByText("Live", { exact: true }).waitFor()
  const persisted = (await column("In Progress").getByText(title, { exact: true }).count()) === 1
  if (!persisted) note("BUG: drag-and-drop move did not persist after reload")
  expect(persisted).toBe(true)
  await shot("13-board-after-dnd")
  // Put it back so the demo data stays as designed.
  await dragTask(title, "In Progress", "Todo")
})

test("delete a task", async () => {
  const col = column("Done")
  const target = card("Done", "Configure Supabase authentication")
  await target.hover()
  await target.getByRole("button", { name: "Task actions" }).click()
  await page.getByRole("menuitem", { name: "Delete" }).click()
  const confirm = page.getByRole("dialog")
  await expect(confirm.getByRole("heading", { name: "Delete task" })).toBeVisible()
  await confirm.getByRole("button", { name: "Delete task" }).click()
  await expect(confirm).toBeHidden()
  await expect(col.getByText("Configure Supabase authentication", { exact: true })).toHaveCount(0)
  // Re-create it so the demo data stays complete.
  await createTask("Done", "Configure Supabase authentication", CARDS.Done[2].description)
})

test("board survives a refresh and back-navigation", async () => {
  const url = page.url()
  await page.reload()
  await expect(page.getByRole("heading", { name: BOARDS[0], level: 1 })).toBeVisible()
  await page.getByRole("link", { name: "Back to boards" }).click()
  await expect(page).toHaveURL(/\/app\/boards$/)
  await page.goto(url)
  await expect(page.getByRole("heading", { name: BOARDS[0], level: 1 })).toBeVisible()
})

test("sidebar navigation reaches every section", async () => {
  for (const [label, path] of [["Inbox", "/app/inbox"], ["Boards", "/app/boards"], ["Team", "/app/team"], ["Profile", "/app/profile"], ["Settings", "/app/settings"], ["Home", "/app"]] as const) {
    await page.getByRole("link", { name: label, exact: true }).first().click()
    await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, "\\/")}$`))
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await shot(`14-nav-${label.toLowerCase()}`)
  }
})

test("404 states", async () => {
  await page.goto("/app/boards/00000000-0000-0000-0000-000000000000")
  await expect(page.getByText(/drifted out of orbit/i)).toBeVisible()
  await shot("15-404-board")
  await page.goto("/this-does-not-exist")
  await expect(page.getByText(/drifted out of orbit/i)).toBeVisible()
  await page.getByRole("link", { name: /open the app/i }).first().click()
  await expect(page).toHaveURL(/\/app$/)
})

async function pageOverflowsHorizontally() {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
}

test("no horizontal page overflow on desktop or mobile", async () => {
  for (const [width, height] of [[1280, 800], [1024, 768], [390, 844]] as const) {
    await page.setViewportSize({ width, height })
    await page.goto("/app")
    if (await pageOverflowsHorizontally()) note(`BUG: dashboard overflows horizontally at ${width}px`)
    expect(await pageOverflowsHorizontally(), `dashboard overflow at ${width}px`).toBe(false)
    if (width === 390) await shot("16-mobile-dashboard")
    await boardLink(BOARDS[0]).first().click()
    await page.waitForURL(/\/app\/boards\//)
    await expect(page.getByRole("heading", { name: "Done", exact: true })).toBeAttached()
    if (await pageOverflowsHorizontally()) note(`BUG: board page overflows horizontally at ${width}px`)
    expect(await pageOverflowsHorizontally(), `board overflow at ${width}px`).toBe(false)
    if (width === 390) await shot("17-mobile-board")
  }
  await page.setViewportSize({ width: 1280, height: 800 })
})

test("sign out, then sign back in without seeing the tour", async () => {
  await page.goto("/app")
  await page.getByRole("button", { name: "Sign out" }).click()
  await page.waitForURL(/\/login$/)
  await page.goto("/app")
  await expect(page).toHaveURL(/\/login\?next=%2Fapp/)
  await page.getByLabel("Email").fill(EMAIL)
  await page.getByLabel("Password").fill(PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL(/\/app$/)
  await expect(page.getByRole("heading", { name: /welcome,/i })).toBeVisible()
  const tour = await page.getByRole("dialog").getByText(/welcome to orbit/i).isVisible().catch(() => false)
  if (tour) note("BUG: welcome tour shown again to a returning user")
  expect(tour).toBe(false)
  await shot("18-returning-user-dashboard")
})
