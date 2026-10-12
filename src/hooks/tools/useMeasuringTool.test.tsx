import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMapStore } from "../../state/mapStore";
import { resetAllStores } from "../../test/helpers/storeReset";
import { createToolHookMocks } from "../../test/helpers/toolHookMocks";
import { useMeasuringTool } from "./useMeasuringTool";

vi.mock("../../services/geo/overpass/measuringPlaces", () => ({
  fetchMeasuringPlacesInArea: vi.fn(async () => ({ ok: true, places: [] })),
  fetchNearestMeasuringPlace: vi.fn(async () => ({
    ok: false,
    message: "Not found",
  })),
  measuringPlaceNotFoundMessage: () => "Not found",
}));

vi.mock("./measuringToolResolvers", () => ({
  fetchMeasuringCoastlineContext: vi.fn(async () => null),
  fetchMeasuringLinearContext: vi.fn(async () => null),
  fetchMeasuringMapTarget: vi.fn(async () => null),
  fetchMeasuringSeaLevelContext: vi.fn(async () => null),
  fetchNearestMeasuringPlace: vi.fn(async () => null),
}));

describe("useMeasuringTool", () => {
  beforeEach(() => {
    resetAllStores();
    useMapStore.getState().setActiveTool("measuring");
  });

  it("opens to the pending preset measure-from option", async () => {
    useMapStore.getState().openToolPreset("measuring", "park");
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useMeasuringTool({
        active: true,
        annotations: mocks.annotations,
        gameArea: mocks.gameArea,
        createAnnotation: mocks.createAnnotation,
        distanceUnit: mocks.distanceUnit,
        finishPlacement: mocks.finishPlacement,
        gpsLoading: mocks.gpsLoading,
        mapError: mocks.mapError,
        setMapError: mocks.setMapError,
        refreshGps: mocks.refreshGps,
        ensurePointInGameArea: mocks.ensurePointInGameArea,
      }),
    );

    await waitFor(() => expect(useMapStore.getState().toolPreset).toBeNull());
    expect(result.current.panel.props.draft.measureFromKind).toBe("park");
    expect(result.current.panel.props.draft.measuringOptionChosen).toBe(true);
  });

  it("stores the seeker point from the first map tap", () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useMeasuringTool({
        active: true,
        annotations: mocks.annotations,
        gameArea: mocks.gameArea,
        createAnnotation: mocks.createAnnotation,
        distanceUnit: mocks.distanceUnit,
        finishPlacement: mocks.finishPlacement,
        gpsLoading: mocks.gpsLoading,
        mapError: mocks.mapError,
        setMapError: mocks.setMapError,
        refreshGps: mocks.refreshGps,
        ensurePointInGameArea: mocks.ensurePointInGameArea,
      }),
    );

    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
    });

    expect(result.current.draft.measuringSeekerPoint).toEqual([53.35, -6.26]);
  });
});
