import { beforeEach, describe, expect, it } from "vitest";
import { useSessionStore } from "./sessionStore";
import { createTestRemoteSession, createTestSession } from "../test/fixtures/sessions";
import { resetAllStores } from "../test/helpers/storeReset";

describe("sessionStore", () => {
  beforeEach(() => {
    resetAllStores();
  });

  it("sets and clears the active session", () => {
    const session = createTestSession();
    useSessionStore.getState().setSession(session);
    expect(useSessionStore.getState().session?.code).toBe("TEST");

    useSessionStore.getState().setSession(null);
    expect(useSessionStore.getState().session).toBeNull();
  });

  it("tracks pending write counters", () => {
    useSessionStore.getState().incrementPendingWrites();
    useSessionStore.getState().incrementPendingWrites();
    expect(useSessionStore.getState().pendingWrites).toBe(2);

    useSessionStore.getState().decrementPendingWrites();
    expect(useSessionStore.getState().pendingWrites).toBe(1);
  });

  it("updates game area on the active session", () => {
    useSessionStore.getState().setSession(createTestSession());
    const nextArea = createTestSession().gameArea;
    useSessionStore.getState().setGameArea(nextArea);
    expect(useSessionStore.getState().session?.gameArea).toEqual(nextArea);
  });

  it("stores sync error and remote update notices", () => {
    useSessionStore.getState().setLastSyncError("offline");
    useSessionStore.getState().setRemoteUpdateNotice("Updated remotely");

    expect(useSessionStore.getState().lastSyncError).toBe("offline");
    expect(useSessionStore.getState().remoteUpdateNotice).toBe(
      "Updated remotely",
    );
  });

  it("tracks sync in-flight counters without going negative", () => {
    useSessionStore.getState().incrementSyncInFlight();
    useSessionStore.getState().decrementSyncInFlight();
    useSessionStore.getState().decrementSyncInFlight();

    expect(useSessionStore.getState().syncInFlight).toBe(0);
  });

  it("persists remote session metadata", () => {
    const remote = createTestRemoteSession();
    useSessionStore.getState().setSession(remote);
    expect(useSessionStore.getState().session?.hostUid).toBe("user-host");
  });
});
