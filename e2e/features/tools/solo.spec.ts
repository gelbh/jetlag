import {
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
  primedAskSendButton,
  selectFirstRadarDistance,
  test,
  waitForPrimedCommit,
} from "../../fixtures";

test.describe("solo question tools", () => {
  test("completes radar", async ({ localMap }) => {
    await completeRadarSolo(localMap);
  });

  test("radar ask strip arms after distance and answer", async ({ localMap: page }) => {
    await test.step("pick distance, place, answer Yes", async () => {
      await clickToolDockButton(page, "Radar");
      await expectAskHud(page);
      await selectFirstRadarDistance(page);
      await placeAskAnchor(page);
      await chooseAnswer(page, "Yes");
      await waitForPrimedCommit(page);
    });

    await test.step("primed SEND commits annotation and elimination", async () => {
      await primedAskSendButton(page).click();
      await expectMapHasAnnotations(page);
      await expectEliminationMaskVisible(page);
    });
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
