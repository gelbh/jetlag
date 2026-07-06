import { test, expect } from "./fixtures";
import {
  createHostSession,
  createMultiplayerContexts,
  endSessionInEmulator,
  joinAsRole,
  openSettings,
  prepareE2EPage,
  readPersistedSessionId,
  seedPersistedLocalSessionOnHome,
} from "./fixtures";

test.describe("session lifecycle", () => {
  test("continues a local session from home", async ({ page }) => {
    await seedPersistedLocalSessionOnHome(page);
    await page.getByRole("button", { name: /Return to map/i }).click();
    await expect(page).toHaveURL(/\/map/, { timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Radar" })).toBeVisible();
  });

  test("continues a remote emulator session from home", async ({ browser }) => {
    const { hostPage, cleanup } = await createMultiplayerContexts(browser);
    await createHostSession(hostPage);

    await hostPage.goto("/");
    await hostPage.getByRole("button", { name: /Return to map/i }).click();
    await expect(hostPage).toHaveURL(/\/map/, { timeout: 10_000 });

    await cleanup();
  });

  test("shows an error for invalid join codes", async ({ page }) => {
    await prepareE2EPage(page);
    await page.goto("/join");
    await page.getByPlaceholder("ABCD").fill("ZZZZ");
    await page.getByRole("button", { name: "Join session" }).click();
    await expect(page.getByText(/No session found/i)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("redirects guest home when host ends the session", async ({
    browser,
  }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "seeker");

    hostPage.once("dialog", (dialog) => dialog.accept());
    await openSettings(hostPage);
    await hostPage.getByRole("tab", { name: "Session" }).click();
    await hostPage.getByRole("button", { name: "End session" }).click();

    await expect(guestPage).not.toHaveURL(/\/map/, { timeout: 20_000 });

    await cleanup();
  });

  test("create flow exposes role and game size pickers", async ({ page }) => {
    await prepareE2EPage(page);
    await page.goto("/create");
    await page.getByPlaceholder("Dublin, Ireland").fill("Dublin");
    await page.getByRole("button", { name: "Find place" }).click();
    await expect(page.getByText(/sq mi play area/i)).toBeVisible({
      timeout: 10_000,
    });

    await expect(page.getByRole("radio", { name: /^Seeker\b/ })).toBeVisible();
    await expect(page.getByRole("radio", { name: /^Hider\b/ })).toBeVisible();
    await expect(page.getByRole("radio", { name: /Small/i })).toBeVisible();
    await expect(page.getByRole("radio", { name: /Medium/i })).toBeVisible();
    await expect(page.getByRole("radio", { name: /Large/i })).toBeVisible();
  });

  test("continue shows error when persisted remote session has ended", async ({
    browser,
  }) => {
    const { hostPage, cleanup } = await createMultiplayerContexts(browser);
    await createHostSession(hostPage);
    const sessionId = await readPersistedSessionId(hostPage);

    await endSessionInEmulator(hostPage, sessionId);

    await hostPage.goto("/");
    await expect(
      hostPage.getByRole("button", { name: /Return to map/i }),
    ).toBeVisible();

    await hostPage.getByRole("button", { name: /Return to map/i }).click();
    await expect(hostPage.getByText(/has ended/i)).toBeVisible({
      timeout: 15_000,
    });

    await cleanup();
  });
});
