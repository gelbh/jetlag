import { describe, expect, it } from "vitest";
import turfCircle from "@turf/circle";
import { point as turfPoint } from "@turf/helpers";
import type { Feature, Polygon as GeoPolygon } from "geojson";
import {
  boundingBoxFromDraftOverlays,
  boundingBoxFromPositions,
  unionBoundingBoxes,
} from "./draftOverlayBounds";
import type { MapDraftOverlay } from "../../map/mapDraftOverlay";

describe("boundingBoxFromPositions", () => {
  it("returns null for empty input", () => {
    expect(boundingBoxFromPositions([])).toBeNull();
  });

  it("builds a box from multiple positions", () => {
    const box = boundingBoxFromPositions([
      [53.34, -6.27],
      [53.36, -6.25],
    ]);

    expect(box).not.toBeNull();
    expect(box!.south).toBeLessThanOrEqual(53.34);
    expect(box!.north).toBeGreaterThanOrEqual(53.36);
    expect(box!.west).toBeLessThanOrEqual(-6.27);
    expect(box!.east).toBeGreaterThanOrEqual(-6.25);
  });
});

describe("unionBoundingBoxes", () => {
  it("expands to include both boxes", () => {
    const a = { south: 53.34, west: -6.27, north: 53.35, east: -6.26 };
    const b = { south: 53.36, west: -6.25, north: 53.37, east: -6.24 };
    const union = unionBoundingBoxes(a, b);

    expect(union.south).toBeLessThanOrEqual(a.south);
    expect(union.north).toBeGreaterThanOrEqual(b.north);
    expect(union.west).toBeLessThanOrEqual(a.west);
    expect(union.east).toBeGreaterThanOrEqual(b.east);
  });
});

describe("boundingBoxFromDraftOverlays", () => {
  it("returns null for empty overlays", () => {
    expect(boundingBoxFromDraftOverlays([])).toBeNull();
  });

  it("unions marker, circle, and polyline overlays with buffer", () => {
    const overlays: MapDraftOverlay[] = [
      {
        kind: "marker",
        id: "pin-draft",
        point: [53.35, -6.26],
      },
      {
        kind: "circle",
        id: "radar-draft-range",
        center: [53.351, -6.261],
        radiusMeters: 500,
        style: { dashArray: "6 6" },
      },
      {
        kind: "polyline",
        id: "thermo-draft-axis",
        positions: [
          [53.35, -6.26],
          [53.352, -6.258],
        ],
      },
    ];

    const box = boundingBoxFromDraftOverlays(overlays, 50);
    expect(box).not.toBeNull();
    expect(box!.north - box!.south).toBeGreaterThan(0);
    expect(box!.east - box!.west).toBeGreaterThan(0);
  });

  it("includes polygon ring coordinates", () => {
    const feature = turfCircle(turfPoint([-6.26, 53.35]), 0.2, {
      steps: 8,
      units: "kilometers",
    }) as Feature<GeoPolygon>;

    const overlays: MapDraftOverlay[] = [
      {
        kind: "polygon",
        id: "zone-draft",
        feature,
        layer: "decoration",
      },
    ];

    expect(boundingBoxFromDraftOverlays(overlays)).not.toBeNull();
  });
});
