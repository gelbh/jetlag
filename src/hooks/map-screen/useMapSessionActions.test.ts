import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LOCAL_SESSION_ID,
  type SessionRecord,
} from "../../domain/map/annotations";
import { useMapSessionActions } from "./useMapSessionActions";

vi.mock("../../services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => true,
}));

const confirmFoundHiderSessionMock = vi.hoisted(() => vi.fn());
const requestFoundHiderSessionMock = vi.hoisted(() => vi.fn());
const resetFoundHiderSessionMock = vi.hoisted(() => vi.fn());

vi.mock("../../services/firestore/firestoreAnnotations", () => ({
  clearEndGameRequestSession: vi.fn(),
  confirmFoundHiderSession: confirmFoundHiderSessionMock,
  requestEndGameSession: vi.fn(),
  requestFoundHiderSession: requestFoundHiderSessionMock,
  resetEndGameSession: vi.fn(),
  resetFoundHiderSession: resetFoundHiderSessionMock,
  updateSessionRules: vi.fn(),
}));

const baseSession: SessionRecord = {
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
  gameSize: "medium",
};

describe("useMapSessionActions", () => {
  beforeEach(() => {
    confirmFoundHiderSessionMock.mockReset();
    requestFoundHiderSessionMock.mockReset();
    resetFoundHiderSessionMock.mockReset();
  });

  it("blocks end game until a hiding zone is confirmed", () => {
    const { result } = renderHook(() =>
      useMapSessionActions({
        session: baseSession,
        setSession: vi.fn(),
        uid: "host-1",
        myRole: "seeker",
        isRemote: false,
        gameRulesEditable: true,
        timerHasStarted: true,
        hidingZones: [],
      }),
    );

    expect(result.current.canStartEndGame).toBe(false);
  });

  it("starts end game locally for host sessions without hider accept", async () => {
    const setSession = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const { result } = renderHook(() =>
      useMapSessionActions({
        session: baseSession,
        setSession,
        uid: "host-1",
        myRole: "seeker",
        isRemote: false,
        gameRulesEditable: true,
        timerHasStarted: true,
        hidingZones: [
          {
            hiderUid: "hider-1",
            sessionId: LOCAL_SESSION_ID,
            stationId: "dublin-central",
            stationName: "Dublin Central",
            center: { lat: 53.35, lng: -6.26 },
            radiusMeters: 500,
            geometryJson: "{}",
            status: "confirmed",
            confirmedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      }),
    );

    await act(async () => {
      await result.current.handleStartEndGame();
    });

    expect(setSession).toHaveBeenCalledWith(
      expect.objectContaining({
        endGameStartedByUid: "host-1",
        endGameTruthAnchors: expect.objectContaining({
          "hider-1": expect.objectContaining({
            lat: 53.35,
            lng: -6.26,
          }),
        }),
      }),
      "host-1",
    );
    const next = setSession.mock.calls[0]?.[0] as SessionRecord;
    expect(next.endGameRequestedAt).toBeUndefined();
    expect(next.endGameRequestedByUid).toBeUndefined();
  });

  it("does not clear annotations when starting end game locally", async () => {
    const setSession = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const sessionWithZones = {
      ...baseSession,
      memberUids: ["host-1", "hider-1"],
    };

    const { result } = renderHook(() =>
      useMapSessionActions({
        session: sessionWithZones,
        setSession,
        uid: "host-1",
        myRole: "seeker",
        isRemote: false,
        gameRulesEditable: true,
        timerHasStarted: true,
        hidingZones: [
          {
            hiderUid: "hider-1",
            sessionId: LOCAL_SESSION_ID,
            stationId: "dublin-central",
            stationName: "Dublin Central",
            center: { lat: 53.35, lng: -6.26 },
            radiusMeters: 500,
            geometryJson: "{}",
            status: "confirmed",
            confirmedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      }),
    );

    await act(async () => {
      await result.current.handleStartEndGame();
    });

    const next = setSession.mock.calls[0]?.[0] as SessionRecord;
    expect(Object.keys(next).sort()).toEqual(
      expect.arrayContaining([
        "endGameStartedAt",
        "endGameStartedByUid",
        "endGameTruthAnchors",
      ]),
    );
    expect(next).not.toHaveProperty("annotations");
  });

  it("blocks found hider until a hiding zone is confirmed", () => {
    const { result } = renderHook(() =>
      useMapSessionActions({
        session: baseSession,
        setSession: vi.fn(),
        uid: "host-1",
        myRole: "seeker",
        isRemote: false,
        gameRulesEditable: true,
        timerHasStarted: true,
        hidingZones: [],
      }),
    );

    expect(result.current.canRequestFoundHider).toBe(false);
  });

  it("requests found hider locally for host sessions", async () => {
    const setSession = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const { result } = renderHook(() =>
      useMapSessionActions({
        session: baseSession,
        setSession,
        uid: "host-1",
        myRole: "seeker",
        isRemote: false,
        gameRulesEditable: true,
        timerHasStarted: true,
        hidingZones: [
          {
            hiderUid: "hider-1",
            sessionId: LOCAL_SESSION_ID,
            stationId: "dublin-central",
            stationName: "Dublin Central",
            center: { lat: 53.35, lng: -6.26 },
            radiusMeters: 500,
            geometryJson: "{}",
            status: "confirmed",
            confirmedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      }),
    );

    await act(async () => {
      await result.current.handleRequestFoundHider();
    });

    expect(setSession).toHaveBeenCalledWith(
      expect.objectContaining({
        foundRequestedByUid: "host-1",
      }),
      "host-1",
    );
  });

  it("alerts when remote found confirm fails instead of rejecting", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    confirmFoundHiderSessionMock.mockRejectedValue(
      new Error("Missing or insufficient permissions."),
    );

    const pendingSession: SessionRecord = {
      ...baseSession,
      id: "remote-session-1",
      memberUids: ["host-1", "hider-1"],
      foundRequestedAt: "2026-01-01T01:00:00.000Z",
      foundRequestedByUid: "host-1",
    };

    const { result } = renderHook(() =>
      useMapSessionActions({
        session: pendingSession,
        setSession: vi.fn(),
        uid: "hider-1",
        myRole: "hider",
        isRemote: true,
        gameRulesEditable: false,
        timerHasStarted: true,
        hidingZones: [
          {
            hiderUid: "hider-1",
            sessionId: "remote-session-1",
            stationId: "dublin-central",
            stationName: "Dublin Central",
            center: { lat: 53.35, lng: -6.26 },
            radiusMeters: 500,
            geometryJson: "{}",
            status: "confirmed",
            confirmedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      }),
    );

    await act(async () => {
      await result.current.handleConfirmFoundHider();
    });

    expect(confirmFoundHiderSessionMock).toHaveBeenCalledWith(
      "remote-session-1",
      "hider-1",
    );
    expect(alertSpy).toHaveBeenCalledWith(
      "Could not confirm found hider. Check your connection and try again.",
    );
  });
});
