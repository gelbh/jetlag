import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestRemoteSession } from "../../test/fixtures/sessions";
import { resetAllStores } from "../../test/helpers/storeReset";
import { useTimerStore } from "../../state/timerStore";
import { useGameOverActions } from "./useGameOverActions";

const resetSessionForRematch = vi.hoisted(() => vi.fn(async () => undefined));
const teardownSessionUiState = vi.hoisted(() => vi.fn());
const blockPlayerLocationPublishes = vi.hoisted(() => vi.fn());
const allowPlayerLocationPublishes = vi.hoisted(() => vi.fn());
const clearLiveLocationOnLeave = vi.hoisted(() => vi.fn(async () => undefined));
const ensureAnonymousUser = vi.hoisted(() =>
  vi.fn(async () => ({ uid: "user-1" })),
);
const exitSession = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("../../services/session/sessionRematch", () => ({
  resetSessionForRematch,
}));

vi.mock("../../services/session/sessionCleanup", () => ({
  teardownSessionUiState,
}));

vi.mock("../../services/session/playerLocationPublishGate", () => ({
  blockPlayerLocationPublishes,
  allowPlayerLocationPublishes,
}));

vi.mock("../../services/session/clearLiveLocationOnLeave", () => ({
  clearLiveLocationOnLeave,
}));

vi.mock("../../services/core/firebase/firebase", () => ({
  ensureAnonymousUser,
  isFirebaseConfigured: () => false,
}));

vi.mock("../session/useSessionExit", () => ({
  useSessionExit: () => exitSession,
}));

vi.mock("./useGameOver", () => ({
  useGameOver: () => ({
    result: null,
    loading: false,
    roundComplete: true,
  }),
}));

describe("useGameOverActions", () => {
  beforeEach(() => {
    resetAllStores();
    vi.clearAllMocks();
    resetSessionForRematch.mockResolvedValue(undefined);
    useTimerStore.setState({
      bySessionId: {
        "remote-session-1": {
          accumulatedMs: 12_000,
          runningSince: null,
        },
      },
    });
  });

  it("tears down UI and clears the timer after a successful rematch", async () => {
    const session = createTestRemoteSession({
      foundConfirmedAt: "2026-01-01T01:00:00.000Z",
      gameOutcome: "found",
    });
    const clearTimer = vi.spyOn(useTimerStore.getState(), "clearTimer");
    const closeSheet = vi.fn();

    const { result } = renderHook(() =>
      useGameOverActions(session, { closeSheet }),
    );

    await act(async () => {
      await result.current.handleRematch();
    });

    expect(resetSessionForRematch).toHaveBeenCalledWith("remote-session-1");
    expect(teardownSessionUiState).toHaveBeenCalledTimes(1);
    expect(clearTimer).toHaveBeenCalledWith("remote-session-1");
    expect(blockPlayerLocationPublishes).not.toHaveBeenCalled();
    expect(result.current.rematchError).toBeNull();
  });
});
