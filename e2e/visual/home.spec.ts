import { test, expect } from "../fixtures";

test("@smoke home screen matches visual baseline", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Create session" })).toBeVisible();
  await expect(page).toHaveScreenshot("home.png", {
    maxDiffPixelRatio: 0.02,
  });
});
