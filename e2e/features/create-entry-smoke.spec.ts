import {
  test,
  createSessionFromCreatePage,
  prepareE2EPage,
} from "../fixtures";

test("Create reaches map", async ({ page }) => {
  await prepareE2EPage(page);
  await createSessionFromCreatePage(page);
});
