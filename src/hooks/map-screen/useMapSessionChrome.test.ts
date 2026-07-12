import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnnotationRecord } from "../../domain/map/annotations";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import { useMapSessionChrome } from "./useMapSessionChrome";

const exitSession = vi.hoisted(() => vi.fn(async () => undefined));
const mockResetRemoteSession = vi.hoisted(() =>
  vi.fn(async () => "2026-01-02T00:00:00.000Z"),
);

vi.mock("../session/useSessionExit", () => ({
  useSessionExit: () => exitSession,
}));

vi.mock("../../services/core/firebase", () => ({
  ensureAnonymousUser: vi.fn(async () => ({ uid: "host-1" })),
}));

vi.mock("../../services/firestore/firestoreAnnotations", async () => {
  const actual = await vi.importActual<
    typeof import("../../services/firestore/firestoreAnnotations")
  >("../../services/firestore/firestoreAnnotations");
  return {
    ...actual,
    resetRemoteSession: mockResetRemoteSession,
  };
});

vi.mock("../../services/session/sessionCleanup", async () => {
  const actual = await vi.importActual<
    typeof import("../../services/session/sessionCleanup")
  >("../../services/session/sessionCleanup");
  return {
    ...actual,
    clearSessionLocalArtifacts: vi.fn(async () => undefined),
    teardownSessionUiState: vi.fn(),
  };
});

vi.mock("../../state/sessionStore", () => ({
  useSessionStore: vi.fn((selector: (state: { setSession: ReturnType<typeof vi.fn> }) => unknown) =>
    selector({ setSession: vi.fn() }),
  ),
}));

const activePin: AnnotationRecord = {
  id: "ann-1",
  sessionId: LOCAL_SESSION_ID,
  type: "pin",
  status: "active",
  geometry: {
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates: [-6.26, 53.35] },
  },
  metadata: { createdAt: "2026-01-01T00:00:00.000Z" },
};

const remoteSession = {
  id: "session-remote",
  code: "ABCD",
  gameArea: {
    type: "Polygon" as const,
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ],
    ],
  },
  createdAt: "2026-01-01T00:00:00.000Z",
  memberUids: ["host-1"],
  hostUid: "host-1",
  memberRoles: { "host-1": "seeker" as const },
};

describe("useMapSessionChrome", () => {
  beforeEach(() => {
    exitSession.mockClear();
    mockResetRemoteSession.mockClear();
  });

  it("does not clear the map while end game is active", () => {
    const clearAllAnnotations = vi.fn();
    vi.spyOn(window, "confirm");

    const { result } = renderHook(() =>
      useMapSessionChrome({
        session: {
          id: LOCAL_SESSION_ID,
          code: "WXYZ",
          gameArea: activePin.geometry.geometry as never,
          createdAt: "2026-01-01T00:00:00.000Z",
          memberUids: ["host-1"],
        },
        isHost: true,
        annotations: [activePin],
        mapShellRef: { current: null },
        exportLegendRef: { current: null },
        clearAllAnnotations,
        setSelectedAnnotationId: vi.fn(),
        closeSettingsPanel: vi.fn(),
        resetTimer: vi.fn(),
        endGameBlocked: true,
      }),
    );

    act(() => {
      result.current.handleClearMap();
    });

    expect(window.confirm).not.toHaveBeenCalled();
    expect(clearAllAnnotations).not.toHaveBeenCalled();
  });

  it("clears annotations after confirmation", () => {
    const clearAllAnnotations = vi.fn(async () => undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const { result } = renderHook(() =>
      useMapSessionChrome({
        session: {
          id: LOCAL_SESSION_ID,
          code: "WXYZ",
          gameArea: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 0],
              ],
            ],
          },
          createdAt: "2026-01-01T00:00:00.000Z",
          memberUids: ["host-1"],
        },
        isHost: true,
        annotations: [activePin],
        mapShellRef: { current: null },
        exportLegendRef: { current: null },
        clearAllAnnotations,
        setSelectedAnnotationId: vi.fn(),
        closeSettingsPanel: vi.fn(),
        resetTimer: vi.fn(),
      }),
    );

    act(() => {
      result.current.handleClearMap();
    });

    expect(clearAllAnnotations).toHaveBeenCalled();
  });

  it("resets the remote session after confirmation", async () => {
    const clearAllAnnotations = vi.fn(async () => undefined);
    const resetTimer = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const { result } = renderHook(() =>
      useMapSessionChrome({
        session: remoteSession,
        isHost: true,
        annotations: [activePin],
        mapShellRef: { current: null },
        exportLegendRef: { current: null },
        clearAllAnnotations,
        setSelectedAnnotationId: vi.fn(),
        closeSettingsPanel: vi.fn(),
        resetTimer,
      }),
    );

    await act(async () => {
      await result.current.handleResetSession();
    });

    await waitFor(() => {
      expect(mockResetRemoteSession).toHaveBeenCalledWith(
        "session-remote",
        "host-1",
        "seeker",
      );
    });
    expect(resetTimer).toHaveBeenCalled();
    expect(clearAllAnnotations).toHaveBeenCalled();
  });

  it("alerts when resetRemoteSession fails", async () => {
    mockResetRemoteSession.mockRejectedValueOnce(new Error("network"));
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const { result } = renderHook(() =>
      useMapSessionChrome({
        session: remoteSession,
        isHost: true,
        annotations: [activePin],
        mapShellRef: { current: null },
        exportLegendRef: { current: null },
        clearAllAnnotations: vi.fn(async () => undefined),
        setSelectedAnnotationId: vi.fn(),
        closeSettingsPanel: vi.fn(),
        resetTimer: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleResetSession();
    });

    expect(alertSpy).toHaveBeenCalled();
  });
});
