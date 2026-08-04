import {
  test,
  expect,
  confirmInitialHidingZoneAtStation,
  dismissMapOnboarding,
  cancelEndGame,
  expectEndGameRestrictions,
  expectEndGameStarted,
  startEndGameFromFoundStation,
  startSessionTimer,
} from "../../fixtures";

test.setTimeout(120_000);

test("found station starts end game immediately; cancel and reset work", async ({
  hostHider,
}) => {
  const { hostPage, guestPage } = hostHider;

  await confirmInitialHidingZoneAtStation(guestPage, "Dublin Central");
  await dismissMapOnboarding(guestPage);

  await startSessionTimer(hostPage);
  await dismissMapOnboarding(hostPage);

  await startEndGameFromFoundStation(hostPage);
  await expectEndGameStarted(hostPage, guestPage);

  await expect(
    guestPage.getByRole("button", { name: "Accept" }),
  ).toBeHidden();
  await expect(
    guestPage.getByText("Seekers requested end game"),
  ).toBeHidden();

  await expectEndGameRestrictions(hostPage);
  await cancelEndGame(hostPage);
});
