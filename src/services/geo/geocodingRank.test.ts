import { describe, expect, it } from "vitest";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import type { GeocodedPlace } from "./geocoding";
import {
  formatPlaceSearchSubtitle,
  mergeRankedGeocodedPlaceCandidates,
  placeBoundsFingerprint,
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

  it("fingerprints identical bounds to the same key", () => {
    const bounds = { south: 53.2, west: -6.5, north: 53.5, east: -6.0 };
    const left = samplePlace({ id: "1", displayName: "A", bounds });
    const right = samplePlace({ id: "2", displayName: "B", bounds });

    expect(placeBoundsFingerprint(left)).toBe(placeBoundsFingerprint(right));
  });

  it("fingerprints materially different bounds to different keys", () => {
    const dublin = samplePlace({
      id: "1",
      displayName: "Dublin",
      bounds: { south: 53.2, west: -6.5, north: 53.5, east: -6.0 },
    });
    const ohio = samplePlace({
      id: "2",
      displayName: "Dublin, Ohio",
      bounds: { south: 40.0, west: -83.2, north: 40.2, east: -83.0 },
    });

    expect(placeBoundsFingerprint(dublin)).not.toBe(placeBoundsFingerprint(ohio));
  });

  it("merges duplicate candidates by importance, boundary, and city query", () => {
    const merged = mergeRankedGeocodedPlaceCandidates(
      {
        place: samplePlace({
          id: "low",
          displayName: "County Dublin, Ireland",
          approximateAreaSqMi: 350,
        }),
        importance: 0.4,
        fromCityQuery: false,
      },
      {
        place: samplePlace({
          id: "high",
          displayName: "County Dublin, Leinster, Ireland",
          approximateAreaSqMi: 350,
          boundary: {
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
        }),
        importance: 0.55,
        fromCityQuery: true,
      },
    );

    expect(merged.place.id).toBe("high");
    expect(merged.importance).toBe(0.55);
    expect(merged.fromCityQuery).toBe(true);
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

  it("ranks places containing the user ahead of distant homonyms", () => {
    const dublinCoords: LatLngTuple = [53.35, -6.26];
    const ranked = rankGeocodedPlaceCandidates(
      [
        {
          place: samplePlace({
            id: "dublin-ohio",
            displayName: "Dublin, Ohio, United States",
            center: [40.099, -83.114],
            bounds: { south: 40.0, west: -83.2, north: 40.2, east: -83.0 },
            placeCategory: "city",
            approximateAreaSqMi: 45,
          }),
          importance: 0.7,
          fromCityQuery: false,
        },
        {
          place: samplePlace({
            id: "county-dublin",
            displayName: "County Dublin, Ireland",
            center: [53.35, -6.26],
            bounds: { south: 53.2, west: -6.5, north: 53.5, east: -6.0 },
            placeCategory: "county",
            approximateAreaSqMi: 350,
          }),
          importance: 0.5,
          fromCityQuery: false,
        },
      ],
      "co dublin",
      dublinCoords,
    );

    expect(ranked[0]?.id).toBe("county-dublin");
    expect(ranked[1]?.id).toBe("dublin-ohio");
  });

  it("ranks closer same-name results higher when neither contains the user", () => {
    const nearDublin: LatLngTuple = [53.35, -6.26];
    const ranked = rankGeocodedPlaceCandidates(
      [
        {
          place: samplePlace({
            id: "far",
            displayName: "Dublin, Ireland",
            center: [51.9, -8.5],
            bounds: { south: 51.8, west: -8.6, north: 52.0, east: -8.3 },
            placeCategory: "city",
            approximateAreaSqMi: 40,
          }),
          importance: 0.6,
          fromCityQuery: false,
        },
        {
          place: samplePlace({
            id: "near",
            displayName: "Dublin, Ireland",
            center: [53.35, -6.26],
            bounds: { south: 53.2, west: -6.5, north: 53.5, east: -6.0 },
            placeCategory: "city",
            approximateAreaSqMi: 40,
          }),
          importance: 0.5,
          fromCityQuery: true,
        },
      ],
      "Dublin",
      nearDublin,
    );

    expect(ranked[0]?.id).toBe("near");
    expect(ranked[1]?.id).toBe("far");
  });
});
