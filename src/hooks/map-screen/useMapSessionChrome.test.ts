import { FirebaseError } from "firebase/app";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnnotationRecord } from "../../domain/map/annotations";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import { useMapSessionChrome } from "./useMapSessionChrome";

const exitSession = vi.hoisted(() => vi.fn(async () => undefined));
const mockResetRemoteSession = vi.hoisted(() =>
  vi.fn(async () => "2026-01-02T00:00:00.000Z"),
);
const mockCancelWalkingThermometersAndAnnounce = vi.hoisted(() =>
  vi.fn(async () => undefined),
);
const mockDeletePlayerLocation = vi.hoisted(() =>
  vi.fn(async () => undefined),
);
const mockCaptureException = vi.hoisted(() => vi.fn());
const mockTrackSessionEnded = vi.hoisted(() => vi.fn());
const mockLeaveHostSession = vi.hoisted(() =>
  vi.fn(async (): Promise<
    { action: "ended" } | { action: "promoted"; newHostUid: string }
  > => ({ action: "ended" })),
);
const mockEndSession = vi.hoisted(() =>
  vi.fn(async () => {
    mockTrackSessionEnded("host_end");
  }),
);
const mockEndRemoteSession = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("../session/useSessionExit", () => ({
  useSessionExit: () => exitSession,
}));

vi.mock("../../services/core/firebase/firebase", () => ({
  ensureAnonymousUser: vi.fn(async () => ({ uid: "host-1" })),
}));

vi.mock("../../services/core/analytics/sentry", () => ({
  captureException: mockCaptureException,
}));

vi.mock("../../services/core/analytics/analytics", () => ({
  trackSessionEnded: mockTrackSessionEnded,
}));

vi.mock("../../services/session/sessionLifecycle", () => ({
  leaveHostSession: mockLeaveHostSession,
  endSession: mockEndSession,
}));

vi.mock("../../services/firestore/firestoreAnnotations", async () => {
  const actual = await vi.importActual<
    typeof import("../../services/firestore/firestoreAnnotations")
  >("../../services/firestore/firestoreAnnotations");
  return {
    ...actual,
    resetRemoteSession: mockResetRemoteSession,
    endRemoteSession: mockEndRemoteSession,
  };
});

