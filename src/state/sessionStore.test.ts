import { beforeEach, describe, expect, it } from "vitest";
import { createTestRemoteSession, createTestSession } from "../test/fixtures/sessions";
import { resetAllStores } from "../test/helpers/storeReset";
import { useSessionStore } from "./sessionStore";

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
    expect(useSessionStore.getState().remoteUpdateNotice).toBe("Updated remotely");
  });

  it("clears sync notices when switching sessions", () => {
    useSessionStore.getState().setSession(createTestSession({ id: "session-a" }));
    useSessionStore.getState().setRemoteUpdateNotice("Updated remotely");
    useSessionStore.getState().setLastSyncError("offline");

    useSessionStore.getState().setSession(createTestSession({ id: "session-b" }));

    expect(useSessionStore.getState().remoteUpdateNotice).toBeNull();
    expect(useSessionStore.getState().lastSyncError).toBeNull();
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

  it("skips setSession when sync fields are unchanged", () => {
    const session = createTestRemoteSession();
    useSessionStore.getState().setSession(session);
    const before = useSessionStore.getState();

    useSessionStore.getState().setSession({ ...session });

    expect(useSessionStore.getState()).toBe(before);
  });

  it("skips setSession when transitStationFilter arrays match by content", () => {
    const filterA: Array<"metro" | "tram"> = ["metro", "tram"];
    const filterB: Array<"metro" | "tram"> = ["metro", "tram"];
    expect(filterA).not.toBe(filterB);

    const session = createTestRemoteSession({ transitStationFilter: filterA });
    useSessionStore.getState().setSession(session);
    const before = useSessionStore.getState();

    useSessionStore.getState().setSession({ ...session, transitStationFilter: filterB });

    expect(useSessionStore.getState()).toBe(before);
  });

  it("updates session when timer fields change", () => {
    const session = createTestRemoteSession({
      timerAccumulatedMs: 1000,
      timerRunningSince: null,
    });
    useSessionStore.getState().setSession(session);

    useSessionStore.getState().setSession({
      ...session,
      timerAccumulatedMs: 2000,
    });

    expect(useSessionStore.getState().session?.timerAccumulatedMs).toBe(2000);
  });

  it("updates session when opsMitigation or hotfix gate fields change", () => {
    const session = createTestRemoteSession();
    useSessionStore.getState().setSession(session);

    useSessionStore.getState().setSession({
      ...session,
      opsMitigation: {
        id: "mit-1",
        type: "soft_reload",
        appliedAt: "2026-07-26T12:00:00.000Z",
        appliedByUid: "ops-1",
        incidentId: "inc-1",
      },
      requiredMinAppVersion: "0.10.1",
      requiredMinAppVersionSetAt: "2026-07-26T12:01:00.000Z",
      requiredMinAppVersionGraceSeconds: 60,
    });

    const next = useSessionStore.getState().session;
    expect(next?.opsMitigation?.id).toBe("mit-1");
    expect(next?.requiredMinAppVersion).toBe("0.10.1");
    expect(next?.requiredMinAppVersionGraceSeconds).toBe(60);
  });

  it.each([
    {
      label: "foundRequestedAt",
      patch: { foundRequestedAt: "2026-07-26T12:00:00.000Z" },
      read: (s: ReturnType<typeof useSessionStore.getState>["session"]) => s?.foundRequestedAt,
      expected: "2026-07-26T12:00:00.000Z",
    },
    {
      label: "foundConfirmedAt + gameOutcome",
      patch: {
        foundConfirmedAt: "2026-07-26T12:05:00.000Z",
        gameOutcome: "found" as const,
      },
      read: (s: ReturnType<typeof useSessionStore.getState>["session"]) => s?.gameOutcome,
      expected: "found",
    },
    {
      label: "gameResultId",
      patch: { gameResultId: "result-1" },
      read: (s: ReturnType<typeof useSessionStore.getState>["session"]) => s?.gameResultId,
      expected: "result-1",
    },
    {
      label: "sessionResetAt",
      patch: { sessionResetAt: "2026-07-26T13:00:00.000Z" },
      read: (s: ReturnType<typeof useSessionStore.getState>["session"]) => s?.sessionResetAt,
      expected: "2026-07-26T13:00:00.000Z",
    },
    {
      label: "gameAreaLabel",
      patch: { gameAreaLabel: "Dublin City" },
      read: (s: ReturnType<typeof useSessionStore.getState>["session"]) => s?.gameAreaLabel,
      expected: "Dublin City",
    },
    {
      label: "roundNumber",
      patch: { roundNumber: 2 },
      read: (s: ReturnType<typeof useSessionStore.getState>["session"]) => s?.roundNumber,
      expected: 2,
    },
    {
      label: "foundRequestedByUid",
      patch: { foundRequestedByUid: "seeker-1" },
      read: (s: ReturnType<typeof useSessionStore.getState>["session"]) => s?.foundRequestedByUid,
      expected: "seeker-1",
    },
    {
      label: "foundConfirmedByUid",
      patch: { foundConfirmedByUid: "hider-1" },
      read: (s: ReturnType<typeof useSessionStore.getState>["session"]) => s?.foundConfirmedByUid,
      expected: "hider-1",
    },
  ])("updates session when only $label changes", ({ patch, read, expected }) => {
    const session = createTestRemoteSession();
    useSessionStore.getState().setSession(session);

    useSessionStore.getState().setSession({
      ...session,
      ...patch,
    });

    expect(read(useSessionStore.getState().session)).toBe(expected);
  });

  it("persists heal secrets next to myUid and keeps them across uid drift", () => {
    useSessionStore.getState().setMyUid("uid-1");
    useSessionStore.getState().setHealSecret("session-a", "secret-a");
    useSessionStore.getState().setSession(createTestRemoteSession({ id: "session-a" }), "uid-2");

    expect(useSessionStore.getState().healSecrets).toEqual({ "session-a": "secret-a" });
    const persisted = useSessionStore.persist.getOptions().partialize?.(useSessionStore.getState());
    expect(persisted).toMatchObject({
      myUid: "uid-2",
      healSecrets: { "session-a": "secret-a" },
    });
  });

  it("keeps only the latest session's heal secret", () => {
    useSessionStore.getState().setHealSecret("session-a", "secret-a");
    useSessionStore.getState().setHealSecret("session-b", "secret-b");

    expect(useSessionStore.getState().healSecrets).toEqual({ "session-b": "secret-b" });
  });

  it("keeps heal secrets when the session is cleared", () => {
    useSessionStore.getState().setMyUid("uid-1");
    useSessionStore.getState().setHealSecret("session-a", "secret-a");
    useSessionStore.getState().setSession(null);

    expect(useSessionStore.getState().healSecrets).toEqual({ "session-a": "secret-a" });
  });

  it("clears heal secrets when myUid is cleared", () => {
    useSessionStore.getState().setMyUid("uid-1");
    useSessionStore.getState().setHealSecret("session-a", "secret-a");
    useSessionStore.getState().setMyUid(null);
    expect(useSessionStore.getState().healSecrets).toEqual({});

    useSessionStore.getState().setMyUid("uid-1");
    useSessionStore.getState().setHealSecret("session-a", "secret-a");
    useSessionStore.getState().setSession(createTestSession(), null);
    expect(useSessionStore.getState().healSecrets).toEqual({});
  });

  it("rehydrates persisted state saved before healSecrets existed", async () => {
    localStorage.setItem(
      "jetlag-session",
      JSON.stringify({ state: { session: null, myUid: "uid-old", myRole: null }, version: 0 }),
    );
    await useSessionStore.persist.rehydrate();

    expect(useSessionStore.getState().myUid).toBe("uid-old");
    expect(useSessionStore.getState().healSecrets).toEqual({});
    localStorage.removeItem("jetlag-session");
  });
});
