import { test, expect, openSocialRoute } from "../fixtures";

test("@smoke leaderboard matches visual baseline", async ({ page }) => {
  await openSocialRoute(page, "/leaderboard");
  await expect(page.getByTestId("leaderboard-filters")).toHaveScreenshot(
    "leaderboard-filters.png",
    { maxDiffPixelRatio: 0.02 },
  );
});

test("@smoke leaderboard board sheet opens", async ({ page }) => {
  await openSocialRoute(page, "/leaderboard");
  await page.getByRole("button", { name: /Choose board/i }).click();
  await expect(
    page.getByRole("dialog", { name: "Choose board" }),
  ).toBeVisible();
});
