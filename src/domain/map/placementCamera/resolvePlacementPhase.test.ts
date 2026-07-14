import { describe, expect, it } from "vitest";
import { resolvePlacementPhase } from "./resolvePlacementPhase";
import type { PlacementCameraDraftState } from "./types";

const emptyDraft: PlacementCameraDraftState = {
  pin: { point: null },
  radar: { center: null, radiusMeters: 0, answer: null },
  tentacle: {
    center: null,
    searchRadiusMeters: 0,
    answerRadiusMeters: 0,
    pois: [],
    selectedPoiId: null,
    outOfReach: false,
  },
  thermometer: {
    thermoA: null,
    thermoB: null,
    answer: null,
    targetDistanceMeters: 0,
    walkCurrentPoint: null,
    walkActive: false,
  },
  measuring: {
    seekerPoint: null,
    targetPoint: null,
    eliminationPreview: false,
    seekerResolving: false,
  },
  matching: {
    seekerPoint: null,
    nearestFeaturePoint: null,
    eliminationPreview: false,
    seekerResolving: false,
  },
  zone: { vertices: [] },
};

describe("resolvePlacementPhase", () => {
  it("returns answered when radar has an answer", () => {
    expect(
      resolvePlacementPhase("radar", {
        ...emptyDraft,
        radar: {
          center: [53.35, -6.26],
          radiusMeters: 500,
          answer: "yes",
        },
      }),
    ).toBe("answered");
  });

  it("returns pick_poi when tentacle POIs are available", () => {
    expect(
      resolvePlacementPhase("tentacle", {
        ...emptyDraft,
        tentacle: {
          center: [53.35, -6.26],
          searchRadiusMeters: 400,
          answerRadiusMeters: 400,
          pois: [{ id: "cafe", lat: 53.351, lng: -6.255 }],
          selectedPoiId: null,
          outOfReach: false,
        },
      }),
    ).toBe("pick_poi");
  });
});
