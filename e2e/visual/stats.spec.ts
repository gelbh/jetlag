import { test, expect, openSocialRoute } from "../fixtures";

test("@smoke stats matches visual baseline", async ({ page }) => {
  await openSocialRoute(page, "/stats");
  await expect(page.getByRole("tablist", { name: "Stats role" })).toHaveScreenshot(
    "stats-role-tabs.png",
    { maxDiffPixelRatio: 0.02 },
  );
});
