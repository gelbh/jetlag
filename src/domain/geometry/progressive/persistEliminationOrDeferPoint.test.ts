import type { Feature, Point, Polygon } from "geojson";
import { describe, expect, it, vi } from "vitest";
import { persistEliminationOrDeferPoint } from "./persistEliminationOrDeferPoint";
import type { PersistSlimPolygonResult } from "./persistSlim";

function samplePolygon(): Feature<Polygon> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
    },
  };
}

function samplePoint(): Feature<Point> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Point",
      coordinates: [-0.15, 51.45],
    },
  };
}

describe("persistEliminationOrDeferPoint", () => {
  it("returns stored geometry when slim succeeds", () => {
    const elimination = samplePolygon();
    const slim = vi.fn((): PersistSlimPolygonResult => ({ ok: true, feature: elimination }));

    const result = persistEliminationOrDeferPoint({
      elimination,
      deferPoint: null,
      slim,
    });

    expect(slim).toHaveBeenCalledWith(elimination);
    expect(result).toEqual({ kind: "stored", geometry: elimination });
  });

  it("returns deferred Point when slim fails", () => {
    const elimination = samplePolygon();
    const deferPoint = samplePoint();
    const slim = vi.fn((): PersistSlimPolygonResult => ({
      ok: false,
      message: "too large",
    }));

    const result = persistEliminationOrDeferPoint({ elimination, deferPoint, slim });

    expect(slim).toHaveBeenCalledWith(elimination);
    expect(result).toEqual({ kind: "deferred", geometry: deferPoint });
  });

  it("returns unavailable when slim fails and defer Point is missing", () => {
    const elimination = samplePolygon();
    const slim = vi.fn((): PersistSlimPolygonResult => ({
      ok: false,
      message: "too large",
    }));

    const result = persistEliminationOrDeferPoint({
      elimination,
      deferPoint: null,
      slim,
    });

    expect(result).toEqual({ kind: "unavailable" });
  });
});
