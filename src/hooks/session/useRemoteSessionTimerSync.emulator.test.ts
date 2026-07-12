// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { updateSessionTimer } from "../../services/firestore/firestoreAnnotations";
import {
  connectEmulatorsForTests,
  teardownEmulatorsForTests,
} from "../../test/emulator/connectEmulators";
import { DUBLIN_CITY_GAME_AREA } from "../../test/fixtures/dublinGameArea";
import { createRemoteSession } from "../../services/firestore/firestoreAnnotations";
import { startTimer, INITIAL_TIMER_STATE } from "../../domain/session/timer";
import { useSessionStore } from "../../state/sessionStore";
import { useRemoteSessionTimerSync } from "./useRemoteSessionTimerSync";
import { useSessionSync } from "./useSessionSync";

describe("useRemoteSessionTimerSync emulator", () => {
  let testUid: string;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    useSessionStore.setState({
      session: null,
      pendingWrites: 0,
      syncInFlight: 0,
      lastSyncError: null,
      remoteUpdateNotice: null,
    });

    await teardownEmulatorsForTests();
    ({ uid: testUid } = await connectEmulatorsForTests());
  });

  it("mirrors host timer updates to guests", async () => {
    const session = await createRemoteSession(DUBLIN_CITY_GAME_AREA, testUid);

    useSessionStore.getState().setSession(session, testUid);
    renderHook(() => useSessionSync());

    const host = renderHook(() =>
      useRemoteSessionTimerSync(session.id, true),
    );
    const guest = renderHook(() =>
      useRemoteSessionTimerSync(session.id, false),
    );

    const running = startTimer(INITIAL_TIMER_STATE);
    host.result.current.onControl?.(running);
    await updateSessionTimer(session.id, running);

    await waitFor(() => {
      expect(guest.result.current.remoteState?.runningSince).toBe(
        running.runningSince,
      );
    });
  });
});
