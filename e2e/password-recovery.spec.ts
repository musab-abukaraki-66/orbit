import { expect, test } from "@playwright/test"

// UI + validation for password recovery. Sending and clicking a real
// recovery email is a manual step (see README → Email); here we only use an
// address that does not exist so no mail is ever sent.
test.describe("password recovery", () => {
  test("login links to forgot-password, which validates and never reveals accounts", async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("link", { name: "Forgot password?" }).click()
    await expect(page).toHaveURL(/\/forgot-password$/)
    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible()

    // Client-side validation blocks the request.
    await page.getByLabel("Email").fill("not-an-email")
    await page.getByRole("button", { name: "Send reset link" }).click()
    await expect(page.getByRole("main").getByRole("alert")).toContainText("valid email address")

    // Unknown address gets the same generic answer as a real one.
    await page.getByLabel("Email").fill(`nobody-${Date.now()}@example.com`)
    await page.getByRole("button", { name: "Send reset link" }).click()
    await expect(page.getByRole("status")).toContainText("If an account exists for that email")
    await expect(page.getByRole("link", { name: "Back to sign in" })).toBeVisible()
  })

  test("update-password refuses without a recovery session", async ({ page }) => {
    await page.goto("/update-password")
    await expect(page.getByRole("heading", { name: "This link isn't valid" })).toBeVisible()
    await expect(page.getByLabel("New password")).toHaveCount(0)
    await page.getByRole("link", { name: "Request a new link" }).click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test("a broken recovery link lands on forgot-password with an explanation", async ({ page }) => {
    await page.goto("/auth/callback?token_hash=not-a-real-token&type=recovery")
    await expect(page).toHaveURL(/\/forgot-password\?error=link$/)
    await expect(page.getByRole("main").getByRole("alert")).toContainText("invalid or has expired")
  })

  test("a normal signed-in session is not a recovery session", async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL ?? ""
    const password = process.env.E2E_TEST_PASSWORD ?? ""
    test.skip(!email || !password, "E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set")

    await page.goto("/login")
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Password", { exact: true }).fill(password)
    await page.getByRole("button", { name: "Sign in" }).click()
    await page.waitForURL(/\/w\//)

    await page.goto("/update-password")
    await expect(page.getByRole("heading", { name: "This link isn't valid" })).toBeVisible()
    await expect(page.getByLabel("New password")).toHaveCount(0)
  })
})
