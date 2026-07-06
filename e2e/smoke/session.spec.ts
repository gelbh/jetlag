import { test, expect } from "../fixtures";
import {
  createHostSession,
  createMultiplayerContexts,
  joinAsRole,
  prepareE2EPage,
} from "../fixtures";

test("@smoke creates a session from home and reaches the map", async ({
  page,
}) => {
  await prepareE2EPage(page);
  await page.goto("/");
  await page.getByRole("link", { name: "Create session" }).click();
  await page.getByPlaceholder("Dublin, Ireland").fill("Dublin");
  await page.getByRole("button", { name: "Find place" }).click();
  await expect(page.getByText(/sq mi play area/i).first()).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("button", { name: "Confirm game area" }).click();
  await expect(page).toHaveURL(/\/map/, { timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Radar" })).toBeVisible();
});

test("@smoke host and guest join the same emulator session", async ({
  browser,
}) => {
  const { hostPage, guestPage, cleanup } =
    await createMultiplayerContexts(browser);

  const { code } = await createHostSession(hostPage);
  await joinAsRole(guestPage, code, "seeker");

  await expect(guestPage.getByRole("button", { name: "Radar" })).toBeVisible({
    timeout: 15_000,
  });

  await cleanup();
});
