import {
  test,
  completeMatchingSolo,
  completeMeasuringSolo,
  completeRadarSolo,
  completeTentacleSolo,
  completeThermometerSolo,
} from "../../fixtures";

test.describe("solo question tools", () => {
  test("completes radar", async ({ localMap }) => {
    await completeRadarSolo(localMap);
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
