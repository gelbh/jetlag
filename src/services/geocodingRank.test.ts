import { describe, expect, it } from "vitest";
import type { GeocodedPlace } from "./geocoding";
import {
  formatPlaceSearchSubtitle,
  placeCategoryLabel,
  rankGeocodedPlaceCandidates,
} from "./geocodingRank";

function samplePlace(
  overrides: Partial<GeocodedPlace> & Pick<GeocodedPlace, "id" | "displayName">,
): GeocodedPlace {
  return {
    bounds: { south: 53.2, west: -6.5, north: 53.5, east: -6.0 },
    center: [53.35, -6.26],
    placeCategory: "place",
    approximateAreaSqMi: 50,
    ...overrides,
  };
}

describe("geocodingRank", () => {
  it("labels administrative boundaries distinctly", () => {
    expect(placeCategoryLabel({ addresstype: "administrative" })).toBe(
      "administrative area",
    );
    expect(placeCategoryLabel({ type: "administrative" })).toBe(
      "administrative area",
    );
    expect(placeCategoryLabel({ class: "boundary" })).toBe(
      "administrative area",
    );
  });

  it("prefers addresstype for settlement categories", () => {
    expect(placeCategoryLabel({ addresstype: "city" })).toBe("city");
    expect(placeCategoryLabel({ addresstype: "town" })).toBe("town");
  });

  it("formats search subtitles with category and area", () => {
    const place = samplePlace({
      id: "1",
      displayName: "Prince Rupert, BC",
      placeCategory: "city",
      approximateAreaSqMi: 8.2,
    });

    expect(formatPlaceSearchSubtitle(place)).toBe("city · ~8 sq mi");
  });

  it("ranks city results ahead of county results for the same query", () => {
    const ranked = rankGeocodedPlaceCandidates(
      [
        {
          place: samplePlace({
            id: "county",
            displayName: "Prince Rupert, Regional District, BC",
            placeCategory: "county",
            approximateAreaSqMi: 120,
          }),
          importance: 0.5,
          fromCityQuery: false,
        },
        {
          place: samplePlace({
            id: "city",
            displayName: "Prince Rupert, BC, Canada",
            placeCategory: "city",
            approximateAreaSqMi: 12,
          }),
          importance: 0.4,
          fromCityQuery: true,
        },
      ],
      "Prince Rupert",
    );

    expect(ranked[0]?.id).toBe("city");
    expect(ranked[1]?.id).toBe("county");
  });

  it("prefers smaller areas when category and name match tie", () => {
    const ranked = rankGeocodedPlaceCandidates(
      [
        {
          place: samplePlace({
            id: "large",
            displayName: "Dublin, Ireland",
            placeCategory: "city",
            approximateAreaSqMi: 200,
          }),
          importance: 0.6,
          fromCityQuery: false,
        },
        {
          place: samplePlace({
            id: "small",
            displayName: "Dublin, Ireland",
            placeCategory: "city",
            approximateAreaSqMi: 40,
          }),
          importance: 0.5,
          fromCityQuery: true,
        },
      ],
      "Dublin",
    );

    expect(ranked[0]?.id).toBe("small");
  });
});
