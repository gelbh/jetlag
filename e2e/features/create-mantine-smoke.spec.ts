import {
  test,
  createSessionFromCreatePage,
  enablePlayerUiMantine,
  prepareE2EPage,
} from "../fixtures";

test("Create reaches map with Mantine flag on", async ({ page }) => {
  await prepareE2EPage(page);
  await enablePlayerUiMantine(page);
  await createSessionFromCreatePage(page);
});
