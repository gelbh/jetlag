import { test, expect, prepareE2EPage } from "../fixtures";

test("@smoke landing page shows create and join actions", async ({ page }) => {
  await prepareE2EPage(page);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Create session" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Join session" })).toBeVisible();
});
