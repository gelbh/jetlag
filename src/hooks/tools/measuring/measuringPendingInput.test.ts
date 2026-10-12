import type { Feature, LineString, Polygon } from "geojson";
import { describe, expect, it } from "vitest";
import type { MeasuringPlace } from "@/domain/geo/types";
import { measuringQuestionFor } from "@/domain/questions";
import { buildMeasuringPendingInput } from "./measuringPendingInput";

const base = {
  seekerPoint: [51.5, -0.1] as [number, number],
  distanceMeters: 1200,
  targetPoint: null,
  targetName: null,
  places: [] as MeasuringPlace[],
  coastSegments: [] as Feature<LineString>[],
  seaLevelNearRegion: null,
  anchorElevationMeters: null,
  usesAllPlacesInArea: false,
  cardDraw: 3,
  cardKeep: 1,
};

const airports: MeasuringPlace[] = [
  { id: "a", name: "Heathrow", point: [51.47, -0.45] },
  { id: "b", name: "City", point: [51.5, 0.05] },
];

function metadataOf(input: ReturnType<typeof buildMeasuringPendingInput>) {
  return input.placement?.metadata as Record<string, unknown>;
}

describe("buildMeasuringPendingInput", () => {
  it("builds the all-places payload with places JSON and empty region places", () => {
    const pending = buildMeasuringPendingInput({
      ...base,
      subject: "location",
      locationCategory: "commercial_airport",
      targetPoint: [51.47, -0.45],
      targetName: "2 commercial airports",
      places: airports,
      usesAllPlacesInArea: true,
    });

    expect(pending.promptText).toBe(measuringQuestionFor("location", "commercial_airport").prompt);
    expect(pending.replyOptions).toEqual([
      { id: "closer", label: "Closer" },
      { id: "further", label: "Further" },
    ]);
    expect(pending.cardDraw).toBe(3);
    expect(pending.cardKeep).toBe(1);
    expect(pending.placement?.geometryJson).toBe(
      JSON.stringify({
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [-0.1, 51.5] },
      }),
    );
    const metadata = metadataOf(pending);
    expect(metadata).toMatchObject({
      measuringSubject: "location",
      measuringLocationCategory: "commercial_airport",
      measuringDistanceMeters: 1200,
      measuringAnchor: { lat: 51.5, lng: -0.1 },
      measuringCoastPoint: { lat: 51.47, lng: -0.45 },
      measuringTargetName: "2 commercial airports",
    });
    expect(JSON.parse(metadata.measuringPlacesJson as string)).toEqual([
      { id: "a", name: "Heathrow", lat: 51.47, lng: -0.45 },
      { id: "b", name: "City", lat: 51.5, lng: 0.05 },
    ]);
    const regionInput = JSON.parse(metadata.measuringRegionInputJson as string);
    expect(regionInput.measuringPlaces).toEqual([]);
    expect(regionInput.usesAllPlacesInArea).toBe(true);
  });

  it("builds the coastline payload with the coast point and segments", () => {
    const segment: Feature<LineString> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [1, 50],
          [1.1, 50.1],
        ],
      },
    };
    const metadata = metadataOf(
      buildMeasuringPendingInput({
        ...base,
        subject: "coastline",
        locationCategory: "commercial_airport",
        targetPoint: [50.05, 1.05],
        targetName: "Coast",
        coastSegments: [segment],
      }),
    );

    expect(metadata.measuringLocationCategory).toBeUndefined();
    expect(metadata.measuringCoastPoint).toEqual({ lat: 50.05, lng: 1.05 });
    expect(metadata.measuringPlacesJson).toBeUndefined();
    const regionInput = JSON.parse(metadata.measuringRegionInputJson as string);
    expect(regionInput.measuringCoastSegments).toEqual([segment]);
    expect(regionInput.measuringLocationCategory).toBe("commercial_airport");
  });

  it("builds the sea level payload with the fixed name and anchor altitude", () => {
    const nearRegion: Feature<Polygon> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 0],
          ],
        ],
      },
    };
    const pending = buildMeasuringPendingInput({
      ...base,
      subject: "sea_level",
      locationCategory: "commercial_airport",
      seaLevelNearRegion: nearRegion,
      anchorElevationMeters: 42,
    });
    const metadata = metadataOf(pending);

    expect(pending.promptText).toBe(measuringQuestionFor("sea_level").prompt);
    expect(metadata.measuringTargetName).toBe("Sea level");
    expect(metadata.measuringAnchorAltitudeMeters).toBe(42);
    expect(metadata.measuringCoastPoint).toEqual({ lat: 51.5, lng: -0.1 });
    const regionInput = JSON.parse(metadata.measuringRegionInputJson as string);
    expect(regionInput.measuringSeaLevelNearRegion).toEqual(nearRegion);
  });
});
