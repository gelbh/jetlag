import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HidingZoneRecord } from "@/domain/session/hiding/hidingZone";
import { useWriteLedgerStore, type WriteLabel } from "@/state/writeLedgerStore";
import { LOCAL_SESSION_ID, type SessionRecord } from "../../domain/map/annotations";
import { useMapSessionActions } from "./useMapSessionActions";

vi.mock("../../services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => true,
}));

const confirmFoundHiderSessionMock = vi.hoisted(() => vi.fn());
const requestFoundHiderSessionMock = vi.hoisted(() => vi.fn());
const resetFoundHiderSessionMock = vi.hoisted(() => vi.fn());
const startEndGameSessionMock = vi.hoisted(() => vi.fn());
const clearEndGameRequestSessionMock = vi.hoisted(() => vi.fn());
const resetEndGameSessionMock = vi.hoisted(() => vi.fn());

vi.mock("../../services/firestore/firestoreAnnotations", () => ({
  clearEndGameRequestSession: clearEndGameRequestSessionMock,
  confirmFoundHiderSession: confirmFoundHiderSessionMock,
  requestEndGameSession: vi.fn(),
  requestFoundHiderSession: requestFoundHiderSessionMock,
  resetEndGameSession: resetEndGameSessionMock,
  resetFoundHiderSession: resetFoundHiderSessionMock,
  startEndGameSession: startEndGameSessionMock,
  updateSessionRules: vi.fn(),
}));

/** Offline: Firestore applies locally but the server ack never arrives. */
const never = () => new Promise<void>(() => {});

function ledgerEntries(): { label: WriteLabel; status: string }[] {
  return Object.values(useWriteLedgerStore.getState().entries).map(({ label, status }) => ({
    label,
    status,
  }));
}

