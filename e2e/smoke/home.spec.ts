import { test, expect, prepareE2EPage, openPlayHub } from "../fixtures";

test("@smoke landing page opens play hub with create and join actions", async ({
  page,
}) => {
  await prepareE2EPage(page);
  await page.goto("/");
  await openPlayHub(page);
  await expect(page.getByRole("link", { name: "Join session" })).toBeVisible();
});
