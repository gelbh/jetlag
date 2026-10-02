import { expect, openPlayHub, prepareE2EPage, test } from "../fixtures";

test("@smoke landing page opens play hub with create and join actions", async ({ page }) => {
  await test.step("open home play hub", async () => {
    await prepareE2EPage(page);
    await page.goto("/");
    await openPlayHub(page);
  });

  await test.step("expose create and join entry points", async () => {
    await expect(page.getByRole("link", { name: "Create session" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Join session" })).toBeVisible();
  });
});
