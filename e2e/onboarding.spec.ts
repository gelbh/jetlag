import { test, expect } from "./fixtures";
import { blockExternalAssets, seedLocalSession } from "./fixtures";

test.describe("onboarding", () => {
  test("map first-run sheet can be dismissed", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("jetlag.mapFirstRunDismissed");
    });
    await blockExternalAssets(page);
    await seedLocalSession(page);
    await page.goto("/map");

    await expect(page.getByRole("heading", { name: "Map tools" })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("heading", { name: "Map tools" })).toBeHidden();
  });
});
