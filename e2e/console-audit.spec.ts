import { expect, test } from "@playwright/test"

const EMAIL = process.env.E2E_TEST_EMAIL ?? ""
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? ""

// Visits the main surfaces and fails if the browser console logs errors or
// warnings (hydration mismatches, Base UI complaints, unhandled rejections).
test("main surfaces render without console errors", async ({ page }) => {
  const messages: string[] = []
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") messages.push(`[${m.type()}] ${m.text().split("\n")[0].slice(0, 200)}`)
  })
  page.on("pageerror", (e) => messages.push(`[pageerror] ${e.message.slice(0, 200)}`))

  await page.goto("/login")
  await page.getByLabel("Email").fill(EMAIL)
  await page.getByLabel("Password").fill(PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL(/\/w\//)
  const base = new URL(page.url()).pathname.split("/").slice(0, 3).join("/")
  const projectsHref = await page.locator("a[href*='/projects/']").first().getAttribute("href")
  const routes = [
    base,
    `${base}/my-work`,
    `${base}/inbox`,
    `${base}/projects`,
    projectsHref ?? `${base}/projects`,
    `${projectsHref}/list`,
    `${projectsHref}/overview`,
    `${projectsHref}/updates`,
    `${base}/search?q=a`,
    `${base}/ai`,
    `${base}/profile`,
    `${base}/settings`,
    `${base}/settings/members`,
    `${base}/settings/labels`,
    `${base}/settings/statuses`,
    `${base}/settings/notifications`,
    `${base}/settings/billing`,
  ]
  for (const route of routes) {
    await page.goto(route)
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(500)
  }
  // Open a task sheet too.
  await page.goto(projectsHref!)
  const first = page.locator("[class*='group/card']").first()
  if (await first.count()) {
    await first.click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await page.waitForTimeout(500)
  }
  const ignored = /React DevTools|\[Fast Refresh\]|\[HMR\]/
  const real = messages.filter((m) => !ignored.test(m))
  console.log("CONSOLE:\n" + (real.length ? real.join("\n") : "(clean)"))
  expect(real).toEqual([])
})
