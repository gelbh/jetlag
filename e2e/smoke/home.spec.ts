import { test, expect } from "../fixtures";

test("@smoke landing page shows create and join actions", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Create session" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Join session" })).toBeVisible();
});
