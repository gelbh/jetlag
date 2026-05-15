import { describe, expect, it } from "vitest";
import { parseNominatimResult } from "./geocoding";

describe("geocoding", () => {
  it("parses nominatim bounding boxes into map bounds", () => {
    const place = parseNominatimResult({
      place_id: 42,
      display_name: "Dublin, County Dublin, Ireland",
      lat: "53.3498",
      lon: "-6.2603",
      boundingbox: ["53.2", "53.5", "-6.5", "-6.0"],
    });

    expect(place.displayName).toContain("Dublin");
    expect(place.bounds).toEqual({
      south: 53.2,
      north: 53.5,
      west: -6.5,
      east: -6,
    });
    expect(place.center).toEqual([53.3498, -6.2603]);
    expect(place.boundary).toBeUndefined();
  });

  it("parses administrative boundaries when Nominatim returns geojson", () => {
    const place = parseNominatimResult({
      place_id: 43,
      display_name: "County Dublin, Ireland",
      lat: "53.3498",
      lon: "-6.2603",
      boundingbox: ["53.2", "53.5", "-6.5", "-6.0"],
      geojson: {
        type: "Polygon",
        coordinates: [
          [
            [-6.5, 53.2],
            [-6.0, 53.2],
            [-6.0, 53.5],
            [-6.5, 53.5],
            [-6.5, 53.2],
          ],
        ],
      },
    });

    expect(place.boundary?.type).toBe("Polygon");
    expect(place.boundary?.coordinates[0]).toHaveLength(5);
  });
});
