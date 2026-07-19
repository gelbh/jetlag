import { test, expect, openSocialRoute } from "../fixtures";

test("@smoke friends matches visual baseline", async ({ page }) => {
  await openSocialRoute(page, "/friends");
  await expect(
    page.getByRole("textbox", { name: "Search username" }),
  ).toHaveScreenshot("friends-search.png", {
    maxDiffPixelRatio: 0.02,
  });
});
