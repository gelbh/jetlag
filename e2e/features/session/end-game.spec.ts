import {
  test,
  expect,
  confirmInitialHidingZoneAtStation,
  dismissMapOnboarding,
  acceptEndGame,
  cancelEndGame,
  declineEndGame,
  expectEndGameRestrictions,
  expectEndGameStarted,
  requestEndGame,
  startSessionTimer,
} from "../../fixtures";

test.setTimeout(120_000);

test("decline clears pending; accept starts end game; cancel and reset work", async ({
  hostHider,
}) => {
  const { hostPage, guestPage } = hostHider;

  await confirmInitialHidingZoneAtStation(guestPage, "Dublin Central");

  await startSessionTimer(hostPage);
  await dismissMapOnboarding(hostPage);

  await requestEndGame(hostPage);
  await declineEndGame(guestPage);
  await expect(
    hostPage.getByText("Waiting for hider to accept end game"),
  ).toBeHidden({ timeout: 15_000 });

  await requestEndGame(hostPage);
  await acceptEndGame(guestPage);
  await expectEndGameStarted(hostPage, guestPage);

  await expectEndGameRestrictions(hostPage);
  await cancelEndGame(hostPage);
});