vi.mock("../../services/firestore/firestoreSessionExtras", async () => {
  const actual = await vi.importActual<
    typeof import("../../services/firestore/firestoreSessionExtras")
  >("../../services/firestore/firestoreSessionExtras");
  return {
    ...actual,
    cancelWalkingThermometersAndAnnounce:
      mockCancelWalkingThermometersAndAnnounce,
    deletePlayerLocation: mockDeletePlayerLocation,
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
    mockCancelWalkingThermometersAndAnnounce.mockClear();
    mockDeletePlayerLocation.mockClear();
    mockCaptureException.mockClear();
    mockLeaveHostSession.mockClear();
    mockLeaveHostSession.mockResolvedValue({ action: "ended" });
    mockEndSession.mockClear();
    mockEndSession.mockImplementation(async () => {
      mockTrackSessionEnded("host_end");
    });
    mockEndRemoteSession.mockClear();
    mockTrackSessionEnded.mockClear();
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

  it("cancels walking thermometer questions before exitSession on leave", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const { result } = renderHook(() =>
      useMapSessionChrome({
        session: remoteSession,
        isHost: true,
        annotations: [],
        pendingQuestions: [
          {
            id: "pq-walk",
            sessionId: "session-remote",
            toolType: "thermometer",
            createdByUid: "host-1",
            createdAt: "2026-01-01T00:00:00.000Z",
            status: "walking",
            placement: { geometryJson: "{}", metadata: {} },
            replyOptions: [],
            promptText: "Thermometer walk started",
          },
        ],
        mapShellRef: { current: null },
        exportLegendRef: { current: null },
        clearAllAnnotations: vi.fn(async () => undefined),
        setSelectedAnnotationId: vi.fn(),
        closeSettingsPanel: vi.fn(),
        resetTimer: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleLeaveSession();
    });

    expect(window.confirm).toHaveBeenCalledWith(
      "You're the only player. Leaving will end this session.",
    );
    expect(mockLeaveHostSession).toHaveBeenCalledWith("session-remote");
    expect(mockCancelWalkingThermometersAndAnnounce).toHaveBeenCalledWith(
      "session-remote",
      ["pq-walk"],
      "host-1",
      "seeker",
      "left",
    );
    expect(mockDeletePlayerLocation).toHaveBeenCalledWith(
      "session-remote",
      "host-1",
    );
    expect(exitSession).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "leave", sessionId: "session-remote" }),
    );
  });

  it("still exits when thermometer cancel rejects on leave", async () => {
    const cancelError = new Error("network");
    mockCancelWalkingThermometersAndAnnounce.mockRejectedValueOnce(cancelError);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const { result } = renderHook(() =>
      useMapSessionChrome({
        session: remoteSession,
        isHost: true,
        annotations: [],
        pendingQuestions: [
          {
            id: "pq-walk",
            sessionId: "session-remote",
            toolType: "thermometer",
            createdByUid: "host-1",
            createdAt: "2026-01-01T00:00:00.000Z",
            status: "walking",
            placement: { geometryJson: "{}", metadata: {} },
            replyOptions: [],
            promptText: "Thermometer walk started",
          },
        ],
        mapShellRef: { current: null },
        exportLegendRef: { current: null },
        clearAllAnnotations: vi.fn(async () => undefined),
        setSelectedAnnotationId: vi.fn(),
        closeSettingsPanel: vi.fn(),
        resetTimer: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleLeaveSession();
    });

    expect(mockLeaveHostSession).toHaveBeenCalledWith("session-remote");
    expect(mockCaptureException).toHaveBeenCalledWith(cancelError);
    expect(mockDeletePlayerLocation).toHaveBeenCalledWith(
      "session-remote",
      "host-1",
    );
    expect(exitSession).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "leave", sessionId: "session-remote" }),
    );
  });

  it("calls endSession callable when host ends the session", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const { result } = renderHook(() =>
      useMapSessionChrome({
        session: remoteSession,
        isHost: true,
        annotations: [],
        mapShellRef: { current: null },
        exportLegendRef: { current: null },
        clearAllAnnotations: vi.fn(async () => undefined),
        setSelectedAnnotationId: vi.fn(),
        closeSettingsPanel: vi.fn(),
        resetTimer: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleEndSession();
    });

    expect(mockEndSession).toHaveBeenCalledWith("session-remote");
    expect(mockTrackSessionEnded).toHaveBeenCalledOnce();
    expect(mockTrackSessionEnded).toHaveBeenCalledWith("host_end");
    expect(exitSession).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "end", sessionId: "session-remote" }),
    );
  });

  it("tracks host_leave_ended when alone host leave ends the session", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const { result } = renderHook(() =>
      useMapSessionChrome({
        session: remoteSession,
        isHost: true,
        annotations: [],
        mapShellRef: { current: null },
        exportLegendRef: { current: null },
        clearAllAnnotations: vi.fn(async () => undefined),
        setSelectedAnnotationId: vi.fn(),
        closeSettingsPanel: vi.fn(),
        resetTimer: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleLeaveSession();
    });

    expect(mockLeaveHostSession).toHaveBeenCalledWith("session-remote");
    expect(mockTrackSessionEnded).toHaveBeenCalledOnce();
    expect(mockTrackSessionEnded).toHaveBeenCalledWith("host_leave_ended");
  });

  it("tracks fallback_client_end when host end falls back to client write", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockEndSession.mockRejectedValueOnce(new Error("functions unavailable"));

    const { result } = renderHook(() =>
      useMapSessionChrome({
        session: remoteSession,
        isHost: true,
        annotations: [],
        mapShellRef: { current: null },
        exportLegendRef: { current: null },
        clearAllAnnotations: vi.fn(async () => undefined),
        setSelectedAnnotationId: vi.fn(),
        closeSettingsPanel: vi.fn(),
        resetTimer: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleEndSession();
    });

    expect(mockEndRemoteSession).toHaveBeenCalledWith("session-remote");
    expect(mockTrackSessionEnded).toHaveBeenCalledOnce();
    expect(mockTrackSessionEnded).toHaveBeenCalledWith("fallback_client_end");
  });

  it("confirms promote copy when host leave has another player", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockLeaveHostSession.mockResolvedValueOnce({
      action: "promoted",
      newHostUid: "seeker-2",
    });

    const { result } = renderHook(() =>
      useMapSessionChrome({
        session: {
          ...remoteSession,
          memberUids: ["host-1", "seeker-2"],
          memberRoles: {
            "host-1": "seeker",
            "seeker-2": "seeker",
          },
        },
        isHost: true,
        annotations: [],
        mapShellRef: { current: null },
        exportLegendRef: { current: null },
        clearAllAnnotations: vi.fn(async () => undefined),
        setSelectedAnnotationId: vi.fn(),
        closeSettingsPanel: vi.fn(),
        resetTimer: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleLeaveSession();
    });

    expect(window.confirm).toHaveBeenCalledWith(
      "Another player will become host so others can keep playing. Leave anyway?",
    );
    expect(mockLeaveHostSession).toHaveBeenCalledWith("session-remote");
    expect(mockTrackSessionEnded).not.toHaveBeenCalled();
  });

  it("skips host leave callable when session hostUid is not the current user", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const { result } = renderHook(() =>
      useMapSessionChrome({
        session: {
          ...remoteSession,
          hostUid: "other-host",
          memberUids: ["other-host", "host-1"],
        },
        // Stale host chrome must not call leaveHostSession.
        isHost: true,
        annotations: [],
        mapShellRef: { current: null },
        exportLegendRef: { current: null },
        clearAllAnnotations: vi.fn(async () => undefined),
        setSelectedAnnotationId: vi.fn(),
        closeSettingsPanel: vi.fn(),
        resetTimer: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleLeaveSession();
    });

    expect(mockLeaveHostSession).not.toHaveBeenCalled();
    expect(window.confirm).toHaveBeenCalledWith(
      "Leave this session on this device? Other players can keep playing.",
    );
    expect(exitSession).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "leave", sessionId: "session-remote" }),
    );
  });

  it("continues local leave on expected host-only leave error without capturing", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    mockLeaveHostSession.mockRejectedValueOnce(
      new FirebaseError(
        "functions/permission-denied",
        "Only the host can do that.",
      ),
    );

    const { result } = renderHook(() =>
      useMapSessionChrome({
        session: {
          ...remoteSession,
          memberUids: ["host-1", "seeker-2"],
        },
        isHost: true,
        annotations: [],
        mapShellRef: { current: null },
        exportLegendRef: { current: null },
        clearAllAnnotations: vi.fn(async () => undefined),
        setSelectedAnnotationId: vi.fn(),
        closeSettingsPanel: vi.fn(),
        resetTimer: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleLeaveSession();
    });

    expect(mockCaptureException).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockTrackSessionEnded).toHaveBeenCalledOnce();
    expect(mockTrackSessionEnded).toHaveBeenCalledWith("expected_already_ended");
    expect(exitSession).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "leave", sessionId: "session-remote" }),
    );
  });

  it("continues local end on expected session-already-ended without capturing", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockEndSession.mockRejectedValueOnce(
      new FirebaseError(
        "functions/failed-precondition",
        "Session already ended.",
      ),
    );

    const { result } = renderHook(() =>
      useMapSessionChrome({
        session: remoteSession,
        isHost: true,
        annotations: [],
        mapShellRef: { current: null },
        exportLegendRef: { current: null },
        clearAllAnnotations: vi.fn(async () => undefined),
        setSelectedAnnotationId: vi.fn(),
        closeSettingsPanel: vi.fn(),
        resetTimer: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleEndSession();
    });

    expect(mockCaptureException).not.toHaveBeenCalled();
    expect(mockEndRemoteSession).not.toHaveBeenCalled();
    expect(mockTrackSessionEnded).toHaveBeenCalledOnce();
    expect(mockTrackSessionEnded).toHaveBeenCalledWith("expected_already_ended");
    expect(exitSession).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "end", sessionId: "session-remote" }),
    );
  });

  it("leaves a local session without calling ensureAnonymousUser", async () => {
    const { ensureAnonymousUser } = await import("../../services/core/firebase/firebase");
    const ensureSpy = vi.mocked(ensureAnonymousUser);
    ensureSpy.mockClear();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const { result } = renderHook(() =>
      useMapSessionChrome({
        session: {
          id: LOCAL_SESSION_ID,
          code: "WXYZ",
          gameArea: remoteSession.gameArea,
          createdAt: "2026-01-01T00:00:00.000Z",
          memberUids: ["host-1"],
        },
        isHost: true,
        annotations: [],
        mapShellRef: { current: null },
        exportLegendRef: { current: null },
        clearAllAnnotations: vi.fn(async () => undefined),
        setSelectedAnnotationId: vi.fn(),
        closeSettingsPanel: vi.fn(),
        resetTimer: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleLeaveSession();
    });

    expect(ensureSpy).not.toHaveBeenCalled();
    expect(mockLeaveHostSession).not.toHaveBeenCalled();
    expect(mockTrackSessionEnded).toHaveBeenCalledOnce();
    expect(mockTrackSessionEnded).toHaveBeenCalledWith("local");
    expect(exitSession).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "leave", sessionId: LOCAL_SESSION_ID }),
    );
  });

  it("skips endSession when session hostUid is not the current user", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const { result } = renderHook(() =>
      useMapSessionChrome({
        session: {
          ...remoteSession,
          hostUid: "other-host",
          memberUids: ["other-host", "host-1"],
        },
        isHost: true,
        annotations: [],
        mapShellRef: { current: null },
        exportLegendRef: { current: null },
        clearAllAnnotations: vi.fn(async () => undefined),
        setSelectedAnnotationId: vi.fn(),
        closeSettingsPanel: vi.fn(),
        resetTimer: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleEndSession();
    });

    expect(mockEndSession).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
    expect(exitSession).not.toHaveBeenCalled();
  });
});
