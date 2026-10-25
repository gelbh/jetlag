import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerMapLibreMap } from "@/services/geo/maplibre/mapLibreMapRegistry";
import * as previewBasemapPoisModule from "@/services/geo/maplibre/previewBasemapPois";
import { useMapStore } from "@/state/mapStore";
import { tentacleSearchRadiusMetersForSession } from "../../domain/questions";
import * as tentacleOverpassModule from "../../services/geo/overpass/tentacleOverpass";
import { createTestPinAnnotation } from "../../test/fixtures/sessions";
import { resetAllStores } from "../../test/helpers/storeReset";
import { createToolHookMocks } from "../../test/helpers/toolHookMocks";
import { useTentacleTool } from "./useTentacleTool";

describe("useTentacleTool", () => {
  beforeEach(() => {
    resetAllStores();
    useMapStore.setState({ mapStyle: "standard" });
    useMapStore.getState().setActiveTool("tentacle");
    registerMapLibreMap(null);
    vi.restoreAllMocks();
  });

  it("opens to the pending preset category", async () => {
    useMapStore.getState().openToolPreset("tentacle", "library");
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

    await waitFor(() => expect(useMapStore.getState().toolPreset).toBeNull());
    expect(result.current.panel.props.model.categoryId).toBe("library");
    expect(result.current.panel.props.model.categoryChosen).toBe(true);
  });

  it("resolves search radius before category and anchor are chosen", () => {
    const mocks = createToolHookMocks();
    const sessionRules = { gameSize: "medium" as const };
    const { result } = renderHook(() =>
      useTentacleTool({
        active: true,
        annotations: mocks.annotations,
        gameArea: mocks.gameArea,
        sessionRules,
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

    expect(result.current.draft.tentacleCenter).toBeNull();
    expect(result.current.draft.tentacleSearchRadiusMeters).toBe(
      tentacleSearchRadiusMetersForSession(sessionRules, "museum"),
    );
    expect(result.current.draft.tentacleSearchRadiusMeters).toBeGreaterThan(0);
  });

  it("resolves search radius from category before an anchor is placed", () => {
    const mocks = createToolHookMocks();
    const sessionRules = { gameSize: "medium" as const };
    const { result } = renderHook(() =>
      useTentacleTool({
        active: true,
        annotations: mocks.annotations,
        gameArea: mocks.gameArea,
        sessionRules,
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
      result.current.panel.props.model.onCategoryChange("museum");
    });

    expect(result.current.draft.tentacleCenter).toBeNull();
    expect(result.current.draft.tentacleSearchRadiusMeters).toBe(
      tentacleSearchRadiusMetersForSession(sessionRules, "museum"),
    );
    expect(result.current.draft.tentacleSearchRadiusMeters).toBeGreaterThan(0);
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
      result.current.panel.props.model.onCategoryChange("museum");
    });

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
      result.current.panel.props.model.onCategoryChange("museum");
    });

    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
    });

    expect(result.current.draft.tentacleCenter).toEqual([53.3501, -6.2601]);
  });

  it("selectDraftPoi rejects provisional places (map marker path)", async () => {
    vi.spyOn(previewBasemapPoisModule, "previewBasemapPois").mockReturnValue([
      {
        id: "prov-1",
        name: "Preview Museum",
        point: [53.35, -6.26],
        confirmStatus: "provisional",
        source: "tile",
      },
    ]);
    vi.spyOn(tentacleOverpassModule, "fetchTentaclePois").mockImplementation(
      () =>
        new Promise(() => {
          /* hang so provisional stays */
        }),
    );

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
      result.current.panel.props.model.onCategoryChange("museum");
    });
    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
    });

    await waitFor(() => {
      expect(result.current.draft.tentaclePois.length).toBeGreaterThan(0);
    });

    const provisionalId = result.current.draft.tentaclePois[0]?.id;
    expect(provisionalId).toBeTruthy();

    act(() => {
      result.current.selectDraftPoi(provisionalId!);
    });

    expect(result.current.draft.tentacleSelectedPoiId).toBeNull();
    expect(result.current.panel.props.model.error).toMatch(/Preview only/i);
  });

  it("keeps map-first Send disabled until POIs are confirmed (multiplayer)", async () => {
    vi.spyOn(previewBasemapPoisModule, "previewBasemapPois").mockReturnValue([]);
    vi.spyOn(tentacleOverpassModule, "fetchTentaclePois").mockResolvedValue([
      {
        id: "prov-1",
        name: "Preview Museum",
        lat: 53.35,
        lng: -6.26,
        category: "museum",
        confirmStatus: "provisional",
        source: "tile",
      },
    ]);

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
        awaitHiderAnswer: true,
      }),
    );

    act(() => {
      result.current.panel.props.model.onCategoryChange("museum");
    });
    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
    });

    await waitFor(() => {
      expect(result.current.draft.tentaclePois.length).toBeGreaterThan(0);
      expect(result.current.draft.seekerResolving).toBe(false);
    });

    const overlay = result.current.hud.mapOverlay as {
      props: { canCommit: boolean };
    } | null;
    expect(overlay).not.toBeNull();
    // Submit filters provisional POIs out; Send must stay disabled instead of no-op.
    expect(overlay!.props.canCommit).toBe(false);
    expect(result.current.hud.readiness.resolveReady).toBe(false);
  });

  it("passes tagged POI pins for the chosen category next to setup pins", async () => {
    vi.spyOn(previewBasemapPoisModule, "previewBasemapPois").mockReturnValue([]);
    const fetchSpy = vi.spyOn(tentacleOverpassModule, "fetchTentaclePois").mockResolvedValue([]);
    const tagged = (id: string, poiCategory: "museum" | "zoo") =>
      createTestPinAnnotation({
        id,
        metadata: { createdAt: "2026-01-01T00:00:00.000Z", label: id, poiCategory },
      });
    const setupPin = {
      id: "setup-1",
      name: "Setup pin",
      point: [53.36, -6.27] as [number, number],
    };

    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useTentacleTool({
        active: true,
        annotations: [tagged("pin-museum", "museum"), tagged("pin-zoo", "zoo")],
        gameArea: mocks.gameArea,
        sessionRules: { gameSize: "medium", customLocationPins: [setupPin] },
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
      result.current.panel.props.model.onCategoryChange("museum");
    });
    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });
    const pins = fetchSpy.mock.calls.at(-1)?.[3]?.customLocationPins?.map((pin) => pin.id);
    expect(pins).toEqual(["setup-1", "pin-museum"]);
  });

  it("arms map-first Send when Overpass POIs are confirmed (multiplayer)", async () => {
    vi.spyOn(previewBasemapPoisModule, "previewBasemapPois").mockReturnValue([]);
    vi.spyOn(tentacleOverpassModule, "fetchTentaclePois").mockResolvedValue([
      {
        id: "osm-1",
        name: "City Museum",
        lat: 53.35,
        lng: -6.26,
        category: "museum",
        confirmStatus: "confirmed",
        source: "overpass",
      },
    ]);

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
        awaitHiderAnswer: true,
      }),
    );

    act(() => {
      result.current.panel.props.model.onCategoryChange("museum");
    });
    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
    });

    await waitFor(() => {
      expect(result.current.hud.readiness.resolveReady).toBe(true);
      const overlay = result.current.hud.mapOverlay as {
        props: { canCommit: boolean };
      } | null;
      expect(overlay?.props.canCommit).toBe(true);
    });
  });

  it("returns to the category step when the user cancels the location search", async () => {
    // Stable rules: a fresh object each render would restart the search every render.
    const sessionRules = { gameSize: "medium" as const };
    vi.spyOn(previewBasemapPoisModule, "previewBasemapPois").mockReturnValue([]);
    vi.spyOn(tentacleOverpassModule, "fetchTentaclePois").mockImplementation(
      (_center, _radius, _category, options) =>
        new Promise((_resolve, reject) => {
          options?.task?.signal.addEventListener("abort", () =>
            reject(new DOMException("Cancelled.", "AbortError")),
          );
        }),
    );

    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useTentacleTool({
        active: true,
        annotations: [],
        gameArea: mocks.gameArea,
        sessionRules,
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
      result.current.panel.props.model.onCategoryChange("museum");
    });
    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
    });
    await waitFor(() => expect(result.current.panel.props.model.loadTask).toBeTruthy());

    await act(async () => {
      result.current.panel.props.model.loadTask?.cancel();
    });

    await waitFor(() => {
      expect(result.current.panel.props.model.categoryChosen).toBe(false);
    });
    expect(result.current.panel.props.model.loading).toBe(false);
    expect(result.current.panel.props.model.error ?? null).toBeNull();
  });
});
