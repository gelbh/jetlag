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

  // Hiding countdown cleared; status island may show Seeking/Seek or Paused
  // (timer does not auto-resume after reload) with seek-phase elapsed time.
  await expect(page.getByText(/HIDING \d/)).toHaveCount(0);
  const status = page.getByTestId("tool-status-block-mantine");
  await expect(status).toBeVisible();
  await expect(status.getByText(/^(Seek|Seeking|Paused)$/)).toBeVisible({
    timeout: 10_000,
  });
});
