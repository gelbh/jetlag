import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  LOCAL_SESSION_ID,
  type SessionRecord,
} from "../../domain/map/annotations";
import { useMapSessionActions } from "./useMapSessionActions";

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

  it("requests end game locally for host sessions", async () => {
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
        endGameRequestedByUid: "host-1",
      }),
      "host-1",
    );
  });
});
