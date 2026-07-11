import { describe, expect, it, vi } from "vitest";
import { milesToMeters } from "../map/distance";
import {
  computeHiderTruthReply,
  computeHiderTruthReplyAsync,
} from "./hiderTruthAnswer";
import type { PendingQuestionRecord } from "../session/sessionChat";

vi.mock("../../services/geo/elevation", () => ({
  fetchElevations: vi.fn(async (points: [number, number][]) =>
    points.map(() => 10),
  ),
}));

const stationInside: [number, number] = [51.45, -0.15];
const stationOutside: [number, number] = [51.42, -0.18];
const stationGpsOnly: [number, number] = [51.48, -0.12];

function basePending(
  overrides: Partial<PendingQuestionRecord> = {},
): PendingQuestionRecord {
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
    const result = computeHiderTruthReply(
      basePending(),
      null,
    );

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

    const fromStation = computeHiderTruthReply(
      pending,
      stationInside,
    );
    const fromGps = computeHiderTruthReply(pending, stationGpsOnly);

    expect(fromStation?.replyId).toBe("yes");
    expect(fromGps?.replyId).toBe("no");
  });

  it("radar treats radius boundary as inside (inclusive)", () => {
    const seeker: [number, number] = [51.45, -0.15];
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
        metadata: { radiusMeters: 0 },
      },
    });

    const result = computeHiderTruthReply(pending, seeker);
    expect(result?.replyId).toBe("yes");
  });

  it("radar answers no when station is outside the circle", () => {
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

    const result = computeHiderTruthReply(
      pending,
      stationOutside,
    );
    expect(result?.replyId).toBe("no");
  });

  it("thermometer picks colder on equidistant tie", () => {
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

    const result = computeHiderTruthReply(
      pending,
      [51.45, -0.15],
    );
    expect(result?.replyId).toBe("colder");
  });

  it("thermometer picks hotter when station is closer to walk end", () => {
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

    const result = computeHiderTruthReply(
      pending,
      [51.45, -0.145],
    );
    expect(result?.replyId).toBe("hotter");
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

    const result = computeHiderTruthReply(
      pending,
      stationInside,
    );
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
          poisJson: JSON.stringify([
            { id: "poi-1", name: "Museum A", lat: 51.451, lng: -0.149 },
          ]),
        },
      },
    });

    const result = computeHiderTruthReply(
      pending,
      [51.5, -0.15],
    );
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
          poisJson: JSON.stringify([
            { id: "poi-1", name: "Museum A", lat: 51.451, lng: -0.149 },
          ]),
        },
      },
    });

    const result = computeHiderTruthReply(
      pending,
      [51.456, -0.15],
    );
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

  it("measuring compares distance to a point target", () => {
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
          measuringAnchor: { lat: 51.45, lng: -0.15 },
          measuringRegionInputJson: JSON.stringify({
            gameArea: { type: "Polygon", coordinates: [] },
            measuringSubject: "location",
            measuringLocationCategory: "museum",
            measuringDistanceMeters: 1000,
            measuringTargetPoint: [51.46, -0.14],
            measuringPlaces: [],
            measuringCoastSegments: [],
            measuringSeaLevelNearRegion: null,
            usesAllPlacesInArea: false,
          }),
        },
      },
    });

    const result = computeHiderTruthReply(pending, [51.455, -0.145]);
    expect(result?.replyId).toBe("closer");
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
