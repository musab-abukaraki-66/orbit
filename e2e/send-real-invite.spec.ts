import { expect, test } from "@playwright/test"

// Manual check: sends a real invitation email to INVITE_TO via the UI and
// reports what the app said about delivery.
const TO = process.env.INVITE_TO ?? ""

test("send a real invitation email", async ({ page }) => {
  test.skip(!TO, "set INVITE_TO")
  await page.goto("/login")
  await page.getByLabel("Email").fill(process.env.E2E_TEST_EMAIL ?? "")
  await page.getByLabel("Password").fill(process.env.E2E_TEST_PASSWORD ?? "")
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL(/\/w\//)
  await page.goto("/w/acme-digital/settings/members")
  // Clear any pending invite for this address so a fresh one is created.
  const existing = page.locator("li", { hasText: TO })
  if (await existing.count()) {
    await existing.getByRole("button", { name: "Revoke" }).click()
    await expect(existing).toHaveCount(0)
  }
  await page.getByRole("button", { name: "Invite people" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Email address").fill(TO)
  await dialog.getByRole("button", { name: "Create invitation" }).click()
  await expect(dialog.getByLabel("Invitation link")).toBeVisible({ timeout: 30_000 })
  const statuses = await dialog.getByRole("status").allTextContents()
  console.log("DELIVERY:", statuses.join(" | "))
  await page.screenshot({ path: "e2e/screenshots/v2-20-real-invite.png" })
  expect(statuses.join(" ")).toContain("Email sent")
})
