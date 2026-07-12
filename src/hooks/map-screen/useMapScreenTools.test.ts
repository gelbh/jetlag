import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import { DUBLIN_CITY_GAME_AREA } from "../../test/fixtures/dublinGameArea";
import { useMapScreenTools } from "./useMapScreenTools";

vi.mock("../location/useGeolocation", () => ({
  useGeolocation: vi.fn(() => ({
    refresh: vi.fn(),
    loading: false,
    error: null,
  })),
}));

vi.mock("../sync/usePendingQuestionActions", () => ({
  usePendingQuestionActions: vi.fn(() => ({
    submitPendingQuestion: vi.fn(),
    answerPendingQuestion: vi.fn(),
    completeThermometerWalk: vi.fn(),
    postSystemMessage: vi.fn(),
  })),
}));

vi.mock("../tools/usePhotoTool", () => ({
  usePhotoTool: vi.fn(() => ({ panel: null, draft: {} })),
}));
vi.mock("../tools/usePinTool", () => ({
  usePinTool: vi.fn(() => ({
    panel: null,
    draft: {},
    placementCrosshair: false,
    handleMapClick: vi.fn(),
    resetDraft: vi.fn(),
  })),
}));
vi.mock("../tools/useRadarTool", () => ({
  useRadarTool: vi.fn(() => ({
    panel: null,
    draft: {},
    placementCrosshair: false,
    handleMapClick: vi.fn(),
    resetDraft: vi.fn(),
  })),
}));
vi.mock("../tools/useThermometerTool", () => ({
  useThermometerTool: vi.fn(() => ({
    panel: null,
    draft: {},
    placementCrosshair: false,
    handleMapClick: vi.fn(),
    resetDraft: vi.fn(),
  })),
}));
vi.mock("../tools/useZoneTool", () => ({
  useZoneTool: vi.fn(() => ({
    panel: null,
    draft: {},
    handleMapClick: vi.fn(),
    resetDraft: vi.fn(),
  })),
}));

vi.mock("./useHeavyMapToolsState", () => ({
  useHeavyMapToolsState: vi.fn(() => ({
    heavyToolActive: false,
    handleHeavyToolsChange: vi.fn(),
    matchingTool: {
      draft: { measuringPlaces: [] },
      placementCrosshair: false,
      handleMapClick: vi.fn(),
      resetDraft: vi.fn(),
      panel: null,
    },
    measuringTool: {
      draft: { measuringPlaces: [] },
      placementCrosshair: false,
      handleMapClick: vi.fn(),
      resetDraft: vi.fn(),
      panel: null,
    },
    tentacleTool: {
      draft: {},
      placementCrosshair: false,
      handleMapClick: vi.fn(),
      resetDraft: vi.fn(),
      panel: null,
    },
  })),
}));

describe("useMapScreenTools", () => {
  it("blocks question submission while a pending question is open", () => {
    const { result } = renderHook(() =>
      useMapScreenTools({
        session: {
          id: LOCAL_SESSION_ID,
          code: "WXYZ",
          gameArea: DUBLIN_CITY_GAME_AREA,
          createdAt: "2026-01-01T00:00:00.000Z",
          memberUids: ["seeker-1"],
        },
        uid: "seeker-1",
        activeTool: "radar",
        setActiveTool: vi.fn(),
        annotations: [],
        sessionRules: {},
        gameArea: DUBLIN_CITY_GAME_AREA,
        toolGameArea: DUBLIN_CITY_GAME_AREA,
        pendingQuestions: [
          {
            id: "pending-1",
            sessionId: LOCAL_SESSION_ID,
            toolType: "radar",
            createdByUid: "seeker-1",
            createdAt: "2026-01-01T00:00:00.000Z",
            status: "pending",
            placement: { geometryJson: "{}" },
            replyOptions: [],
            promptText: "Are you within 1 mile?",
          },
        ],
        distanceUnit: "imperial",
        createAnnotation: vi.fn(),
      }),
    );

    expect(result.current.canSubmitQuestion).toBe(false);
  });

  it("rejects points outside the play area", () => {
    const { result } = renderHook(() =>
      useMapScreenTools({
        session: {
          id: LOCAL_SESSION_ID,
          code: "WXYZ",
          gameArea: DUBLIN_CITY_GAME_AREA,
          createdAt: "2026-01-01T00:00:00.000Z",
          memberUids: ["seeker-1"],
        },
        uid: "seeker-1",
        activeTool: "radar",
        setActiveTool: vi.fn(),
        annotations: [],
        sessionRules: {},
        gameArea: DUBLIN_CITY_GAME_AREA,
        toolGameArea: DUBLIN_CITY_GAME_AREA,
        pendingQuestions: [],
        distanceUnit: "imperial",
        createAnnotation: vi.fn(),
      }),
    );

    act(() => {
      expect(result.current.ensurePointInGameArea([0, 0])).toBe(false);
    });
    expect(result.current.mapError).toBe("That point is outside the play area.");
  });
});
