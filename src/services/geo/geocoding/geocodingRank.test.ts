import { describe, expect, it } from "vitest";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import {
  formatPlaceSearchSubtitle,
  mergeRankedGeocodedPlaceCandidates,
  placeBoundsFingerprint,
  placeCategoryLabel,
  rankGeocodedPlaceCandidates,
} from "./geocodingRank";
import type { GeocodedPlace } from "./index";

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
    expect(placeCategoryLabel({ addresstype: "administrative" })).toBe("administrative area");
    expect(placeCategoryLabel({ type: "administrative" })).toBe("administrative area");
    expect(placeCategoryLabel({ class: "boundary" })).toBe("administrative area");
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

  it("ranks the famous city ahead of smaller same-name towns", () => {
    const ranked = rankGeocodedPlaceCandidates(
      [
        {
          place: samplePlace({
            id: "amsterdam-ny",
            displayName: "Amsterdam, New York, United States",
            center: [42.938, -74.19],
            bounds: { south: 42.92, west: -74.22, north: 42.96, east: -74.16 },
            placeCategory: "city",
            approximateAreaSqMi: 6,
          }),
          importance: 0.32,
          fromCityQuery: true,
        },
        {
          place: samplePlace({
            id: "amsterdam-ohio",
            displayName: "Amsterdam, Ohio, United States",
            center: [40.472, -80.937],
            bounds: { south: 40.46, west: -80.95, north: 40.48, east: -80.92 },
            placeCategory: "village",
            approximateAreaSqMi: 0.3,
          }),
          importance: 0.18,
          fromCityQuery: false,
        },
        {
          place: samplePlace({
            id: "amsterdam-nl",
            displayName: "Amsterdam, North Holland, Netherlands",
            center: [52.367, 4.9],
            bounds: { south: 52.28, west: 4.73, north: 52.43, east: 5.08 },
            placeCategory: "city",
            approximateAreaSqMi: 85,
          }),
          importance: 0.82,
          fromCityQuery: true,
        },
      ],
      "amsterdam",
    );

    expect(ranked.map((place) => place.id)).toEqual([
      "amsterdam-nl",
      "amsterdam-ny",
      "amsterdam-ohio",
    ]);
  });

  it("ranks a well-known town ahead of an obscure same-name city", () => {
    const ranked = rankGeocodedPlaceCandidates(
      [
        {
          place: samplePlace({
            id: "cambridge-md",
            displayName: "Cambridge, Maryland, United States",
            center: [38.563, -76.079],
            bounds: { south: 38.54, west: -76.1, north: 38.58, east: -76.05 },
            placeCategory: "city",
            approximateAreaSqMi: 13,
          }),
          importance: 0.28,
          fromCityQuery: true,
        },
        {
          place: samplePlace({
            id: "cambridge-uk",
            displayName: "Cambridge, England, United Kingdom",
            center: [52.205, 0.119],
            bounds: { south: 52.16, west: 0.07, north: 52.24, east: 0.18 },
            placeCategory: "town",
            approximateAreaSqMi: 16,
          }),
          importance: 0.74,
          fromCityQuery: false,
        },
      ],
      "cambridge",
    );

    expect(ranked[0]?.id).toBe("cambridge-uk");
    expect(ranked[1]?.id).toBe("cambridge-md");
  });

  it("ranks a famous distant namesake ahead of a nearer small city", () => {
    const nearOntario: LatLngTuple = [43.65, -79.38];
    const ranked = rankGeocodedPlaceCandidates(
      [
        {
          place: samplePlace({
            id: "london-on",
            displayName: "London, Ontario, Canada",
            center: [42.98, -81.25],
            bounds: { south: 42.9, west: -81.4, north: 43.1, east: -81.1 },
            placeCategory: "city",
            approximateAreaSqMi: 160,
          }),
          importance: 0.48,
          fromCityQuery: true,
        },
        {
          place: samplePlace({
            id: "greater-london",
            displayName: "Greater London, England, United Kingdom",
            center: [51.507, -0.128],
            bounds: { south: 51.28, west: -0.51, north: 51.7, east: 0.33 },
            placeCategory: "county",
            approximateAreaSqMi: 600,
          }),
          importance: 0.91,
          fromCityQuery: false,
        },
        {
          place: samplePlace({
            id: "london-uk",
            displayName: "London, England, United Kingdom",
            center: [51.507, -0.128],
            bounds: { south: 51.28, west: -0.51, north: 51.7, east: 0.33 },
            placeCategory: "city",
            approximateAreaSqMi: 600,
          }),
          importance: 0.94,
          fromCityQuery: true,
        },
      ],
      "london",
      nearOntario,
    );

    expect(ranked[0]?.id).toBe("london-uk");
    expect(ranked.map((place) => place.id)).toContain("london-on");
  });

  it("prefers nominatim importance when two cities otherwise match", () => {
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

    expect(ranked[0]?.id).toBe("large");
  });

  it("prefers smaller area only when importance and settlement class tie", () => {
    const ranked = rankGeocodedPlaceCandidates(
      [
        {
          place: samplePlace({
            id: "large",
            displayName: "Dublin, Ireland",
            placeCategory: "city",
            approximateAreaSqMi: 200,
          }),
          importance: 0.55,
          fromCityQuery: true,
        },
        {
          place: samplePlace({
            id: "small",
            displayName: "Dublin, Ireland",
            placeCategory: "city",
            approximateAreaSqMi: 40,
          }),
          importance: 0.55,
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

  it("ranks a playable city ahead of a nearby natural feature even when GPS is local", () => {
    const nearIreland: LatLngTuple = [53.35, -6.26];
    const ranked = rankGeocodedPlaceCandidates(
      [
        {
          place: samplePlace({
            id: "amsterdam-rock",
            displayName: "Amsterdam Rock, County Kerry, Ireland",
            center: [51.85, -10.39],
            bounds: { south: 51.849, west: -10.391, north: 51.851, east: -10.389 },
            placeCategory: "rock",
            approximateAreaSqMi: 0.01,
          }),
          importance: 0.12,
          fromCityQuery: false,
        },
        {
          place: samplePlace({
            id: "amsterdam-nl",
            displayName: "Amsterdam, North Holland, Netherlands",
            center: [52.367, 4.9],
            bounds: { south: 52.28, west: 4.73, north: 52.43, east: 5.08 },
            placeCategory: "city",
            approximateAreaSqMi: 85,
          }),
          importance: 0.82,
          fromCityQuery: true,
        },
      ],
      "amsterdam",
      nearIreland,
    );

    expect(ranked[0]?.id).toBe("amsterdam-nl");
    expect(ranked[1]?.id).toBe("amsterdam-rock");
  });

  it("ranks closer same-name cities higher when GPS is set", () => {
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
