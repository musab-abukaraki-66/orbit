import { expect, test } from "@playwright/test"

// Regression for the item-detail save() fix: a transport-level failure while
// saving title/priority must show an error, revert the field, and never
// leave the UI stuck in a saving state. Also re-confirms the normal
// (network-healthy) save path still works.

const EMAIL = process.env.E2E_TEST_EMAIL ?? ""
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? ""

test.skip(!EMAIL || !PASSWORD, "E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set")

test("title and priority edits: normal save works, and a simulated fetch failure reverts with an error instead of silently losing the edit", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Email").fill(EMAIL)
  await page.getByLabel("Password").fill(PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL(/\/w\//)
  const slug = page.url().match(/\/w\/([^/?#]+)/)![1]

  await page.goto(`/w/${slug}/projects`)
  const existingProject = page.getByRole("link", { name: "Website Redesign", exact: true })
  if (await existingProject.count()) {
    await existingProject.first().click()
  } else {
    await page.getByRole("button", { name: "New project" }).first().click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("Name").fill("Website Redesign")
    await dialog.getByRole("button", { name: "Create project" }).click()
  }
  await page.waitForURL(/\/projects\/[^/?#]+$/)

  // Fresh task per run so the "revert to last known server value" check is unambiguous.
  const title = `Save-error regression ${Date.now().toString(36)}`
  await page.getByRole("button", { name: "Add task to Backlog" }).click()
  const createDialog = page.getByRole("dialog")
  await createDialog.getByLabel("Title").fill(title)
  await createDialog.getByRole("button", { name: "Create task" }).click()
  await expect(createDialog).toBeHidden()

  await page.getByText(title, { exact: true }).first().click()
  const sheet = page.getByRole("dialog")
  const titleInput = sheet.getByLabel("Title")
  await expect(titleInput).toHaveValue(title)

  // --- Normal save still works ---
  const editedTitle = `${title} (edited)`
  await titleInput.fill(editedTitle)
  await titleInput.blur()
  await expect(sheet.getByText(/^Could not save/)).toHaveCount(0)
  await page.waitForTimeout(500)
  await page.reload()
  const sheetAfterReload = page.getByRole("dialog")
  await expect(sheetAfterReload.getByLabel("Title")).toHaveValue(editedTitle)

  // --- Simulated transport failure on title save: revert + error, no stuck state ---
  let failNext = false
  await page.route("**/*", async (route) => {
    const req = route.request()
    if (failNext && req.method() === "POST" && req.headers()["next-action"]) {
      failNext = false
      await route.abort("failed")
      return
    }
    await route.continue()
  })

  const failedTitle = `${editedTitle} SHOULD NOT PERSIST`
  const titleInputAfterReload = sheetAfterReload.getByLabel("Title")
  failNext = true
  await titleInputAfterReload.fill(failedTitle)
  await titleInputAfterReload.blur()
  await expect(sheetAfterReload.getByText(/Could not save/i)).toBeVisible({ timeout: 10_000 })
  await expect(titleInputAfterReload).toHaveValue(editedTitle)
  // The field must be editable again immediately (saving state was reset).
  await titleInputAfterReload.fill(`${editedTitle} retry`)
  await titleInputAfterReload.blur()
  await expect(sheetAfterReload.getByText(/Could not save/i)).toHaveCount(0)
  await page.waitForTimeout(500)
  await page.reload()
  await expect(page.getByRole("dialog").getByLabel("Title")).toHaveValue(`${editedTitle} retry`)

  // --- Simulated transport failure on priority save: no change, error shown ---
  const sheetFinal = page.getByRole("dialog")
  const priorityButton = sheetFinal.getByRole("button", { name: /No priority|Low|Medium|High|Urgent/ }).first()
  const before = await priorityButton.textContent()
  failNext = true
  await priorityButton.click()
  await page.getByRole("menuitem", { name: "Urgent" }).click()
  await expect(sheetFinal.getByText(/Could not save/i)).toBeVisible({ timeout: 10_000 })
  await expect(priorityButton).toHaveText(before ?? "")

  await page.unroute("**/*")

  // Cleanup: delete the regression task.
  await sheetFinal.getByRole("button", { name: "Task actions" }).click()
  await page.getByRole("menuitem", { name: /Delete task|Archive task/ }).click()
  await page.getByRole("dialog").getByRole("button", { name: /Delete task|Archive task/ }).click()
})
