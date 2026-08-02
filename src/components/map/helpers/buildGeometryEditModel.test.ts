import { describe, expect, it } from "vitest";
import type { Feature, Point, Polygon } from "geojson";
import type { AnnotationRecord, GameArea } from "../../../domain/map/annotations";
import { buildGeometryEditModel } from "./buildGeometryEditModel";

const gameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-6.4, 53.2],
      [-6.1, 53.2],
      [-6.1, 53.5],
      [-6.4, 53.5],
      [-6.4, 53.2],
    ],
  ],
};

function baseAnnotation(
  type: AnnotationRecord["type"],
  metadata: Partial<AnnotationRecord["metadata"]> = {},
): AnnotationRecord {
  return {
    id: "a1",
    sessionId: "s1",
    type,
    geometry: {
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [-6.26, 53.34] },
    },
    metadata: {
      createdAt: "2026-01-01T00:00:00.000Z",
      ...metadata,
    },
    status: "active",
  };
}

describe("buildGeometryEditModel", () => {
  it("builds a radar model from draft point + radius", () => {
    const draft: Feature<Point> = {
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [-6.26, 53.34] },
    };
    const model = buildGeometryEditModel(
      baseAnnotation("radar", { radiusMeters: 500 }),
      draft,
      gameArea,
    );
    expect(model).toMatchObject({
      kind: "radar",
      center: [53.34, -6.26],
      radiusMeters: 500,
    });
  });

  it("computes tentacle out-of-reach disk once in the model", () => {
    const draft: Feature<Point> = {
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [-6.26, 53.34] },
    };
    const model = buildGeometryEditModel(
      baseAnnotation("tentacle", {
        radiusMeters: 1000,
        tentacleOutOfReach: true,
      }),
      draft,
      gameArea,
    );
    expect(model.kind).toBe("tentacle");
    if (model.kind !== "tentacle") {
      return;
    }
    expect(model.outOfReach).toBe(true);
    expect(model.noRadarDisk?.geometry.type).toBe("Polygon");
    expect(model.yesRadarOutside).toBeNull();
  });

  it("builds zone ring vertices from the draft polygon", () => {
    const draft: Feature<Polygon> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-6.3, 53.3],
            [-6.2, 53.3],
            [-6.2, 53.4],
            [-6.3, 53.4],
            [-6.3, 53.3],
          ],
        ],
      },
    };
    const model = buildGeometryEditModel(
      baseAnnotation("zone"),
      draft,
      gameArea,
    );
    expect(model.kind).toBe("zone");
    if (model.kind !== "zone") {
      return;
    }
    expect(model.ringLatLng[0]).toEqual([53.3, -6.3]);
    expect(model.ringLatLng).toHaveLength(5);
  });
});
