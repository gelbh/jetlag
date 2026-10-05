import {
  confirmInitialHidingZoneAtStation,
  dismissMapOnboarding,
  expect,
  goOffline,
  goOnline,
  startSessionTimer,
  test,
  trackAlertDialogs,
} from "../fixtures";

test("declaring found offline never alerts and reaches the hider on reconnect", async ({
  hostHider,
}) => {
  const { hostPage, guestPage, hostContext } = hostHider;
  const alerts = trackAlertDialogs(hostPage);

  await confirmInitialHidingZoneAtStation(guestPage, "Dublin Central");
  await dismissMapOnboarding(guestPage);
  await startSessionTimer(hostPage);
  await dismissMapOnboarding(hostPage);

  const declareFound = hostPage.getByRole("button", { name: "Declare found hider" });
  await expect(declareFound).toBeEnabled({ timeout: 15_000 });

  await goOffline(hostContext);
  await declareFound.click();
  await expect(hostPage.getByText("Waiting for hider to confirm found hider")).toBeVisible({
    timeout: 5_000,
  });
  await expect(guestPage.getByText("Seekers say you're found")).toBeHidden();

  await goOnline(hostContext);

  await expect(guestPage.getByText("Seekers say you're found")).toBeVisible({ timeout: 15_000 });
  expect(alerts).toEqual([]);
});
