import {
  test,
  drawZone,
  expectMapHasAnnotations,
  openMapWithLocalSession,
  placePin,
  redoAnnotation,
  undoAnnotation,
} from "../../fixtures";

test.describe("markup tools", () => {
  test("places a pin with a note", async ({ localMap }) => {
    await placePin(localMap, "Meeting point");
    await expectMapHasAnnotations(localMap);
  });

  test("draws a zone polygon", async ({ localMap }) => {
    await drawZone(localMap, "Dead zone");
  });

  test("supports undo and redo", async ({ page }) => {
    await openMapWithLocalSession(page);
    await test.step("place then undo/redo", async () => {
      await placePin(page);
      await undoAnnotation(page);
      await redoAnnotation(page);
    });
    await expectMapHasAnnotations(page);
  });
});
