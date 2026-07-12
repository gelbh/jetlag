import {
  test,
  expect,
  confirmInitialHidingZoneAtStation,
  openChat,
  sendRadarToHiders,
} from "../fixtures";

test.describe("game chat screenshots", () => {
  test.setTimeout(120_000);

  test("matches chat drawer with pending question", async ({ hostHider }) => {
    const { hostPage, guestPage } = hostHider;

    await confirmInitialHidingZoneAtStation(guestPage, "Dublin Central");
    await sendRadarToHiders(hostPage);
    await openChat(hostPage);
    await expect(hostPage.getByText(/Are you within/i)).toBeVisible({
      timeout: 15_000,
    });

    await expect(hostPage).toHaveScreenshot("chat-pending-question.png", {
      maxDiffPixelRatio: 0.02,
    });
  });
});
