import {
  test,
  advanceWizard,
  chooseAnswer,
  clickMapCenter,
  clickToolDockButton,
  completeMatchingSolo,
  completeMeasuringSolo,
  completeRadarSolo,
  completeTentacleSolo,
  completeThermometerSolo,
  expectEliminationMaskVisible,
  expectMapHasAnnotations,
  retreatWizard,
  waitForWizardNext,
} from "../../fixtures";

test.describe("solo question tools", () => {
  test("completes radar", async ({ localMap }) => {
    await completeRadarSolo(localMap);
  });

  test("radar wizard back and next buttons stay clickable", async ({
    localMap: page,
  }) => {
    await clickToolDockButton(page, "Radar");
    await clickMapCenter(page);
    await waitForWizardNext(page);
    await advanceWizard(page);
    await retreatWizard(page);
    await advanceWizard(page);
    await page.getByRole("button", { name: /Mile|km/i }).first().click();
    await waitForWizardNext(page);
    await advanceWizard(page);
    await chooseAnswer(page, "Yes");
    await page.getByRole("button", { name: "Add radar question" }).click();
    await expectMapHasAnnotations(page);
    await expectEliminationMaskVisible(page);
  });

  test("completes matching", async ({ localMap }) => {
    await completeMatchingSolo(localMap);
  });

  test("completes measuring with map targets", async ({ localMap }) => {
    await completeMeasuringSolo(localMap);
  });

  test("completes thermometer", async ({ localMap }) => {
    await completeThermometerSolo(localMap);
  });

  test("completes tentacles", async ({ localMap }) => {
    await completeTentacleSolo(localMap);
  });
});
