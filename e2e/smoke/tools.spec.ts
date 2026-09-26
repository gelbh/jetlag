import {
  test,
  completeRadarSolo,
  expectRedoEnabled,
  placePin,
  undoAnnotation,
} from "../fixtures";

test("@smoke completes a solo radar question", async ({ localMap }) => {
  await test.step("ask and commit radar", async () => {
    await completeRadarSolo(localMap);
  });
});

test("@smoke places a pin and supports undo", async ({ localMap }) => {
  await test.step("place pin", async () => {
    await placePin(localMap);
  });

  await test.step("undo leaves redo armed", async () => {
    await undoAnnotation(localMap);
    await expectRedoEnabled(localMap);
  });
});
