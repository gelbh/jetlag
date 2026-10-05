import type { BrowserContext, Page } from "@playwright/test";
import {
  type BlockExternalAssetsOptions,
  createHostSession,
  expect,
  goOffline,
  prepareE2EPage,
  readE2EUid,
  readSyncStatusLabel,
  test,
  waitForServiceWorkerControl,
} from "../fixtures";

/** One online visit installs the SW; then reload with the network gone. Returns the pre-offline uid. */
async function coldStartOffline(
  page: Page,
  context: BrowserContext,
  network: BlockExternalAssetsOptions,
): Promise<string | null> {
  await prepareE2EPage(page, network);
  await createHostSession(page);
  await waitForServiceWorkerControl(page);
  await expect.poll(() => readSyncStatusLabel(page), { timeout: 15_000 }).toBe("Synced");
  const uid = await readE2EUid(page);

  await goOffline(context);
  await page.reload();
  await expect(page.getByRole("button", { name: "Radar" })).toBeVisible({ timeout: 30_000 });
  return uid;
}

test("offline cold start renders the shell and cached session, not a blocker page", async ({
  page,
  context,
}) => {
  const uidBefore = await coldStartOffline(page, context);

  await expect(page.getByText("Content blocker detected")).toHaveCount(0);
  // Offline map mount must reuse the persisted anonymous user, not mint a new one.
  expect(await readE2EUid(page)).toBe(uidBefore);
});

// fixme: useEnsureSessionMembership heal calls getDocFromServer offline -> 'client is offline' -> lastSyncError
test.fixme("offline cold start sync chip reads Offline, not Sync issue", async ({
  page,
  context,
}) => {
  await coldStartOffline(page, context);
  // resolveSyncStatus ranks offline above stale, so the chip reads "Offline".
  await expect.poll(() => readSyncStatusLabel(page)).toMatch(/^Offline/);
});
