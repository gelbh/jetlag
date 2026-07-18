import { test, expect, prepareE2EPage } from "../fixtures";

test.describe("tutorial hub screenshots", () => {
  test("@smoke matches hub baseline", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "jetlag.tutorialProgress",
        JSON.stringify({
          core: 6,
          tools: -1,
          hider: -1,
          extras: -1,
          coreComplete: true,
          questions: {
            matching: 2,
            measuring: -1,
            thermometer: -1,
            radar: -1,
            tentacle: -1,
            photo: -1,
          },
        }),
      );
    });
    await prepareE2EPage(page);
    await page.goto("/tutorial");
    await expect(page.getByRole("heading", { name: "Tutorial" })).toBeVisible();
    await expect(page).toHaveScreenshot("tutorial-hub.png", {
      maxDiffPixelRatio: 0.02,
    });
  });
});
