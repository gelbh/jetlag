import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useActiveThermometerWalk } from "./useActiveThermometerWalk";
import type { PendingQuestionRecord } from "../../domain/session/sessionChat";

const walkingQuestion: PendingQuestionRecord = {
  id: "pq-walk",
  sessionId: "session-1",
  toolType: "thermometer",
  createdByUid: "seeker-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  status: "walking",
  placement: {
    geometryJson: JSON.stringify({
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [-6.26, 53.35] },
    }),
    metadata: { thermometerDistanceMeters: 804 },
  },
  replyOptions: [],
  promptText: "Walking",
};

describe("useActiveThermometerWalk", () => {
  it("uses synced seeker location for the walking question author", () => {
    const { result } = renderHook(() =>
      useActiveThermometerWalk({
        pendingQuestions: [walkingQuestion],
        seekerLocations: [
          {
            uid: "seeker-1",
            sessionId: "session-1",
            lat: 53.36,
            lng: -6.25,
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        myUid: "hider-1",
        localLivePoint: null,
      }),
    );

    expect(result.current.start).toEqual([53.35, -6.26]);
    expect(result.current.livePoint).toEqual([53.36, -6.25]);
    expect(result.current.distanceTraveled).toBeGreaterThan(0);
  });

  it("prefers local GPS for the walking seeker", () => {
    const { result } = renderHook(() =>
      useActiveThermometerWalk({
        pendingQuestions: [walkingQuestion],
        seekerLocations: [],
        myUid: "seeker-1",
        localLivePoint: [53.351, -6.259],
      }),
    );

    expect(result.current.livePoint).toEqual([53.351, -6.259]);
  });

  it("exposes the target distance from walking question metadata", () => {
    const { result } = renderHook(() =>
      useActiveThermometerWalk({
        pendingQuestions: [walkingQuestion],
        seekerLocations: [],
        myUid: "seeker-1",
        localLivePoint: [53.351, -6.259],
      }),
    );

    expect(result.current.targetDistanceMeters).toBe(804);
  });
});
