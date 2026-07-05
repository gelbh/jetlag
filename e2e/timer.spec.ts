import { test, expect } from "@playwright/test";
import { openMapWithLocalSession } from "./fixtures/app";

test("starts, pauses, and resumes the session timer", async ({ page }) => {
  await openMapWithLocalSession(page);

  await page.getByRole("button", { name: "Start game" }).click();
  await page.getByRole("button", { name: "Elapsed time. Open timer settings" }).click();
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
});
