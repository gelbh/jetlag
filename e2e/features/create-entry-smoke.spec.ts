import { createSessionFromCreatePage, expect, prepareE2EPage, test } from "../fixtures";

test("Create reaches map", async ({ page }) => {
  await prepareE2EPage(page);
  await createSessionFromCreatePage(page);
  await expect(page).toHaveURL(/\/map/);
});
