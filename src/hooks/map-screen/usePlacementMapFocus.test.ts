import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildMapDraftOverlays } from "./useMapDraftOverlays";
import { usePlacementMapFocus } from "./usePlacementMapFocus";
import type { MapDraftOverlay } from "../../domain/map/mapDraftOverlay";
import { placementCameraDraftFromOverlaySources } from "../../domain/map/placementCamera";
import { DUBLIN_CITY_GAME_AREA } from "../../test/fixtures/dublinGameArea";

const defaultBounds: [[number, number], [number, number]] = [
  [53.34, -6.27],
  [53.36, -6.25],
];

const emptyDraft = placementCameraDraftFromOverlaySources({
  activeTool: "none",
  gameArea: DUBLIN_CITY_GAME_AREA,
  mapStyle: "standard",
  radar: { center: null, radiusMeters: 0, answer: null },
  pin: { point: null },
  tentacle: {
    center: null,
    searchRadiusMeters: 0,
    answerRadiusMeters: 0,
    pois: [],
    selectedPoiId: null,
    outOfReach: false,
    seekerResolving: false,
  },
  thermometer: {
    thermoA: null,
    thermoB: null,
    answer: null,
    targetDistanceMeters: 804,
    walkCurrentPoint: null,
    walkActive: false,
  },
  measuring: {
    seekerPoint: null,
    targetPoint: null,
    placePoints: [],
    siteRadiusMeters: null,
    boundaryPreview: null,
    eliminationPreview: null,
    seekerResolving: false,
  },
  matching: {
    seekerPoint: null,
    nearestFeaturePoint: null,
    boundaryPreview: null,
    eliminationPreview: null,
    seekerResolving: false,
  },
  zone: { vertices: [] },
});

const pinSources = {
  activeTool: "pin" as const,
  gameArea: DUBLIN_CITY_GAME_AREA,
  mapStyle: "standard" as const,
  radar: { center: null, radiusMeters: 0, answer: null },
  pin: { point: [53.35, -6.26] as [number, number] },
  tentacle: {
    center: null,
    searchRadiusMeters: 0,
    answerRadiusMeters: 0,
    pois: [],
    selectedPoiId: null,
    outOfReach: false,
    seekerResolving: false,
  },
  thermometer: {
    thermoA: null,
    thermoB: null,
    answer: null,
    targetDistanceMeters: 804,
    walkCurrentPoint: null,
    walkActive: false,
  },
  measuring: {
    seekerPoint: null,
    targetPoint: null,
    placePoints: [],
    siteRadiusMeters: null,
    boundaryPreview: null,
    eliminationPreview: null,
    seekerResolving: false,
  },
  matching: {
    seekerPoint: null,
    nearestFeaturePoint: null,
    boundaryPreview: null,
    eliminationPreview: null,
    seekerResolving: false,
  },
  zone: { vertices: [] },
};

const pinDraft = placementCameraDraftFromOverlaySources({
  ...pinSources,
});

const pinOverlays = buildMapDraftOverlays(pinSources).overlays;

