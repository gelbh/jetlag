import {
  test,
  expect,
  openMapWithLocalSession,
  clickToolDockButton,
  clickMapCenter,
  waitForMapPlacementCrosshair,
  waitForWizardNext,
} from "../../fixtures";

test.describe("matching tool panel screenshots", () => {
  test.beforeEach(async ({ page }) => {
    await openMapWithLocalSession(page);
  });

  test("matches category step baseline before geo lookup", async ({ page }) => {
    await clickToolDockButton(page, "Matching");
    await waitForMapPlacementCrosshair(page);
    await clickMapCenter(page);
    await waitForWizardNext(page);
    await page.getByRole("button", { name: "Next" }).click();
    await page.locator("select.field-input").selectOption("museum");
    await waitForWizardNext(page);

    const panel = page.locator(".tool-panel-compact").filter({
      has: page.getByRole("heading", { name: "Matching" }),
    });
    await expect(panel).toHaveScreenshot("matching-panel-category.png", {
      maxDiffPixelRatio: 0.02,
    });
  });
});
