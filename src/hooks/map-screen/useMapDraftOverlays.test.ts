import { renderHook } from "@testing-library/react";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { describe, expect, it } from "vitest";
import { buildMapDraftOverlays } from "./useMapDraftOverlays";
import { DUBLIN_CITY_GAME_AREA } from "../../test/fixtures/dublinGameArea";

function pointInAnyElimination(
  lngLat: [number, number],
  features: Feature<Polygon | MultiPolygon>[],
): boolean {
  const probe = turfPoint(lngLat);
  return features.some((feature) => booleanPointInPolygon(probe, feature));
}

const emptySources = {
  activeTool: "none" as const,
  gameArea: DUBLIN_CITY_GAME_AREA,
  mapStyle: "standard" as const,
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
};

describe("buildMapDraftOverlays", () => {
  it("returns no overlays when no tool is active", () => {
    const result = buildMapDraftOverlays(emptySources);

    expect(result.overlays).toEqual([]);
    expect(result.eliminationFeatures).toEqual([]);
  });

  it("draws a radar draft circle before an answer is chosen", () => {
    const result = buildMapDraftOverlays({
      ...emptySources,
      activeTool: "radar",
      radar: {
        center: [53.35, -6.26],
        radiusMeters: 1609,
        answer: null,
      },
    });

    expect(result.overlays.some((overlay) => overlay.id === "radar-draft-range")).toBe(
      true,
    );
  });

  it("shades tentacle POI answer elimination inline with the draft overlays", () => {
    const result = buildMapDraftOverlays({
      ...emptySources,
      activeTool: "tentacle",
      tentacle: {
        center: [53.35, -6.26],
        searchRadiusMeters: 1609,
        answerRadiusMeters: 1609,
        pois: [
          {
            id: "west",
            name: "West Museum",
            lat: 53.351,
            lng: -6.28,
            category: "museum",
          },
          {
            id: "east",
            name: "East Museum",
            lat: 53.351,
            lng: -6.24,
            category: "museum",
          },
        ],
        selectedPoiId: "east",
        outOfReach: false,
        seekerResolving: false,
      },
    });

    const { eliminationFeatures } = result;
    expect(eliminationFeatures.length).toBeGreaterThan(0);

    expect(
      pointInAnyElimination([-6.24, 53.351], eliminationFeatures),
    ).toBe(false);
    expect(
      pointInAnyElimination([-6.28, 53.351], eliminationFeatures),
    ).toBe(true);
    expect(
      pointInAnyElimination([-6.35, 53.35], eliminationFeatures),
    ).toBe(true);
  });

  it("shades only the exterior for a single tentacle POI answer draft", () => {
    const result = buildMapDraftOverlays({
      ...emptySources,
      activeTool: "tentacle",
      tentacle: {
        center: [53.35, -6.26],
        searchRadiusMeters: 1609,
        answerRadiusMeters: 1609,
        pois: [
          {
            id: "west",
            name: "West Museum",
            lat: 53.351,
            lng: -6.28,
            category: "museum",
          },
        ],
        selectedPoiId: "west",
        outOfReach: false,
        seekerResolving: false,
      },
    });

    const { eliminationFeatures } = result;
    expect(eliminationFeatures.length).toBeGreaterThan(0);
    expect(
      pointInAnyElimination([-6.35, 53.35], eliminationFeatures),
    ).toBe(true);
    expect(
      pointInAnyElimination([-6.261, 53.35], eliminationFeatures),
    ).toBe(false);
  });
});

describe("useMapDraftOverlays", () => {
  it("includes pin overlays for the active pin draft", async () => {
    const { useMapDraftOverlays } = await import("./useMapDraftOverlays");
    const sources = {
      ...emptySources,
      activeTool: "pin" as const,
      pin: { point: [53.35, -6.26] as [number, number] },
    };

    const { result } = renderHook(() => useMapDraftOverlays(sources));

    expect(result.current.overlays.some((overlay) => overlay.id === "pin-draft")).toBe(
      true,
    );
  });
});
