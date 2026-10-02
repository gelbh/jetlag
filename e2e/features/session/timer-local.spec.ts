import {
  expect,
  openMapWithLocalSession,
  pauseSessionTimer,
  startSessionTimer,
  test,
} from "../../fixtures";

test("starts, pauses, and resumes the session timer", async ({ page }) => {
  await openMapWithLocalSession(page);

  await startSessionTimer(page);
  await pauseSessionTimer(page);
  await expect(page.getByRole("button", { name: "Resume timer" })).toBeVisible();
});
