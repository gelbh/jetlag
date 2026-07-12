import { test, expect, openMapWithLocalSession } from "../fixtures";

test.describe("seeker map screenshots", () => {
  test("matches full map chrome baseline", async ({ page }) => {
    await openMapWithLocalSession(page);
    await expect(page).toHaveScreenshot("map-seeker.png", {
      maxDiffPixelRatio: 0.02,
    });
  });
});
