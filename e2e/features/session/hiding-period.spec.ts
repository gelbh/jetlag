import {
  test,
  expect,
  openMapWithLocalSession,
  advanceLocalTimerElapsedMs,
} from "../../fixtures";

test("@smoke shows hiding countdown then seek phase after the period ends", async ({
  page,
}) => {
  await openMapWithLocalSession(page, {
    gameSize: "small",
    hidingPeriodMinutes: 5,
    sessionId: "local",
  });

  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByText(/HIDING \d{2}:\d{2}/)).toBeVisible({
    timeout: 10_000,
  });

  await advanceLocalTimerElapsedMs(page, "local", 6 * 60 * 1000);
  await page.reload();
  await page.getByRole("button", { name: "Radar" }).waitFor();

  await expect(page.getByText(/^SEEK/)).toBeVisible({ timeout: 10_000 });
});
