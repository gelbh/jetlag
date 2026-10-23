import type { Feature, LineString } from "geojson";
import { describe, expect, it, vi } from "vitest";
import { destinationPoint } from "../../geometry/core/geodesicPrimitives";
import {
  nearestPointToCoastlines,
  prepareMeasuringLineSegments,
} from "../../geometry/measuring/geometryMeasuring";
import type { GameArea } from "../../map/annotations";
import { milesToMeters } from "../../map/distance";
import type { PendingQuestionRecord } from "../../session/activity/sessionChat";
import { computeHiderTruthReply, computeHiderTruthReplyAsync } from "./index";
import { NEAR_ELIMINATION_EDGE_METERS, NEAR_RADAR_EDGE_METERS } from "./nearRadarEliminationEdge";
import {
  UNAVAILABLE_MEASURING_EDGE_GAP,
  UNAVAILABLE_RADAR_EDGE_GAP,
  UNAVAILABLE_THERMOMETER_EDGE_GAP,
} from "./shared";

vi.mock("@/services/geo/elevation", () => ({
  fetchElevations: vi.fn(async (points: [number, number][]) => points.map(() => 10)),
}));

const dublinCoastTruthGameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-6.35, 53.34],
      [-6.15, 53.34],
      [-6.15, 53.38],
      [-6.35, 53.38],
      [-6.35, 53.34],
    ],
  ],
};

const stationInside: [number, number] = [51.45, -0.15];
const stationOutside: [number, number] = [51.42, -0.18];
const stationGpsOnly: [number, number] = [51.48, -0.12];

function basePending(overrides: Partial<PendingQuestionRecord> = {}): PendingQuestionRecord {
  return {
    id: "pq-1",
    sessionId: "session-1",
    toolType: "radar",
    createdByUid: "seeker",
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "pending",
    placement: {
      geometryJson: "",
      metadata: {},
    },
    replyOptions: [
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
    ],
    promptText: "Are you within 1 mile of me?",
    ...overrides,
  };
}

