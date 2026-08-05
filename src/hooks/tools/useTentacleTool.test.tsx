import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { useTentacleTool } from "./useTentacleTool";
import { createToolHookMocks } from "../../test/helpers/toolHookMocks";
import { registerMapLibreMap } from "@/services/geo/maplibre/mapLibreMapRegistry";
import { useMapStore } from "@/state/mapStore";

describe("useTentacleTool", () => {
  beforeEach(() => {
    useMapStore.setState({ mapStyle: "standard" });
    registerMapLibreMap(null);
  });

  it("stores tentacle center from map taps", () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useTentacleTool({
        active: true,
        annotations: mocks.annotations,
        gameArea: mocks.gameArea,
        sessionRules: { gameSize: "medium" },
        createAnnotation: mocks.createAnnotation,
        distanceUnit: mocks.distanceUnit,
        finishPlacement: mocks.finishPlacement,
        setMapError: mocks.setMapError,
        mapError: mocks.mapError,
        gpsLoading: mocks.gpsLoading,
        awaitingPlacement: mocks.awaitingPlacement,
        setAwaitingPlacement: mocks.setAwaitingPlacement,
        refreshGps: mocks.refreshGps,
        ensurePointInGameArea: mocks.ensurePointInGameArea,
        armPlacement: mocks.armPlacement,
      }),
    );

    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
    });

    expect(result.current.draft.tentacleCenter).toEqual([53.35, -6.26]);
  });

  it("snaps place taps to nearby street basemap POIs", () => {
    registerMapLibreMap({
      getStyle: () => ({
        sources: { openmaptiles: {} },
        layers: [],
      }),
      querySourceFeatures: () => [
        {
          type: "Feature",
          id: 3,
          properties: { name: "Snapped POI", class: "museum" },
          geometry: { type: "Point", coordinates: [-6.2601, 53.3501] },
        },
      ],
    } as never);

    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useTentacleTool({
        active: true,
        annotations: mocks.annotations,
        gameArea: mocks.gameArea,
        sessionRules: { gameSize: "medium" },
        createAnnotation: mocks.createAnnotation,
        distanceUnit: mocks.distanceUnit,
        finishPlacement: mocks.finishPlacement,
        setMapError: mocks.setMapError,
        mapError: mocks.mapError,
        gpsLoading: mocks.gpsLoading,
        awaitingPlacement: mocks.awaitingPlacement,
        setAwaitingPlacement: mocks.setAwaitingPlacement,
        refreshGps: mocks.refreshGps,
        ensurePointInGameArea: mocks.ensurePointInGameArea,
        armPlacement: mocks.armPlacement,
      }),
    );

    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
    });

    expect(result.current.draft.tentacleCenter).toEqual([53.3501, -6.2601]);
  });
});
