import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as previewBasemapPoisModule from "@/services/geo/maplibre/previewBasemapPois";
import { DUBLIN_CITY_GAME_AREA } from "../../test/fixtures/dublinGameArea";
import { createToolHookMocks } from "../../test/helpers/toolHookMocks";
import { useTentacleTool } from "./useTentacleTool";

vi.mock("../forms/useDebouncedValue", () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

vi.mock("../../services/core/location/geolocation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/core/location/geolocation")>();
  return {
    ...actual,
    queryGeolocationPermission: vi.fn(async () => "prompt" as const),
  };
});

vi.mock("../../services/geo/overpass/tentacleOverpass", () => ({
  fetchTentaclePois: vi.fn(async () => [
    {
      id: "osm-1",
      name: "City Museum",
      lat: 53.35,
      lng: -6.26,
      category: "museum",
      confirmStatus: "confirmed",
      source: "overpass",
    },
  ]),
}));

describe("useTentacleTool map-first", () => {
  it("suppresses the Ask sheet after a category is chosen", async () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useTentacleTool({
        active: true,
        annotations: mocks.annotations,
        gameArea: DUBLIN_CITY_GAME_AREA,
        sessionRules: { gameSize: "medium" },
        createAnnotation: mocks.createAnnotation,
        distanceUnit: mocks.distanceUnit,
        finishPlacement: mocks.finishPlacement,
        setMapError: mocks.setMapError,
        mapError: mocks.mapError,
        gpsLoading: mocks.gpsLoading,
        awaitingPlacement: false,
        setAwaitingPlacement: mocks.setAwaitingPlacement,
        refreshGps: mocks.refreshGps,
        ensurePointInGameArea: mocks.ensurePointInGameArea,
        armPlacement: vi.fn(),
        awaitHiderAnswer: true,
      }),
    );

    expect(result.current.hud.suppressSheet).toBeFalsy();

    act(() => {
      (
        result.current.panel as {
          props: { model: { onCategoryChange: (id: string) => void } };
        }
      ).props.model.onCategoryChange("train_station");
    });

    await waitFor(() => {
      expect(result.current.hud.suppressSheet).toBe(true);
    });

    expect(result.current.hud.mapOverlay).not.toBeNull();
    expect(result.current.hud.modeBody).toBeNull();
  });

  it("re-pins on map tap while answering and clears POI selection", async () => {
    vi.spyOn(previewBasemapPoisModule, "previewBasemapPois").mockReturnValue([]);

    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useTentacleTool({
        active: true,
        annotations: mocks.annotations,
        gameArea: DUBLIN_CITY_GAME_AREA,
        sessionRules: { gameSize: "medium" },
        createAnnotation: mocks.createAnnotation,
        distanceUnit: mocks.distanceUnit,
        finishPlacement: mocks.finishPlacement,
        setMapError: mocks.setMapError,
        mapError: mocks.mapError,
        gpsLoading: mocks.gpsLoading,
        awaitingPlacement: false,
        setAwaitingPlacement: mocks.setAwaitingPlacement,
        refreshGps: mocks.refreshGps,
        ensurePointInGameArea: mocks.ensurePointInGameArea,
        armPlacement: vi.fn(),
        awaitHiderAnswer: false,
      }),
    );

    act(() => {
      (
        result.current.panel as {
          props: { model: { onCategoryChange: (id: string) => void } };
        }
      ).props.model.onCategoryChange("museum");
    });

    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
    });

    await waitFor(() => {
      expect(result.current.draft.seekerResolving).toBe(false);
      expect(result.current.draft.tentaclePois.length).toBeGreaterThan(0);
    });

    act(() => {
      result.current.selectDraftPoi("osm-1");
    });

    expect(result.current.draft.tentacleSelectedPoiId).toBe("osm-1");
    expect(result.current.draft.tentacleOutOfReach).toBe(false);

    let accepted = false;
    act(() => {
      accepted = result.current.handleMapClick([53.36, -6.25]);
    });

    expect(accepted).toBe(true);
    expect(result.current.draft.tentacleCenter).toEqual([53.36, -6.25]);
    expect(result.current.draft.tentacleSelectedPoiId).toBeNull();
    expect(result.current.draft.tentacleOutOfReach).toBe(false);
  });

  it("re-pins on map tap while answering and clears out-of-reach", async () => {
    vi.spyOn(previewBasemapPoisModule, "previewBasemapPois").mockReturnValue([]);

    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useTentacleTool({
        active: true,
        annotations: mocks.annotations,
        gameArea: DUBLIN_CITY_GAME_AREA,
        sessionRules: { gameSize: "medium" },
        createAnnotation: mocks.createAnnotation,
        distanceUnit: mocks.distanceUnit,
        finishPlacement: mocks.finishPlacement,
        setMapError: mocks.setMapError,
        mapError: mocks.mapError,
        gpsLoading: mocks.gpsLoading,
        awaitingPlacement: false,
        setAwaitingPlacement: mocks.setAwaitingPlacement,
        refreshGps: mocks.refreshGps,
        ensurePointInGameArea: mocks.ensurePointInGameArea,
        armPlacement: vi.fn(),
        awaitHiderAnswer: false,
      }),
    );

    act(() => {
      (
        result.current.panel as {
          props: { model: { onCategoryChange: (id: string) => void } };
        }
      ).props.model.onCategoryChange("museum");
    });

    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
    });

    await waitFor(() => {
      expect(result.current.draft.seekerResolving).toBe(false);
      expect(result.current.hud.mapOverlay).not.toBeNull();
    });

    act(() => {
      (
        result.current.hud.mapOverlay as {
          props: { onOutOfReachChange: (next: boolean) => void };
        }
      ).props.onOutOfReachChange(true);
    });

    expect(result.current.draft.tentacleOutOfReach).toBe(true);

    let accepted = false;
    act(() => {
      accepted = result.current.handleMapClick([53.36, -6.25]);
    });

    expect(accepted).toBe(true);
    expect(result.current.draft.tentacleCenter).toEqual([53.36, -6.25]);
    expect(result.current.draft.tentacleOutOfReach).toBe(false);
    expect(result.current.draft.tentacleSelectedPoiId).toBeNull();
  });
});