describe("usePlacementMapFocus", () => {
  it("uses default focus bounds until overlays change", () => {
    const { result } = renderHook(() =>
      usePlacementMapFocus({
        activeTool: "pin",
        draft: emptyDraft,
        overlays: [],
        eliminationFeatures: [],
        gameArea: DUBLIN_CITY_GAME_AREA,
        defaultFocusBounds: defaultBounds,
        enabled: true,
        panelMinimized: false,
      }),
    );

    expect(result.current.effectiveFocusBounds).toEqual(defaultBounds);
    expect(result.current.placementRecenterToken).toBe(0);
    expect(result.current.focusPaddingBias).toBeUndefined();
  });

  it("bumps recenter token when structural overlays change", () => {
    const idlePinDraft = placementCameraDraftFromOverlaySources({
      ...pinSources,
      pin: { point: null },
    });

    const { result, rerender } = renderHook(
      ({ overlays, draft }: { overlays: MapDraftOverlay[]; draft: typeof pinDraft }) =>
        usePlacementMapFocus({
          activeTool: "pin",
          draft,
          overlays,
          eliminationFeatures: [],
          gameArea: DUBLIN_CITY_GAME_AREA,
          defaultFocusBounds: defaultBounds,
          enabled: true,
          panelMinimized: false,
        }),
      {
        initialProps: {
          overlays: [] as MapDraftOverlay[],
          draft: idlePinDraft,
        },
      },
    );

    rerender({ overlays: pinOverlays, draft: pinDraft });

    expect(result.current.placementRecenterToken).toBe(1);
    expect(result.current.focusPaddingBias).toBeGreaterThan(300);
    expect(result.current.effectiveFocusBounds).not.toEqual(defaultBounds);
  });

  it("does not bump token when fingerprint is unchanged", () => {
    const { result, rerender } = renderHook(
      ({ nextOverlays }: { nextOverlays: MapDraftOverlay[] }) =>
        usePlacementMapFocus({
          activeTool: "pin",
          draft: pinDraft,
          overlays: nextOverlays,
          eliminationFeatures: [],
          gameArea: DUBLIN_CITY_GAME_AREA,
          defaultFocusBounds: defaultBounds,
          enabled: true,
          panelMinimized: false,
        }),
      { initialProps: { nextOverlays: pinOverlays } },
    );

    expect(result.current.placementRecenterToken).toBe(1);

    rerender({ nextOverlays: [...pinOverlays] });
    expect(result.current.placementRecenterToken).toBe(1);
  });

  it("throttles walk reframes to at most once every 2 seconds", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T10:00:00Z"));

    const walkSourcesBase = {
      ...pinSources,
      activeTool: "thermometer" as const,
      thermometer: {
        thermoA: [53.35, -6.26] as [number, number],
        thermoB: null,
        answer: null,
        targetDistanceMeters: 804,
        walkCurrentPoint: [53.35, -6.26] as [number, number],
        walkActive: true,
      },
    };

    const walkDraft = placementCameraDraftFromOverlaySources(walkSourcesBase);

    const walkOverlaysA = buildMapDraftOverlays(walkSourcesBase).overlays;

    const { result, rerender } = renderHook(
      ({
        overlays,
        draft,
      }: {
        overlays: MapDraftOverlay[];
        draft: ReturnType<typeof placementCameraDraftFromOverlaySources>;
      }) =>
        usePlacementMapFocus({
          activeTool: "thermometer",
          draft,
          overlays,
          eliminationFeatures: [],
          gameArea: DUBLIN_CITY_GAME_AREA,
          defaultFocusBounds: defaultBounds,
          enabled: true,
          panelMinimized: false,
          walkActive: true,
        }),
      { initialProps: { overlays: walkOverlaysA, draft: walkDraft } },
    );

    expect(result.current.placementRecenterToken).toBe(1);

    const walkDraftB = placementCameraDraftFromOverlaySources({
      ...walkSourcesBase,
      thermometer: {
        ...walkSourcesBase.thermometer,
        walkCurrentPoint: [53.351, -6.261],
      },
    });
    const walkOverlaysB = buildMapDraftOverlays({
      ...walkSourcesBase,
      thermometer: {
        ...walkSourcesBase.thermometer,
        walkCurrentPoint: [53.351, -6.261],
      },
    }).overlays;

    rerender({ overlays: walkOverlaysB, draft: walkDraftB });
    expect(result.current.placementRecenterToken).toBe(1);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const walkDraftC = placementCameraDraftFromOverlaySources({
      ...walkSourcesBase,
      thermometer: {
        ...walkSourcesBase.thermometer,
        walkCurrentPoint: [53.352, -6.262],
      },
    });
    const walkOverlaysC = buildMapDraftOverlays({
      ...walkSourcesBase,
      thermometer: {
        ...walkSourcesBase.thermometer,
        walkCurrentPoint: [53.352, -6.262],
      },
    }).overlays;

    rerender({ overlays: walkOverlaysC, draft: walkDraftC });
    expect(result.current.placementRecenterToken).toBe(2);

    vi.useRealTimers();
  });

  it("bumps token immediately when requestPlacementRecenter is called", () => {
    const { result } = renderHook(() =>
      usePlacementMapFocus({
        activeTool: "pin",
        draft: pinDraft,
        overlays: pinOverlays,
        eliminationFeatures: [],
        gameArea: DUBLIN_CITY_GAME_AREA,
        defaultFocusBounds: defaultBounds,
        enabled: true,
        panelMinimized: false,
      }),
    );

    const initialToken = result.current.placementRecenterToken;
    act(() => {
      result.current.requestPlacementRecenter();
    });

    expect(result.current.placementRecenterToken).toBe(initialToken + 1);
  });

  it("clears focusPreferFly once the recenter reframe is consumed, before the next ordinary update", () => {
    const { result, rerender } = renderHook(
      ({ overlays, draft }: { overlays: MapDraftOverlay[]; draft: typeof pinDraft }) =>
        usePlacementMapFocus({
          activeTool: "pin",
          draft,
          overlays,
          eliminationFeatures: [],
          gameArea: DUBLIN_CITY_GAME_AREA,
          defaultFocusBounds: defaultBounds,
          enabled: true,
          panelMinimized: false,
        }),
      { initialProps: { overlays: pinOverlays, draft: pinDraft } },
    );

    act(() => {
      result.current.requestPlacementRecenter();
    });

    // The one-shot flag is consumed by the reframe it triggered; it must not
    // survive to bias a later, unrelated update (e.g. a panel resize) toward
    // the cinematic flyTo path.
    expect(result.current.focusPreferFly).toBe(false);

    rerender({ overlays: pinOverlays, draft: pinDraft });
    expect(result.current.focusPreferFly).toBe(false);
  });

  it("clears focusPreferFly on deactivate so it cannot survive a reactivate", () => {
    const { result, rerender } = renderHook(
      ({
        activeTool,
        draft,
        overlays,
      }: {
        activeTool: "pin" | "none";
        draft: typeof pinDraft;
        overlays: MapDraftOverlay[];
      }) =>
        usePlacementMapFocus({
          activeTool,
          draft,
          overlays,
          eliminationFeatures: [],
          gameArea: DUBLIN_CITY_GAME_AREA,
          defaultFocusBounds: defaultBounds,
          enabled: true,
          panelMinimized: false,
        }),
      {
        initialProps: {
          activeTool: "pin" as "pin" | "none",
          draft: pinDraft,
          overlays: pinOverlays,
        },
      },
    );

    act(() => {
      result.current.requestPlacementRecenter();
    });
    expect(result.current.focusPreferFly).toBe(false);

    rerender({ activeTool: "none", draft: emptyDraft, overlays: [] });
    expect(result.current.focusPreferFly).toBe(false);

    rerender({ activeTool: "pin", draft: pinDraft, overlays: pinOverlays });
    expect(result.current.focusPreferFly).toBe(false);
  });
});
