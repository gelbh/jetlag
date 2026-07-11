import {
  test,
  expect,
  advanceRemoteSessionTimerInEmulator,
  confirmInitialHidingZoneAtStation,
  dismissMapOnboarding,
  readPersistedSessionId,
  startSessionTimer,
} from "../../fixtures";

test.setTimeout(120_000);

test("shows advisory when hider GPS is outside zone after hiding period", async ({
  hostHider,
}) => {
  const { hostPage, guestPage } = hostHider;

  await confirmInitialHidingZoneAtStation(guestPage, "Dublin Central");

  await startSessionTimer(hostPage);
  const sessionId = await readPersistedSessionId(hostPage);
  await advanceRemoteSessionTimerInEmulator(hostPage, sessionId, 61 * 60 * 1000);

  await guestPage.context().setGeolocation({
    latitude: 53.1,
    longitude: -6.9,
  });
  await guestPage.reload();
  await dismissMapOnboarding(guestPage);
  await expect(
    guestPage.getByRole("button", { name: /Session elapsed|Seek phase time/i }),
  ).toBeVisible({ timeout: 15_000 });

  await expect(guestPage.getByText(/outside your hiding zone/i)).toBeVisible({
    timeout: 20_000,
  });
});
