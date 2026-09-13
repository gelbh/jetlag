import {
  test,
  expect,
  prepareE2EPage,
  enablePlayerUiMantine,
  seedPersistedLocalSessionOnHome,
} from "../fixtures";

test("Home Mantine smoke when flag on", async ({ page }) => {
  await prepareE2EPage(page);
  await enablePlayerUiMantine(page);
  await page.goto("/");
  await expect(page.getByText(/Mantine player UI/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /join/i })).toBeVisible();
});

test("Home Mantine continue navigates to map when flag on", async ({
  page,
}) => {
  await enablePlayerUiMantine(page);
  await seedPersistedLocalSessionOnHome(page, { code: "ABCD" });

  await expect(page.getByText(/Mantine player UI/i)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Return to map/i }),
  ).toBeVisible();

  await page.getByRole("button", { name: /Return to map/i }).click();
  await expect(page).toHaveURL(/\/map/, { timeout: 10_000 });
  await expect(page.getByRole("button", { name: "Radar" })).toBeVisible();
});
