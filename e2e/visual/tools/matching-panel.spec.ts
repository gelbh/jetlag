import {
  test,
  expect,
  openMapWithLocalSession,
  clickToolDockButton,
  expectAskHud,
} from "../../fixtures";

test.describe("matching tool panel screenshots", () => {
  test.beforeEach(async ({ page }) => {
    await openMapWithLocalSession(page);
  });

  test("matches category step baseline before geo lookup", async ({ page }) => {
    await clickToolDockButton(page, "Matching");
    await expectAskHud(page);
    await expect(
      page.getByRole("button", { name: /Museum/i }).first(),
    ).toBeVisible({ timeout: 15_000 });

    const hud = page.getByTestId("ask-hud-host");
    await expect(hud).toHaveScreenshot("matching-panel-category.png", {
      maxDiffPixelRatio: 0.02,
    });
  });
});
