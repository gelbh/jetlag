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
import { useRemoteSessionTimerSync } from "./useRemoteSessionTimerSync";

describe("useRemoteSessionTimerSync emulator", () => {
  beforeEach(async () => {
    await teardownEmulatorsForTests();
    await connectEmulatorsForTests();
  });

  it("mirrors host timer updates to guests", async () => {
    const { uid } = await connectEmulatorsForTests();
    const session = await createRemoteSession(DUBLIN_CITY_GAME_AREA, uid);

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
