import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  exitSession,
  resetExitSessionGuardForTests,
} from "./sessionExit";

const navigate = vi.fn();
const teardownSessionUiState = vi.hoisted(() => vi.fn());
const clearSessionLocalArtifacts = vi.hoisted(() =>
  vi.fn(async () => undefined),
);
const setSession = vi.hoisted(() => vi.fn());
const setRemoteUpdateNotice = vi.hoisted(() => vi.fn());

vi.mock("./sessionCleanup", () => ({
  teardownSessionUiState,
  clearSessionLocalArtifacts,
}));

vi.mock("../../state/sessionStore", () => ({
  useSessionStore: {
    getState: () => ({
      setSession,
      setRemoteUpdateNotice,
    }),
  },
}));

describe("exitSession", () => {
  beforeEach(() => {
    resetExitSessionGuardForTests();
    navigate.mockReset();
    teardownSessionUiState.mockClear();
    clearSessionLocalArtifacts.mockClear();
    setSession.mockClear();
    setRemoteUpdateNotice.mockClear();
    Object.defineProperty(window, "location", {
      value: { pathname: "/map" },
      writable: true,
    });
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        media: "",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
  });

  it("navigates before teardown when leaving the map", async () => {
    const order: string[] = [];
    navigate.mockImplementation(() => {
      order.push("navigate");
    });
    teardownSessionUiState.mockImplementation(() => {
      order.push("teardown");
    });
    clearSessionLocalArtifacts.mockImplementation(async () => {
      order.push("clear");
    });

    await exitSession({
      reason: "leave",
      sessionId: "session-1",
      navigate: navigate as never,
      closeOverlays: () => order.push("close"),
    });

    expect(order[0]).toBe("close");
    expect(order[1]).toBe("navigate");
    expect(order).toContain("teardown");
    expect(setSession).toHaveBeenCalledWith(null);
  });

  it("skips navigation when already on the destination", async () => {
    Object.defineProperty(window, "location", {
      value: { pathname: "/" },
      writable: true,
    });

    await exitSession({
      reason: "reset",
      sessionId: "session-1",
      navigate: navigate as never,
      animate: false,
    });

    expect(navigate).not.toHaveBeenCalled();
    expect(teardownSessionUiState).toHaveBeenCalled();
    expect(setSession).toHaveBeenCalledWith(null);
  });
});
