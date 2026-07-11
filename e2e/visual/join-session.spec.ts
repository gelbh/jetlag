import { test, expect, prepareE2EPage } from "../fixtures";

test("@smoke join session screen matches visual baseline", async ({ page }) => {
  await prepareE2EPage(page);
  await page.goto("/join");
  await expect(page.getByRole("heading", { name: "Session code" })).toBeVisible();
  await expect(page).toHaveScreenshot("join-session.png", {
    maxDiffPixelRatio: 0.02,
  });
});
