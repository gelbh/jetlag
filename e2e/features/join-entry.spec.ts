import {
  createHostSession,
  createMultiplayerContexts,
  dismissMapOnboarding,
  expect,
  test,
} from "../fixtures";

test("Join submit works", async ({ browser }) => {
  const { hostPage, guestPage, cleanup } = await createMultiplayerContexts(browser);

  const { code } = await createHostSession(hostPage);

  // Same path as joinAsRole, but click the SegmentedControl label (radios are hidden).
  await guestPage.goto("/join");
  await guestPage
    .getByRole("radiogroup", { name: "Player side" })
    .locator("label")
    .filter({ hasText: /^Seeker$/ })
    .click();
  await guestPage.getByPlaceholder("ABCD").fill(code);
  await guestPage.getByRole("button", { name: "Join session" }).click();
  await expect(guestPage.getByRole("button", { name: "Radar" })).toBeVisible({
    timeout: 15_000,
  });
  await dismissMapOnboarding(guestPage);

  await cleanup();
});
