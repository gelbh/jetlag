import {
  test,
  expect,
  prepareE2EPage,
  seedPersistedLocalSessionOnHome,
} from "../fixtures";

test("Home Mantine smoke", async ({ page }) => {
  await prepareE2EPage(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Play - create, join, or custom game/i }),
  ).toBeVisible();
  await expect(
    page.locator('[data-player-ux-world="mantine"]').first(),
  ).toBeVisible();
});

test("Home Mantine continue navigates to map", async ({ page }) => {
  await seedPersistedLocalSessionOnHome(page, { code: "ABCD" });

  await expect(
    page.locator('[data-player-ux-world="mantine"]').first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Return to map/i }),
  ).toBeVisible();

  await page.getByRole("button", { name: /Return to map/i }).click();
  await expect(page).toHaveURL(/\/map/, { timeout: 10_000 });
  await expect(page.getByRole("button", { name: "Radar" })).toBeVisible();
});
