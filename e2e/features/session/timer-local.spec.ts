import { test, expect, openMapWithLocalSession } from "../../fixtures";

test("starts, pauses, and resumes the session timer", async ({ page }) => {
  await openMapWithLocalSession(page);

  await page.getByRole("button", { name: "Start" }).click();
  await page.getByRole("button", { name: /Open timer settings/i }).click();
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
});
