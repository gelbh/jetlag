import {
  test,
  chooseAnswer,
  clickToolDockButton,
  completeMatchingSolo,
  completeMeasuringSolo,
  completeRadarSolo,
  completeTentacleSolo,
  completeThermometerSolo,
  expectAskHud,
  expectEliminationMaskVisible,
  expectMapHasAnnotations,
  placeAskAnchor,
  selectFirstRadarDistance,
  waitForPrimedCommit,
} from "../../fixtures";

test.describe("solo question tools", () => {
  test("completes radar", async ({ localMap }) => {
    await completeRadarSolo(localMap);
  });

  test("radar ask strip arms after distance and answer", async ({
    localMap: page,
  }) => {
    await clickToolDockButton(page, "Radar");
    await expectAskHud(page);
    await placeAskAnchor(page);
    await selectFirstRadarDistance(page);
    await chooseAnswer(page, "Yes");
    await waitForPrimedCommit(page);
    await page.getByRole("button", { name: /^ASK(?: ·|$)/ }).click();
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
