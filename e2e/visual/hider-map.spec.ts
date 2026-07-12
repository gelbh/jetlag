import { test, expect, confirmInitialHidingZoneAtStation } from "../fixtures";

test.describe("hider map screenshots", () => {
  test.setTimeout(120_000);

  test("matches full hider map chrome baseline", async ({ hostHider }) => {
    const { guestPage } = hostHider;

    await confirmInitialHidingZoneAtStation(guestPage, "Dublin Central");

    await expect(guestPage).toHaveScreenshot("hider-map.png", {
      maxDiffPixelRatio: 0.02,
    });
  });
});