describe("computeHiderTruthReply", () => {
  it("returns unavailable when hiding zone is not set", () => {
    const result = computeHiderTruthReply(basePending(), null);

    expect(result?.unavailable).toBe(true);
    expect(result?.label).toMatch(/set your hiding zone/i);
  });

  it("uses station center only; GPS-only point does not affect radar truth", () => {
    const pending = basePending({
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [-0.15, 51.45],
          },
        }),
        metadata: { radiusMeters: 500 },
      },
    });

    const fromStation = computeHiderTruthReply(pending, stationInside);
    const fromGps = computeHiderTruthReply(pending, stationGpsOnly);

    expect(fromStation?.replyId).toBe("yes");
    expect(fromGps?.replyId).toBe("no");
  });

  it("radar treats clear inside of the circle as yes (inclusive of deep interior)", () => {
    const seeker: [number, number] = [51.45, -0.15];
    const radiusMeters = 2000;
    const station = destinationPoint(seeker, radiusMeters - (NEAR_RADAR_EDGE_METERS + 1), 0);
    const pending = basePending({
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [seeker[1], seeker[0]],
          },
        }),
        metadata: { radiusMeters },
      },
    });

    const result = computeHiderTruthReply(pending, station);
    expect(result?.replyId).toBe("yes");
    expect(result?.unavailable).toBeUndefined();
  });

  it("radar withholds auto-answer when the centre sits on the circumference", () => {
    const seeker: [number, number] = [51.45, -0.15];
    const radiusMeters = 2000;
    const station = destinationPoint(seeker, radiusMeters, 0);
    const pending = basePending({
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [seeker[1], seeker[0]],
          },
        }),
        metadata: { radiusMeters },
      },
    });

    const result = computeHiderTruthReply(pending, station);
    expect(result?.unavailable).toBe(true);
    expect(result?.label).toBe(UNAVAILABLE_RADAR_EDGE_GAP);
  });

  it("radar withholds auto-answer within 50 m inside or outside the circumference", () => {
    const seeker: [number, number] = [51.45, -0.15];
    const radiusMeters = 2000;
    const pending = basePending({
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [seeker[1], seeker[0]],
          },
        }),
        metadata: { radiusMeters },
      },
    });

    const inside = destinationPoint(seeker, radiusMeters - NEAR_RADAR_EDGE_METERS, 0);
    const outside = destinationPoint(seeker, radiusMeters + (NEAR_RADAR_EDGE_METERS - 1), 0);
    expect(computeHiderTruthReply(pending, inside)?.unavailable).toBe(true);
    expect(computeHiderTruthReply(pending, outside)?.unavailable).toBe(true);
  });

  it("radar answers no when station is clearly outside the circle", () => {
    const pending = basePending({
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [-0.15, 51.45],
          },
        }),
        metadata: { radiusMeters: 100 },
      },
    });

    const result = computeHiderTruthReply(pending, stationOutside);
    expect(result?.replyId).toBe("no");
  });

  it("thermometer withholds auto-answer on the equidistant flip", () => {
    const pending = basePending({
      toolType: "thermometer",
      replyOptions: [
        { id: "hotter", label: "Hotter" },
        { id: "colder", label: "Colder" },
      ],
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [-0.16, 51.45],
              [-0.14, 51.45],
            ],
          },
        }),
        metadata: {},
      },
    });

    const result = computeHiderTruthReply(pending, [51.45, -0.15]);
    expect(result?.unavailable).toBe(true);
    expect(result?.label).toBe(UNAVAILABLE_THERMOMETER_EDGE_GAP);
  });

  it("thermometer picks hotter when clearly closer to walk end", () => {
    const pending = basePending({
      toolType: "thermometer",
      replyOptions: [
        { id: "hotter", label: "Hotter" },
        { id: "colder", label: "Colder" },
      ],
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [-0.18, 51.45],
              [-0.14, 51.45],
            ],
          },
        }),
        metadata: {},
      },
    });

    const result = computeHiderTruthReply(pending, [51.45, -0.141]);
    expect(result?.unavailable).toBeUndefined();
    expect(result?.replyId).toBe("hotter");
  });

  it("thermometer withholds auto-answer within 50 m of the flip", () => {
    const start: [number, number] = [51.45, -0.18];
    const end: [number, number] = [51.45, -0.14];
    const midpoint: [number, number] = [51.45, -0.16];
    const nearFlip = destinationPoint(midpoint, NEAR_ELIMINATION_EDGE_METERS - 1, 90);
    const pending = basePending({
      toolType: "thermometer",
      replyOptions: [
        { id: "hotter", label: "Hotter" },
        { id: "colder", label: "Colder" },
      ],
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [start[1], start[0]],
              [end[1], end[0]],
            ],
          },
        }),
        metadata: {},
      },
    });

    expect(computeHiderTruthReply(pending, nearFlip)?.unavailable).toBe(true);
  });

  it("matching returns null when station has no nearest feature and null is allowed", () => {
    const pending = basePending({
      toolType: "matching",
      replyOptions: [
        { id: "yes", label: "Yes" },
        { id: "no", label: "No" },
        { id: "null", label: "Null (not in play area)" },
      ],
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-0.15, 51.45] },
        }),
        metadata: {
          matchingCategory: "museum",
          matchingNearestFeatureId: "poi-seeker",
          matchingFeaturesJson: JSON.stringify([]),
        },
      },
    });

    const result = computeHiderTruthReply(pending, stationInside);
    expect(result?.replyId).toBe("null");
  });

  it("tentacle returns out-of-reach when station is outside answer radius", () => {
    const pending = basePending({
      toolType: "tentacle",
      replyOptions: [
        { id: "poi-1", label: "Museum A" },
        { id: "out-of-reach", label: "Not within reach" },
      ],
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-0.15, 51.45] },
        }),
        metadata: {
          radiusMeters: milesToMeters(1),
          centerJson: JSON.stringify({ lat: 51.45, lng: -0.15 }),
          poisJson: JSON.stringify([{ id: "poi-1", name: "Museum A", lat: 51.451, lng: -0.149 }]),
        },
      },
    });

    const result = computeHiderTruthReply(pending, [51.5, -0.15]);
    expect(result?.replyId).toBe("out-of-reach");
  });

  it("tentacle uses metadata radius for out-of-reach threshold", () => {
    const shortRadius = 500;
    const pending = basePending({
      toolType: "tentacle",
      replyOptions: [
        { id: "poi-1", label: "Museum A" },
        { id: "out-of-reach", label: "Not within reach" },
      ],
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-0.15, 51.45] },
        }),
        metadata: {
          radiusMeters: shortRadius,
          centerJson: JSON.stringify({ lat: 51.45, lng: -0.15 }),
          poisJson: JSON.stringify([{ id: "poi-1", name: "Museum A", lat: 51.451, lng: -0.149 }]),
        },
      },
    });

    const result = computeHiderTruthReply(pending, [51.456, -0.15]);
    expect(result?.replyId).toBe("out-of-reach");
  });

  it("matching answers yes when station shares seeker nearest feature", () => {
    const pending = basePending({
      toolType: "matching",
      replyOptions: [
        { id: "yes", label: "Yes" },
        { id: "no", label: "No" },
      ],
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-0.15, 51.45] },
        }),
        metadata: {
          matchingCategory: "museum",
          matchingNearestFeatureId: "poi-a",
          matchingFeaturesJson: JSON.stringify([
            {
              id: "poi-a",
              name: "Museum A",
              lat: 51.4505,
              lng: -0.1495,
              point: [51.4505, -0.1495],
            },
            {
              id: "poi-b",
              name: "Museum B",
              lat: 51.48,
              lng: -0.12,
              point: [51.48, -0.12],
            },
          ]),
        },
      },
    });

    const result = computeHiderTruthReply(pending, stationInside);
    expect(result?.replyId).toBe("yes");
  });

  it("coastline measuring withholds auto-answer on equal nearest-coast distances", () => {
    const coastSegment = {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-6.3, 53.35],
          [-6.2, 53.35],
        ],
      },
    };
    const equidistantPoint: [number, number] = [53.36, -6.25];
    const pending = basePending({
      toolType: "measuring",
      replyOptions: [
        { id: "closer", label: "Closer" },
        { id: "further", label: "Further" },
      ],
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-6.25, 53.36] },
        }),
        metadata: {
          measuringAnchor: { lat: equidistantPoint[0], lng: equidistantPoint[1] },
          measuringRegionInputJson: JSON.stringify({
            gameArea: dublinCoastTruthGameArea,
            measuringSubject: "coastline",
            measuringDistanceMeters: 4567,
            measuringTargetPoint: null,
            measuringPlaces: [],
            measuringCoastSegments: [coastSegment],
            measuringSeaLevelNearRegion: null,
            usesAllPlacesInArea: false,
          }),
        },
      },
    });

    const result = computeHiderTruthReply(pending, equidistantPoint, dublinCoastTruthGameArea);
    expect(result?.unavailable).toBe(true);
    expect(result?.label).toBe(UNAVAILABLE_MEASURING_EDGE_GAP);
  });

  it("coastline truth at hiding-zone center is closer than seeker anchor", () => {
    const coastSegment = {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-6.3, 53.35],
          [-6.2, 53.35],
        ],
      },
    };
    const zoneCenter: [number, number] = [53.36, -6.25];
    const pending = basePending({
      toolType: "measuring",
      replyOptions: [
        { id: "closer", label: "Closer" },
        { id: "further", label: "Further" },
      ],
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-6.25, 53.33] },
        }),
        metadata: {
          measuringAnchor: { lat: 53.33, lng: -6.25 },
          measuringRegionInputJson: JSON.stringify({
            gameArea: dublinCoastTruthGameArea,
            measuringSubject: "coastline",
            measuringDistanceMeters: 4567,
            measuringTargetPoint: null,
            measuringPlaces: [],
            measuringCoastSegments: [coastSegment],
            measuringSeaLevelNearRegion: null,
            usesAllPlacesInArea: false,
          }),
        },
      },
    });

    expect(computeHiderTruthReply(pending, zoneCenter, dublinCoastTruthGameArea)?.replyId).toBe(
      "closer",
    );
    expect(computeHiderTruthReply(pending, [53.32, -6.25], dublinCoastTruthGameArea)?.replyId).toBe(
      "further",
    );
  });

  it("coastline truth ignores segments outside session game area (prepared set)", () => {
    const coastInPlayArea: Feature<LineString> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [-6.3, 53.35],
          [-6.2, 53.35],
        ],
      },
    };
    const coastOutsidePlayArea: Feature<LineString> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [-0.5, 51.2],
          [-0.4, 51.2],
        ],
      },
    };
    const segments = [coastInPlayArea, coastOutsidePlayArea];
    const prepared = prepareMeasuringLineSegments(segments, dublinCoastTruthGameArea);
    expect(prepared.segments).toHaveLength(1);

    const station: [number, number] = [53.36, -6.25];
    const seeker: [number, number] = [53.33, -6.25];
    const preparedStationDistance = nearestPointToCoastlines(
      station,
      prepared.segments,
      prepared,
    )?.distanceMeters;
    const preparedSeekerDistance = nearestPointToCoastlines(
      seeker,
      prepared.segments,
      prepared,
    )?.distanceMeters;
    expect(preparedStationDistance).toBeDefined();
    expect(preparedSeekerDistance).toBeDefined();
    expect(preparedStationDistance!).toBeLessThan(preparedSeekerDistance!);

    const pending = basePending({
      toolType: "measuring",
      replyOptions: [
        { id: "closer", label: "Closer" },
        { id: "further", label: "Further" },
      ],
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-6.25, 53.33] },
        }),
        metadata: {
          measuringAnchor: { lat: seeker[0], lng: seeker[1] },
          measuringRegionInputJson: JSON.stringify({
            gameArea: dublinCoastTruthGameArea,
            measuringSubject: "coastline",
            measuringDistanceMeters: 4567,
            measuringTargetPoint: null,
            measuringPlaces: [],
            measuringCoastSegments: segments,
            measuringSeaLevelNearRegion: null,
            usesAllPlacesInArea: false,
          }),
        },
      },
    });

    expect(computeHiderTruthReply(pending, station, dublinCoastTruthGameArea)?.replyId).toBe(
      "closer",
    );
  });

  it("measuring compares distance to a point target", () => {
    const target: [number, number] = [51.46, -0.14];
    const seeker: [number, number] = [51.45, -0.15];
    // Deep inside the seeker-radius circle so the flip gap exceeds 50 m.
    const station = destinationPoint(target, 100, 0);
    const pending = basePending({
      toolType: "measuring",
      replyOptions: [
        { id: "closer", label: "Closer" },
        { id: "further", label: "Further" },
      ],
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [seeker[1], seeker[0]] },
        }),
        metadata: {
          measuringAnchor: { lat: seeker[0], lng: seeker[1] },
          measuringRegionInputJson: JSON.stringify({
            gameArea: { type: "Polygon", coordinates: [] },
            measuringSubject: "location",
            measuringLocationCategory: "museum",
            measuringDistanceMeters: 1000,
            measuringTargetPoint: target,
            measuringPlaces: [],
            measuringCoastSegments: [],
            measuringSeaLevelNearRegion: null,
            usesAllPlacesInArea: false,
          }),
        },
      },
    });

    const result = computeHiderTruthReply(pending, station);
    expect(result?.unavailable).toBeUndefined();
    expect(result?.replyId).toBe("closer");
  });

  it("measuring withholds auto-answer within 50 m of the point-target flip", () => {
    const target: [number, number] = [51.45, -0.15];
    const seeker = destinationPoint(target, 2000, 0);
    const onEdge = destinationPoint(target, 2000, 90);
    const pending = basePending({
      toolType: "measuring",
      replyOptions: [
        { id: "closer", label: "Closer" },
        { id: "further", label: "Further" },
      ],
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [seeker[1], seeker[0]] },
        }),
        metadata: {
          measuringAnchor: { lat: seeker[0], lng: seeker[1] },
          measuringRegionInputJson: JSON.stringify({
            gameArea: { type: "Polygon", coordinates: [] },
            measuringSubject: "location",
            measuringLocationCategory: "museum",
            measuringDistanceMeters: 2000,
            measuringTargetPoint: target,
            measuringPlaces: [],
            measuringCoastSegments: [],
            measuringSeaLevelNearRegion: null,
            usesAllPlacesInArea: false,
          }),
        },
      },
    });

    const result = computeHiderTruthReply(pending, onEdge);
    expect(result?.unavailable).toBe(true);
    expect(result?.label).toBe(UNAVAILABLE_MEASURING_EDGE_GAP);
  });

  it("measuring withholds auto-answer within 50 m for all-places flip", () => {
    const placePoint: [number, number] = [51.45, -0.15];
    const seeker = destinationPoint(placePoint, 2000, 0);
    const nearFlip = destinationPoint(placePoint, 2000 - (NEAR_ELIMINATION_EDGE_METERS - 1), 0);
    const pending = basePending({
      toolType: "measuring",
      replyOptions: [
        { id: "closer", label: "Closer" },
        { id: "further", label: "Further" },
      ],
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [seeker[1], seeker[0]] },
        }),
        metadata: {
          measuringAnchor: { lat: seeker[0], lng: seeker[1] },
          measuringRegionInputJson: JSON.stringify({
            measuringSubject: "location",
            measuringLocationCategory: "museum",
            measuringDistanceMeters: 2000,
            measuringTargetPoint: null,
            measuringPlaces: [{ id: "p1", name: "Place", point: placePoint }],
            measuringCoastSegments: [],
            measuringSeaLevelNearRegion: null,
            usesAllPlacesInArea: true,
          }),
        },
      },
    });

    expect(computeHiderTruthReply(pending, nearFlip)?.unavailable).toBe(true);
  });

  it("tentacle picks nearest poi when station is within reach", () => {
    const pending = basePending({
      toolType: "tentacle",
      replyOptions: [
        { id: "poi-1", label: "Museum A" },
        { id: "poi-2", label: "Museum B" },
        { id: "out-of-reach", label: "Not within reach" },
      ],
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-0.15, 51.45] },
        }),
        metadata: {
          centerJson: JSON.stringify({ lat: 51.45, lng: -0.15 }),
          poisJson: JSON.stringify([
            { id: "poi-1", name: "Museum A", lat: 51.451, lng: -0.149 },
            { id: "poi-2", name: "Museum B", lat: 51.47, lng: -0.14 },
          ]),
        },
      },
    });

    const result = computeHiderTruthReply(pending, stationInside);
    expect(result?.replyId).toBe("poi-1");
  });

  it("sea level async compares elevation at station vs seeker anchor", async () => {
    const pending = basePending({
      toolType: "measuring",
      replyOptions: [
        { id: "closer", label: "Closer" },
        { id: "further", label: "Further" },
      ],
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-0.15, 51.45] },
        }),
        metadata: {
          measuringSubject: "sea_level",
          measuringAnchor: { lat: 51.45, lng: -0.15 },
          measuringAnchorAltitudeMeters: 50,
        },
      },
    });

    const result = await computeHiderTruthReplyAsync(pending, stationInside);
    expect(result?.replyId).toBe("closer");
  });
});
