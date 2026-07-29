import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestGameArea } from "../../test/fixtures/sessions";
import type { HidingZoneRecord } from "../../domain/session/hiding/hidingZone";
import { useHiderZoneTool } from "./useHiderZoneTool";

const writeHidingZone = vi.hoisted(() => vi.fn());

vi.mock("../../services/firestore/firestoreSessionExtras", () => ({
  writeHidingZone,
}));

vi.mock("../../services/geo/matching", () => ({
  fetchTransitStationsForHidingZoneViewport: vi.fn(async () => []),
}));

const existingZone: HidingZoneRecord = {
  hiderUid: "hider-1",
  sessionId: "session-1",
  stationId: "station-1",
  stationName: "Central",
  center: { lat: 53.35, lng: -6.26 },
  radiusMeters: 200,
  geometryJson: "{}",
  status: "confirmed",
  confirmedAt: "2026-07-26T10:00:00.000Z",
};

describe("useHiderZoneTool", () => {
  beforeEach(() => {
    writeHidingZone.mockReset();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("resumes the timer when Play Move fails after pause", async () => {
    writeHidingZone.mockRejectedValueOnce(new Error("write failed"));
    const pauseTimer = vi.fn();
    const resumeTimer = vi.fn();
    const postSystemMessage = vi.fn(async () => undefined);

    const { result } = renderHook(() =>
      useHiderZoneTool({
        sessionId: "session-1",
        hiderUid: "hider-1",
        gameArea: createTestGameArea(),
        radiusMeters: 200,
        existingZone,
        postSystemMessage,
        pauseTimer,
        resumeTimer,
      }),
    );

    await act(async () => {
      await result.current.startMove();
    });

    expect(pauseTimer).toHaveBeenCalledTimes(1);
    expect(resumeTimer).toHaveBeenCalledTimes(1);
    expect(result.current.moveMode).toBe(false);
    expect(result.current.wizardOpen).toBe(false);
    expect(result.current.error).toMatch(/write failed/i);
  });
});
