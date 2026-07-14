import { test, expect, prepareE2EPage } from "../fixtures";

test("@smoke home screen matches visual baseline", async ({ page }) => {
  await prepareE2EPage(page);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /Play — create, join, or custom game/i }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("home.png", {
    maxDiffPixelRatio: 0.02,
  });
});
