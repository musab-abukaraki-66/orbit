import { expect, test } from "@playwright/test"

// Authentication rules, session behaviour and route guards, checked in fresh
// browser contexts. Sign-up validation is exercised without creating accounts
// (every invalid attempt must be rejected before Supabase is called).

const EMAIL = process.env.E2E_TEST_EMAIL ?? ""
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? ""

test.describe("sign-up validation", () => {
  // `server` disables the browser's own field validation so the server action is the one answering.
  async function attempt(page: import("@playwright/test").Page, email: string, password: string, server = false) {
    await page.goto("/signup")
    if (server) await page.locator("form").evaluate((form) => (form as HTMLFormElement).setAttribute("novalidate", ""))
    await page.getByLabel("Full name").fill("Audit User")
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Password").fill(password)
    await page.getByRole("button", { name: "Create account" }).click()
    return page.locator("form").getByRole("alert")
  }

  test("password shorter than 6 characters (browser field and server)", async ({ page }) => {
    await attempt(page, "audit-short@example.com", "a1b2c")
    expect(await page.getByLabel("Password").evaluate((el) => !(el as HTMLInputElement).checkValidity())).toBe(true)
    await expect(await attempt(page, "audit-short@example.com", "a1b2c", true)).toContainText("at least 6 characters")
    expect(page.url()).toContain("/signup")
  })

  test("password without a letter", async ({ page }) => {
    await expect(await attempt(page, "audit-digits@example.com", "12345678")).toContainText("at least one letter")
  })

  test("password without a number", async ({ page }) => {
    await expect(await attempt(page, "audit-letters@example.com", "abcdefgh")).toContainText("at least one number")
  })

  test("invalid email is rejected by the browser field", async ({ page }) => {
    await page.goto("/signup")
    await page.getByLabel("Full name").fill("Audit User")
    await page.getByLabel("Email").fill("not-an-email")
    await page.getByLabel("Password").fill("abc123")
    await page.getByRole("button", { name: "Create account" }).click()
    const invalid = await page.getByLabel("Email").evaluate((el) => !(el as HTMLInputElement).checkValidity())
    expect(invalid).toBe(true)
    expect(page.url()).toContain("/signup")
  })

  test("invalid email is rejected on the server too", async ({ page }) => {
    await expect(await attempt(page, "not-an-email", "abc123", true)).toContainText("valid email")
  })

  test("duplicate email is refused", async ({ page }) => {
    test.skip(!EMAIL, "E2E_TEST_EMAIL not set")
    await expect(await attempt(page, EMAIL, "abc123")).toContainText(/already exists|already registered/i)
  })
})

test.describe("sign-in and session", () => {
  test.skip(!EMAIL || !PASSWORD, "E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set")

  test("wrong password and unknown account get the same generic error", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Email").fill(EMAIL)
    await page.getByLabel("Password").fill("definitely-wrong-9")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page.locator("form").getByRole("alert")).toContainText("Invalid email or password")
    await page.getByLabel("Email").fill(`nobody-${Date.now()}@example.com`)
    await page.getByLabel("Password").fill("abc123")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page.locator("form").getByRole("alert")).toContainText("Invalid email or password")
  })

  test("valid login, persistence across reload, auth pages redirect, sign out", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Email").fill(EMAIL)
    await page.getByLabel("Password").fill(PASSWORD)
    await page.getByRole("button", { name: "Sign in" }).click()
    await page.waitForURL(/\/w\//)
    const home = page.url()
    await page.reload()
    await expect(page.getByRole("heading", { name: "Pulse" })).toBeVisible()
    // Signed-in users are bounced away from the auth pages.
    await page.goto("/login")
    await page.waitForURL(/\/w\//)
    await page.goto("/signup")
    await page.waitForURL(/\/w\//)
    // A cold navigation straight to a deep route works.
    await page.goto(`${new URL(home).pathname}/settings/members`)
    await expect(page.getByRole("button", { name: "Invite people" })).toBeVisible()
    // Sign out returns to /login and protected routes redirect again.
    // Keyboard-activate: the Next.js dev-tools badge overlaps the sidebar footer in dev mode.
    await page.getByRole("button", { name: /sign out/i }).focus()
    await page.keyboard.press("Enter")
    await page.waitForURL(/\/login/)
    await page.goto(home)
    await page.waitForURL(/\/login\?next=/)
  })
})

test.describe("route guards and error states", () => {
  test("protected routes redirect to login with next", async ({ page }) => {
    for (const path of ["/app", "/w/anything", "/w/anything/settings", "/onboarding"]) {
      await page.goto(path)
      await page.waitForURL(/\/login\?next=/)
      expect(new URL(page.url()).searchParams.get("next")).toBe(path)
    }
  })

  test("public routes are reachable without a session", async ({ page }) => {
    for (const path of ["/", "/login", "/signup", "/forgot-password", "/update-password"]) {
      const response = await page.goto(path)
      expect(response?.status(), path).toBe(200)
    }
    await page.goto("/update-password")
    await expect(page.getByRole("heading", { name: /link isn.t valid/i })).toBeVisible()
  })

  test("unknown page renders the 404 page", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist")
    expect(response?.status()).toBe(404)
    await expect(page.getByText(/drifted out of orbit/i)).toBeVisible()
  })

  test("invalid invitation token fails safely", async ({ page }) => {
    await page.goto("/invite/not-a-real-token")
    await expect(page.getByText(/isn.t valid/i)).toBeVisible()
    await expect(page.getByRole("link", { name: "Go to Orbit" })).toBeVisible()
  })

  test("broken auth callback lands on forgot-password with an explanation", async ({ page }) => {
    await page.goto("/auth/callback?code=bogus")
    await page.waitForURL(/\/forgot-password\?error=link/)
    await expect(page.locator("form").getByRole("alert")).toContainText(/invalid or has expired/i)
    await page.goto("/auth/callback?token_hash=bogus&type=recovery")
    await page.waitForURL(/\/forgot-password\?error=link/)
  })

  test("signed-in user gets 404 for a workspace they are not in and for a missing project", async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, "E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set")
    await page.goto("/login")
    await page.getByLabel("Email").fill(EMAIL)
    await page.getByLabel("Password").fill(PASSWORD)
    await page.getByRole("button", { name: "Sign in" }).click()
    await page.waitForURL(/\/w\//)
    const base = page.url().match(/\/w\/[^/?#]+/)![0]
    const response = await page.goto("/w/no-such-workspace-xyz")
    expect(response?.status()).toBe(404)
    // Nested routes stream inside the workspace shell's loading boundary, so
    // the HTTP status is already sent; the not-found UI is what matters here.
    await page.goto(`${base}/projects/no-such-project`)
    await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible()
    await page.goto(`${base}/items/NOPE-999`)
    await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible()
    // Search with PostgREST-sensitive characters must not error.
    await page.goto(`${base}/search?q=${encodeURIComponent("a,b(c)")}`)
    await expect(page.getByRole("heading", { name: "Search" })).toBeVisible()
    await expect(page.getByText(/No results|Tasks \(/)).toBeVisible()
  })
})
