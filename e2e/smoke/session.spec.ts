import {
  createHostSession,
  createMultiplayerContexts,
  dismissMapOnboarding,
  expect,
  expectCreatePageMapPreviewLoaded,
  joinAsRole,
  openPlayHub,
  prepareE2EPage,
  test,
} from "../fixtures";

test("@smoke creates a session from home and reaches the map", async ({ page }) => {
  await test.step("open create flow from home", async () => {
    await prepareE2EPage(page);
    await page.goto("/");
    await openPlayHub(page);
    await page.getByRole("link", { name: "Create session" }).click();
  });

  await test.step("confirm Dublin game area", async () => {
    await page.getByPlaceholder("Dublin, Ireland").fill("Dublin");
    await page.getByRole("button", { name: "Find place" }).click();
    await expect(page.getByText(/sq mi play area/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expectCreatePageMapPreviewLoaded(page);
    await page.getByRole("button", { name: "Confirm game area" }).click();
  });

  await test.step("land on map with seeker chrome", async () => {
    await expect(page).toHaveURL(/\/map/, { timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Radar" })).toBeVisible({
      timeout: 15_000,
    });
    await dismissMapOnboarding(page);
  });
});

test("@smoke host and guest join the same emulator session", async ({ browser }) => {
  test.setTimeout(90_000);
  const { hostPage, guestPage, cleanup } = await createMultiplayerContexts(browser);

  try {
    await test.step("host creates as seeker; guest joins as hider", async () => {
      // Same-role join needs a role passcode; use opposite roles for smoke.
      const { code } = await createHostSession(hostPage);
      await joinAsRole(guestPage, code, "hider");
    });

    await test.step("guest sees map chrome", async () => {
      await expect(
        guestPage.getByRole("button", {
          name: /Set zone|Change zone|Play move/i,
        }),
      ).toBeVisible({ timeout: 15_000 });
    });
  } finally {
    await cleanup();
  }
});
