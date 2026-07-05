import { test, expect } from "@playwright/test";
import { openMapWithLocalSession } from "./fixtures/app";

test("opens the measuring tool wizard", async ({ page }) => {
  await openMapWithLocalSession(page);

  await page.getByRole("button", { name: "More map tools" }).click();
  await page.getByRole("menuitem", { name: /Measuring/i }).click();

  await expect(page.getByText(/closer to or further from/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Next" })).toBeVisible();
});
