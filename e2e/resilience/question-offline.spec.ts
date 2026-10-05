import {
  clickToolDockButton,
  confirmInitialHidingZoneAtStation,
  expect,
  expectAskHud,
  expectPendingQuestionText,
  expectSendToHidersInViewport,
  goOffline,
  goOnline,
  listPendingQuestionIds,
  openChat,
  pendingSyncBadges,
  placeAskAnchor,
  readPersistedSessionId,
  readSyncStatusLabel,
  SEND_TO_HIDERS_IN_FLIGHT_BUTTON,
  selectFirstRadarDistance,
  sendToHidersButton,
  test,
} from "../fixtures";

test("question asked offline queues, then reaches the hider exactly once", async ({
  hostHider,
}) => {
  const { hostPage, guestPage, hostContext } = hostHider;
  const sessionId = await readPersistedSessionId(hostPage);

  await confirmInitialHidingZoneAtStation(guestPage, "Dublin Central");
  await expect.poll(() => readSyncStatusLabel(hostPage), { timeout: 15_000 }).toBe("Synced");

  await goOffline(hostContext);
  await expect.poll(() => readSyncStatusLabel(hostPage)).toMatch(/^Offline/);

  await test.step("send radar offline: controls free up without waiting for an ack", async () => {
    await clickToolDockButton(hostPage, "Radar");
    await expectAskHud(hostPage);
    await selectFirstRadarDistance(hostPage);
    await placeAskAnchor(hostPage);
    await expectSendToHidersInViewport(hostPage);
    await sendToHidersButton(hostPage).evaluate((el) => {
      if (el instanceof HTMLElement) el.click();
    });
    await expect(
      hostPage.getByRole("button", { name: SEND_TO_HIDERS_IN_FLIGHT_BUTTON }),
    ).toHaveCount(0, { timeout: 1_000 });
  });

  await test.step("row stays 'Waiting to send' while the link is down", async () => {
    await openChat(hostPage);
    // Badge only mounts after 1 s un-acked: seeing it proves setOffline cut the
    // emulator WebChannel (an open stream would ack in ~100 ms).
    await expect(pendingSyncBadges(hostPage).first()).toBeVisible({ timeout: 5_000 });
    expect(await listPendingQuestionIds(guestPage, sessionId)).toHaveLength(0);
  });

  await goOnline(hostContext);

  await expect(pendingSyncBadges(hostPage)).toHaveCount(0, { timeout: 5_000 });
  await expect
    .poll(() => listPendingQuestionIds(guestPage, sessionId), { timeout: 15_000 })
    .toHaveLength(1);
  await expectPendingQuestionText(guestPage, /Are you within/i);
});