const confirmedZone: HidingZoneRecord = {
  hiderUid: "hider-1",
  sessionId: "remote-session-1",
  stationId: "dublin-central",
  stationName: "Dublin Central",
  center: { lat: 53.35, lng: -6.26 },
  radiusMeters: 500,
  geometryJson: "{}",
  status: "confirmed",
  confirmedAt: "2026-01-01T00:00:00.000Z",
};

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
    vi.restoreAllMocks();
    for (const mock of [
      confirmFoundHiderSessionMock,
      requestFoundHiderSessionMock,
      resetFoundHiderSessionMock,
      startEndGameSessionMock,
      clearEndGameRequestSessionMock,
      resetEndGameSessionMock,
    ]) {
      mock.mockReset();
      mock.mockImplementation(never);
    }
    useWriteLedgerStore.setState({ entries: {} });
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
      expect.arrayContaining(["endGameStartedAt", "endGameStartedByUid", "endGameTruthAnchors"]),
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

  it("keeps found available while end game is active", () => {
    const confirmedZone = {
      hiderUid: "hider-1",
      sessionId: LOCAL_SESSION_ID,
      stationId: "dublin-central",
      stationName: "Dublin Central",
      center: { lat: 53.35, lng: -6.26 },
      radiusMeters: 500,
      geometryJson: "{}",
      status: "confirmed" as const,
      confirmedAt: "2026-01-01T00:00:00.000Z",
    };
    const endGameSession: SessionRecord = {
      ...baseSession,
      endGameStartedAt: "2026-01-01T00:30:00.000Z",
      endGameStartedByUid: "host-1",
      endGameTruthAnchors: {
        "hider-1": {
          lat: 53.35,
          lng: -6.26,
          frozenAt: "2026-01-01T00:30:00.000Z",
        },
      },
    };

    const { result } = renderHook(() =>
      useMapSessionActions({
        session: endGameSession,
        setSession: vi.fn(),
        uid: "host-1",
        myRole: "seeker",
        isRemote: false,
        gameRulesEditable: true,
        timerHasStarted: true,
        hidingZones: [confirmedZone],
      }),
    );

    expect(result.current.canRequestFoundHider).toBe(true);
    expect(result.current.canStartEndGame).toBe(false);
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

  describe("remote writes are fire-and-track", () => {
    const remoteSession: SessionRecord = {
      ...baseSession,
      id: "remote-session-1",
      memberUids: ["host-1", "hider-1"],
    };

    function renderRemote(session: SessionRecord, uid: string, setSession = vi.fn()) {
      return renderHook(() =>
        useMapSessionActions({
          session,
          setSession,
          uid,
          myRole: uid === "hider-1" ? "hider" : "seeker",
          isRemote: true,
          gameRulesEditable: false,
          timerHasStarted: true,
          hidingZones: [confirmedZone],
        }),
      );
    }

    it("starts End Game without waiting for the server ack", () => {
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
      vi.spyOn(window, "confirm").mockReturnValue(true);
      const { result } = renderRemote(remoteSession, "host-1");

      act(() => result.current.handleStartEndGame());

      expect(startEndGameSessionMock).toHaveBeenCalledWith(
        "remote-session-1",
        "host-1",
        expect.objectContaining({ "hider-1": expect.objectContaining({ lat: 53.35 }) }),
        expect.any(String),
      );
      expect(alertSpy).not.toHaveBeenCalled();
      expect(ledgerEntries()).toEqual([{ label: "endgame.start", status: "pending" }]);
    });

    it("declares found hider without waiting for the server ack", () => {
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
      vi.spyOn(window, "confirm").mockReturnValue(true);
      const { result } = renderRemote(remoteSession, "host-1");

      act(() => result.current.handleRequestFoundHider());

      expect(requestFoundHiderSessionMock).toHaveBeenCalledWith("remote-session-1", "host-1");
      expect(alertSpy).not.toHaveBeenCalled();
      expect(ledgerEntries()).toEqual([{ label: "found.request", status: "pending" }]);
    });

    it("confirms found hider without waiting for the server ack", () => {
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
      const { result } = renderRemote(
        {
          ...remoteSession,
          foundRequestedAt: "2026-01-01T01:00:00.000Z",
          foundRequestedByUid: "host-1",
        },
        "hider-1",
      );

      act(() => result.current.handleConfirmFoundHider());

      expect(confirmFoundHiderSessionMock).toHaveBeenCalledWith("remote-session-1", "hider-1");
      expect(alertSpy).not.toHaveBeenCalled();
      expect(ledgerEntries()).toEqual([{ label: "found.confirm", status: "pending" }]);
    });

    it("declines found hider optimistically without waiting for the server ack", () => {
      const setSession = vi.fn();
      const { result } = renderRemote(
        {
          ...remoteSession,
          foundRequestedAt: "2026-01-01T01:00:00.000Z",
          foundRequestedByUid: "host-1",
        },
        "hider-1",
        setSession,
      );

      act(() => result.current.handleDeclineFoundHider());

      expect(resetFoundHiderSessionMock).toHaveBeenCalledWith("remote-session-1");
      expect(setSession).toHaveBeenCalledWith(
        expect.objectContaining({ foundRequestedAt: undefined, foundRequestedByUid: undefined }),
        "hider-1",
      );
      expect(ledgerEntries()).toEqual([{ label: "found.decline", status: "pending" }]);
    });

    it("resets an active End Game without waiting for the server ack", () => {
      const setSession = vi.fn();
      const { result } = renderRemote(
        {
          ...remoteSession,
          endGameStartedAt: "2026-01-01T01:00:00.000Z",
          endGameStartedByUid: "host-1",
        },
        "host-1",
        setSession,
      );

      act(() => result.current.handleResetEndGame());

      expect(resetEndGameSessionMock).toHaveBeenCalledWith("remote-session-1");
      expect(clearEndGameRequestSessionMock).not.toHaveBeenCalled();
      expect(setSession).toHaveBeenCalledWith(
        expect.objectContaining({ endGameStartedAt: undefined }),
        "host-1",
      );
      expect(ledgerEntries()).toEqual([{ label: "endgame.reset", status: "pending" }]);
    });

    it("hands a rules rejection to the ledger instead of alerting", async () => {
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
      confirmFoundHiderSessionMock.mockRejectedValue(
        new Error("Missing or insufficient permissions."),
      );
      const { result } = renderRemote(
        {
          ...remoteSession,
          foundRequestedAt: "2026-01-01T01:00:00.000Z",
          foundRequestedByUid: "host-1",
        },
        "hider-1",
      );

      await act(async () => {
        result.current.handleConfirmFoundHider();
        await Promise.resolve();
      });

      expect(alertSpy).not.toHaveBeenCalled();
      expect(ledgerEntries()).toEqual([{ label: "found.confirm", status: "failed" }]);
    });
  });
});
