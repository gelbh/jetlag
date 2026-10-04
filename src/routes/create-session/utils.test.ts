import { describe, expect, it } from "vitest";
import type { GeocodedPlace } from "../../services/geo/geocoding";
import { placeToFocusBounds } from "./utils";

function place(bounds: GeocodedPlace["bounds"]): GeocodedPlace {
  return {
    id: "1",
    displayName: "Amsterdam Rock, Ireland",
    center: [(bounds.south + bounds.north) / 2, (bounds.west + bounds.east) / 2],
    bounds,
    placeCategory: "rock",
    approximateAreaSqMi: 0.01,
  };
}

describe("placeToFocusBounds", () => {
  it("expands a tiny Nominatim bbox so the map strip can pan to it", () => {
    const bounds = placeToFocusBounds(
      place({ south: 51.849, west: -10.391, north: 51.851, east: -10.389 }),
    );
    const [[south, west], [north, east]] = bounds;
    expect(north - south).toBeGreaterThan(0.039);
    expect(east - west).toBeGreaterThan(0.039);
  });

  it("leaves a city-scale bbox unchanged", () => {
    const city = {
      south: 52.28,
      west: 4.73,
      north: 52.43,
      east: 5.08,
    };
    expect(placeToFocusBounds(place(city))).toEqual([
      [city.south, city.west],
      [city.north, city.east],
    ]);
  });
});
