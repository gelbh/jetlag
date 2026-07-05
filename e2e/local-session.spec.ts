import { test, expect } from "@playwright/test";
import { prepareE2EPage } from "./fixtures/app";

test("creates a local session from home and opens the map", async ({ page }) => {
  await prepareE2EPage(page);
  await page.goto("/");
  await page.getByRole("link", { name: "Create session" }).click();
  await page.getByPlaceholder("Dublin, Ireland").fill("Dublin");
  await page.getByRole("button", { name: "Find place" }).click();
  await page.getByRole("button", { name: "Confirm game area" }).click();
  await expect(page.getByRole("button", { name: "Pin" })).toBeVisible({
    timeout: 15_000,
  });
});
