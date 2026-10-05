// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  computeElapsedMs,
  INITIAL_TIMER_STATE,
  startTimer,
} from "../../domain/session/timer/timer";
import {
  recordClockSample,
  resetServerClockForTests,
  serverNow,
} from "../../services/core/time/serverClock";
import {
  createRemoteSession,
  updateSessionTimer,
} from "../../services/firestore/firestoreAnnotations";
import { useSessionStore } from "../../state/sessionStore";
import {
  connectEmulatorsForTests,
  teardownEmulatorsForTests,
} from "../../test/emulator/connectEmulators";
import { DUBLIN_CITY_GAME_AREA } from "../../test/fixtures/dublinGameArea";
import { useRemoteSessionTimerSync } from "./useRemoteSessionTimerSync";
import { useSessionSync } from "./useSessionSync";
import { useSessionTimer } from "./useSessionTimer";

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

    resetServerClockForTests();

    await teardownEmulatorsForTests();
    ({ uid: testUid } = await connectEmulatorsForTests());
  });

  afterEach(() => {
    localStorage.clear();
    resetServerClockForTests();
  });

  it("mirrors host timer updates to guests", async () => {
    const session = await createRemoteSession(DUBLIN_CITY_GAME_AREA, testUid);

    useSessionStore.getState().setSession(session, testUid);
    renderHook(() => useSessionSync());

    const host = renderHook(() => useRemoteSessionTimerSync(session.id, true));
    const guest = renderHook(() => useRemoteSessionTimerSync(session.id, false));

    const running = startTimer(INITIAL_TIMER_STATE);
    host.result.current.onControl?.(running);
    await updateSessionTimer(session.id, running);

    await waitFor(() => {
      expect(guest.result.current.remoteState?.runningSince).toBe(running.runningSince);
    });
  });

  it("writes the host start in server time when the host clock is fast", async () => {
    const hostSkewMs = 300_000;
    const t = Date.now();
    // Device clock 5 min ahead of the server: server reads t - skew at our midpoint t + 20.
    recordClockSample({ sentAtMs: t, receivedAtMs: t + 40, serverMs: t + 20 - hostSkewMs });

    const session = await createRemoteSession(DUBLIN_CITY_GAME_AREA, testUid);
    useSessionStore.getState().setSession(session, testUid);
    renderHook(() => useSessionSync());

    const hostSync = renderHook(() => useRemoteSessionTimerSync(session.id, true));
    const guest = renderHook(() => useRemoteSessionTimerSync(session.id, false));
    const hostTimer = renderHook(() =>
      useSessionTimer(session.id, { onControl: hostSync.result.current.onControl }),
    );

    act(() => {
      hostTimer.result.current.start();
    });

    await waitFor(() => {
      expect(typeof guest.result.current.remoteState?.runningSince).toBe("number");
    });
    const remote = guest.result.current.remoteState;
    if (!remote?.runningSince) throw new Error("guest never saw the running timer");

    expect(Math.abs(remote.runningSince - serverNow())).toBeLessThan(5_000);
    expect(Date.now() - remote.runningSince).toBeGreaterThan(hostSkewMs - 5_000);
    expect(computeElapsedMs(remote, serverNow())).toBeLessThan(5_000);
  });
});
