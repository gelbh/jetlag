import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildMapDraftOverlays } from "./useMapDraftOverlays";
import { DUBLIN_CITY_GAME_AREA } from "../../test/fixtures/dublinGameArea";

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
  thermometer: { thermoA: null, thermoB: null, answer: null },
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
