import {
  test,
  expect,
  prepareE2EPage,
  enablePlayerUiMantine,
} from "../fixtures";

test("Home Mantine smoke when flag on", async ({ page }) => {
  await prepareE2EPage(page);
  await enablePlayerUiMantine(page);
  await page.goto("/");
  await expect(page.getByText(/Mantine player UI/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /join/i })).toBeVisible();
});
