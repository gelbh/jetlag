import { test, expect, openSocialRoute } from "../fixtures";

test("@smoke leaderboard matches visual baseline", async ({ page }) => {
  await openSocialRoute(page, "/leaderboard");
  await expect(page.getByTestId("leaderboard-filters")).toHaveScreenshot(
    "leaderboard-filters.png",
    { maxDiffPixelRatio: 0.02 },
  );
});
