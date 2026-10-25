import {
  createHostSession,
  createMultiplayerContexts,
  expect,
  joinAsRole,
  test,
} from "../fixtures";

test("Join submit works", async ({ browser }) => {
  const { hostPage, guestPage, cleanup } = await createMultiplayerContexts(browser);

  const { code } = await createHostSession(hostPage);

  await joinAsRole(guestPage, code, "seeker");

  await cleanup();
});
