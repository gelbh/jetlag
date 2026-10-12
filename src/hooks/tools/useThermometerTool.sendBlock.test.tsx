import { act, renderHook, waitFor } from "@testing-library/react";
import { isValidElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { canCommit } from "../../domain/ask/askHudModes";
import { milesToMeters } from "../../domain/map/distance";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";
import { useMapStore } from "../../state/mapStore";
import { createToolHookMocks } from "../../test/helpers/toolHookMocks";
import {
  THERMOMETER_GPS_WAIT_BLOCK_MS,
  useThermometerSendBlockedTracking,
} from "./thermometer/useThermometerSendBlockedTracking";
import { useThermometerTool } from "./useThermometerTool";

const trackLazy = vi.hoisted(() => vi.fn());
vi.mock("../../services/core/analytics/lazyTelemetry", () => ({ trackLazy }));

const useLiveLocationMock = vi.hoisted(() =>
  vi.fn(() => ({
    reading: null as { lat: number; lng: number; accuracy: number } | null,
    error: null as string | null,
  })),
);
vi.mock("../location/useLiveLocation", () => ({ useLiveLocation: useLiveLocationMock }));

const HALF_MILE = milesToMeters(0.5);

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
    metadata: { thermometerDistanceMeters: HALF_MILE },
  },
  replyOptions: [],
  promptText: "Walking",
};

function chooseDistance(result: { current: ReturnType<typeof useThermometerTool> }) {
  const panel = result.current.panel;
  if (!isValidElement(panel)) throw new Error("expected panel element");
  (panel.props as { onDistanceChange: (n: number) => void }).onDistanceChange(HALF_MILE);
}

function overlayProps(result: { current: ReturnType<typeof useThermometerTool> }) {
  const overlay = result.current.hud.mapOverlay;
  if (!isValidElement(overlay)) throw new Error("expected overlay");
  return overlay.props as Record<string, unknown>;
}

beforeEach(() => {
  trackLazy.mockReset();
  useLiveLocationMock.mockReset();
  useLiveLocationMock.mockReturnValue({ reading: null, error: null });
});

describe("useThermometerTool send blocks", () => {
  beforeEach(() => {
    useMapStore.getState().setActiveTool("thermometer");
  });

  it("keeps END WALK endable during a synced multiplayer walk once GPS updates", async () => {
    const mocks = createToolHookMocks();
    const { result, rerender } = renderHook(() =>
      useThermometerTool({
        active: true,
        annotations: mocks.annotations,
        sessionRules: { gameSize: "large" },
        pendingQuestions: [walkingQuestion],
        // The map screen counts our own walking question as open.
        canSubmitQuestion: false,
        createAnnotation: mocks.createAnnotation,
        distanceUnit: mocks.distanceUnit,
        finishPlacement: mocks.finishPlacement,
        setMapError: mocks.setMapError,
        awaitHiderAnswer: true,
        sessionId: "session-1",
        senderUid: "seeker-1",
      }),
    );

    expect(result.current.hud.commitKind).toBe("endWalk");
    expect(result.current.hud.readiness.viewOnly).toBe(false);
    expect(canCommit(result.current.hud.readiness)).toBe(false);
    const body = result.current.hud.modeBody;
    if (!isValidElement(body)) throw new Error("expected mode body");
    expect((body.props as { waitingForGps: boolean }).waitingForGps).toBe(true);

    useLiveLocationMock.mockReturnValue({
      reading: { lat: 53.351, lng: -6.26, accuracy: 5 },
      error: null,
    });
    rerender();

    await waitFor(() => {
      expect(canCommit(result.current.hud.readiness)).toBe(true);
    });
  });

  it("explains an open question in the map overlay and tracks the block", async () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useThermometerTool({
        active: true,
        annotations: mocks.annotations,
        sessionRules: { gameSize: "large" },
        canSubmitQuestion: false,
        createAnnotation: mocks.createAnnotation,
        distanceUnit: mocks.distanceUnit,
        finishPlacement: mocks.finishPlacement,
        setMapError: mocks.setMapError,
        awaitHiderAnswer: true,
      }),
    );

    act(() => chooseDistance(result));

    await waitFor(() => {
      expect(overlayProps(result).blockReason).toBe("open_question");
    });
    await waitFor(() => {
      expect(trackLazy).toHaveBeenCalledWith("thermometer_send_blocked", {
        reason: "open_question",
        placementMode: "gps",
        awaitHiderAnswer: true,
      });
    });
  });
});

describe("useThermometerSendBlockedTracking", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("tracks a GPS wait only once it stalls, and each reason once per open", () => {
    const { rerender } = renderHook(
      ({ reason }: { reason: "gps_waiting" | "open_question" | null }) =>
        useThermometerSendBlockedTracking({
          active: true,
          reason,
          placementMode: "gps",
          awaitHiderAnswer: true,
        }),
      { initialProps: { reason: "gps_waiting" as "gps_waiting" | "open_question" | null } },
    );

    act(() => {
      vi.advanceTimersByTime(THERMOMETER_GPS_WAIT_BLOCK_MS - 1);
    });
    expect(trackLazy).not.toHaveBeenCalled();

    rerender({ reason: null });
    act(() => {
      vi.advanceTimersByTime(THERMOMETER_GPS_WAIT_BLOCK_MS);
    });
    expect(trackLazy).not.toHaveBeenCalled();

    rerender({ reason: "open_question" });
    act(() => {
      vi.advanceTimersByTime(0);
    });
    rerender({ reason: null });
    rerender({ reason: "open_question" });
    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(trackLazy).toHaveBeenCalledTimes(1);
    expect(trackLazy).toHaveBeenCalledWith("thermometer_send_blocked", {
      reason: "open_question",
      placementMode: "gps",
      awaitHiderAnswer: true,
    });
  });
});
