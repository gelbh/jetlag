import { test, expect } from "@playwright/test";
import { clickMapCenter, openMapWithLocalSession } from "./fixtures/app";

test("supports undo after placing annotations", async ({ page }) => {
  await openMapWithLocalSession(page);

  await page.getByRole("button", { name: "Pin" }).click();
  await clickMapCenter(page);
  await expect(page.getByText("Location pinned on the map.")).toBeVisible();
  await page.getByPlaceholder("Closer to the train station than us").fill("Camp");
  await page.getByRole("button", { name: "Add note" }).click();

  await page.getByRole("button", { name: "Undo last annotation" }).click();
  await expect(
    page.getByRole("button", { name: "Redo last annotation" }),
  ).toBeEnabled();
});
