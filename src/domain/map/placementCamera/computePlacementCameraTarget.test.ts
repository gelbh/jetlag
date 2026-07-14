import { describe, expect, it } from "vitest";
import { toLeafletBounds } from "./leafletBounds";
import {
  buildMapDraftOverlays,
  type MapDraftOverlaySources,
} from "../../../hooks/map-screen/useMapDraftOverlays";
import { DUBLIN_CITY_GAME_AREA } from "../../../test/fixtures/dublinGameArea";
import {
  computePlacementCameraTarget,
  placementCameraDraftFromOverlaySources,
  resolvePlacementPhase,
  MAX_ZOOM_PIN,
  type CameraTarget,
} from "./index";

const dublinCenter: [number, number] = [53.35, -6.26];

const emptySources: MapDraftOverlaySources = {
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
};

function buildContext(sources: MapDraftOverlaySources) {
  const { overlays, eliminationFeatures } = buildMapDraftOverlays(sources);
  const draft = placementCameraDraftFromOverlaySources(sources);
  const phase = resolvePlacementPhase(sources.activeTool, draft);

  return {
    tool: sources.activeTool,
    phase,
    draft,
    gameArea: sources.gameArea,
    overlays,
    eliminationFeatures,
    panelPeekHeightPx: 320,
    selectedPoiId: sources.tentacle.selectedPoiId,
    walkActive: sources.thermometer.walkActive,
  };
}

function boundsSpanMeters(target: CameraTarget | null): number {
  if (!target) {
    return 0;
  }

  const bounds = toLeafletBounds(target.bounds);
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();
  const latSpan = (northEast.lat - southWest.lat) * 111_320;
  const lngSpan =
    (northEast.lng - southWest.lng) *
    111_320 *
    Math.cos((((northEast.lat + southWest.lat) / 2) * Math.PI) / 180);

  return Math.max(latSpan, lngSpan);
}

describe("computePlacementCameraTarget", () => {
  it("frames pin placement with max zoom and local span", () => {
    const sources = {
      ...emptySources,
      activeTool: "pin" as const,
      pin: { point: dublinCenter },
    };
    const target = computePlacementCameraTarget(buildContext(sources));

    expect(target).not.toBeNull();
    expect(target?.maxZoom).toBe(MAX_ZOOM_PIN);
    expect(boundsSpanMeters(target)).toBeGreaterThan(100);
    expect(boundsSpanMeters(target)).toBeLessThan(800);
  });

  it("frames radar draft circle with proportional padding", () => {
    const sources = {
      ...emptySources,
      activeTool: "radar" as const,
      radar: {
        center: dublinCenter,
        radiusMeters: 500,
        answer: null,
      },
    };
    const target = computePlacementCameraTarget(buildContext(sources));

    expect(target).not.toBeNull();
    const span = boundsSpanMeters(target);
    expect(span).toBeGreaterThan(900);
    expect(span).toBeLessThan(2_500);
  });

  it("frames tentacle POI pick between center and selected POI", () => {
    const poi: [number, number] = [53.351, -6.255];
    const sources = {
      ...emptySources,
      activeTool: "tentacle" as const,
      tentacle: {
        center: dublinCenter,
        searchRadiusMeters: 400,
        answerRadiusMeters: 400,
        pois: [
          {
            id: "cafe",
            name: "Cafe",
            lat: poi[0],
            lng: poi[1],
            category: "museum" as const,
          },
        ],
        selectedPoiId: "cafe",
        outOfReach: false,
        seekerResolving: false,
      },
    };
    const target = computePlacementCameraTarget(buildContext(sources));

    expect(target).not.toBeNull();
    const bounds = toLeafletBounds(target!.bounds);
    const center = bounds.getCenter();
    expect(center.lat).toBeGreaterThan(Math.min(dublinCenter[0], poi[0]));
    expect(center.lat).toBeLessThan(Math.max(dublinCenter[0], poi[0]));
    expect(boundsSpanMeters(target)).toBeGreaterThan(200);
  });

  it("returns null when tool is idle", () => {
    expect(computePlacementCameraTarget(buildContext(emptySources))).toBeNull();
  });
});
