import { expect, test } from "@playwright/test"

// Regression for the removed-member assignee-cleanup fix
// (private.membership_after_delete trigger): removing a workspace member
// must clear assignee_id on their open work items without deleting the
// items or touching anyone else's assignment.

const EMAIL = process.env.E2E_TEST_EMAIL ?? ""
const FRIEND_EMAIL = process.env.E2E_FRIEND_EMAIL ?? ""
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? ""

test.skip(!EMAIL || !FRIEND_EMAIL || !PASSWORD, "E2E_TEST_EMAIL / E2E_FRIEND_EMAIL / E2E_TEST_PASSWORD not set")

test("removing a member clears their assignee on open items, preserves the item, and leaves other assignees untouched", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Email").fill(EMAIL)
  await page.getByLabel("Password").fill(PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL(/\/w\//)
  const slug = page.url().match(/\/w\/([^/?#]+)/)![1]

  // Re-runnable: drop a stale Friend membership from a previous interrupted run.
  await page.goto(`/w/${slug}/settings/members`)
  const stale = page.getByRole("button", { name: /^Manage Friend/ })
  if (await stale.count()) {
    await stale.first().click()
    await page.getByRole("menuitem", { name: "Remove from workspace" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Remove", exact: true }).click()
    await expect(page.getByRole("button", { name: /^Manage Friend/ })).toHaveCount(0)
  }

  // Invite and accept as Friend in a second context.
  await page.getByRole("button", { name: "Invite people" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Email address").fill(FRIEND_EMAIL)
  await dialog.getByRole("button", { name: "Create invitation" }).click()
  const link = await dialog.getByLabel("Invitation link").inputValue()
  await page.keyboard.press("Escape")

  const friendContext = await page.context().browser()!.newContext()
  const friend = await friendContext.newPage()
  await friend.goto("/login")
  await friend.getByLabel("Email").fill(FRIEND_EMAIL)
  await friend.getByLabel("Password").fill(PASSWORD)
  await friend.getByRole("button", { name: "Sign in" }).click()
  await friend.waitForURL(/\/(w\/|onboarding)/)
  await friend.goto(new URL(link).pathname)
  await friend.getByRole("button", { name: "Accept invitation" }).click()
  await friend.waitForURL(new RegExp(`/w/${slug}`))

  // A project + two tasks: one assigned to Friend (the one that must lose
  // its assignee), one assigned to the owner (must stay untouched).
  await page.goto(`/w/${slug}/projects`)
  await page.getByRole("button", { name: "New project" }).first().click()
  const projectName = `Cleanup audit ${Date.now().toString(36)}`
  const pdialog = page.getByRole("dialog")
  await pdialog.getByLabel("Name").fill(projectName)
  await pdialog.getByRole("button", { name: "Create project" }).click()
  await page.waitForURL(/\/projects\/[^/?#]+$/)
  const projectSlug = page.url().match(/\/projects\/([^/?#]+)/)![1]

  const friendTaskTitle = `Assigned to friend ${Date.now().toString(36)}`
  const ownerTaskTitle = `Assigned to owner ${Date.now().toString(36)}`

  for (const title of [friendTaskTitle, ownerTaskTitle]) {
    await page.getByRole("button", { name: "Add task to Backlog" }).click()
    const tdialog = page.getByRole("dialog")
    await tdialog.getByLabel("Title").fill(title)
    await tdialog.getByRole("button", { name: "Create task" }).click()
    await expect(tdialog).toBeHidden()
  }

  await page.getByText(friendTaskTitle, { exact: true }).first().click()
  let sheet = page.getByRole("dialog")
  await sheet.getByRole("button", { name: "Unassigned" }).click()
  await page.getByRole("menuitem", { name: /Friend/ }).click()
  await expect(sheet.getByRole("button", { name: /Friend/ })).toBeVisible()
  await sheet.getByRole("button", { name: "Close" }).click()

  await page.getByText(ownerTaskTitle, { exact: true }).first().click()
  sheet = page.getByRole("dialog")
  await sheet.getByRole("button", { name: "Unassigned" }).click()
  await page.getByRole("menuitem", { name: /Demo Local/ }).click()
  await expect(sheet.getByRole("button", { name: "Unassigned" })).toHaveCount(0)
  await sheet.getByRole("button", { name: "Close" }).click()

  // Remove Friend from the workspace — the trigger under test fires here.
  await page.goto(`/w/${slug}/settings/members`)
  await page.getByRole("button", { name: /^Manage Friend/ }).click()
  await page.getByRole("menuitem", { name: "Remove from workspace" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Remove", exact: true }).click()
  await expect(page.getByRole("button", { name: /^Manage Friend/ })).toHaveCount(0)

  // Friend's task: preserved, now unassigned.
  await page.goto(`/w/${slug}/projects/${projectSlug}`)
  await expect(page.getByText(friendTaskTitle, { exact: true })).toBeVisible()
  await page.getByText(friendTaskTitle, { exact: true }).first().click()
  sheet = page.getByRole("dialog")
  // The assignee resets to Unassigned; activity history legitimately still
  // mentions Friend (audit trail is untouched — only assignee_id is cleared).
  await expect(sheet.getByRole("button", { name: "Unassigned" })).toBeVisible()
  await sheet.getByRole("button", { name: "Close" }).click()

  // Owner's task: untouched by the other member's removal.
  await page.getByText(ownerTaskTitle, { exact: true }).first().click()
  sheet = page.getByRole("dialog")
  await expect(sheet.getByRole("button", { name: "Unassigned" })).toHaveCount(0)
  await sheet.getByRole("button", { name: "Close" }).click()

  // Cleanup.
  await page.getByRole("button", { name: "Project actions" }).click()
  await page.getByRole("menuitem", { name: "Delete project" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Delete project" }).click()
  await page.waitForURL(/\/projects$/)
  await friendContext.close()
})
