import { describe, expect, it } from "vitest";
import {
  assertConfirmedForCommit,
  type PoiCandidate,
} from "@/domain/geo/poiCandidate";
import {
  filterConfirmedTentaclePois,
  isConfirmedPoiLike,
  measuringPlaceToPoiCandidate,
  poiCandidateToMeasuringPlace,
  poiCandidateToTentaclePoi,
} from "@/domain/geo/poiCandidateAdapters";

describe("poiCandidateAdapters", () => {
  it("round-trips measuring places and preserves provisional", () => {
    const candidate: PoiCandidate = {
      id: "tile:1",
      name: "Museum",
      point: [51.5, -0.1],
      categoryId: "museum",
      source: "tile",
      confirmStatus: "provisional",
    };
    const place = poiCandidateToMeasuringPlace(candidate);
    expect(place.confirmStatus).toBe("provisional");
    expect(assertConfirmedForCommit(measuringPlaceToPoiCandidate(place))).toBe(
      false,
    );
  });

  it("treats legacy measuring places without confirmStatus as confirmed", () => {
    expect(
      isConfirmedPoiLike({
        id: "osm:1",
        name: "Park",
        point: [0, 0],
      }),
    ).toBe(true);
  });

  it("filters provisional tentacle pois before commit", () => {
    const confirmed = filterConfirmedTentaclePois([
      {
        id: "tile:a",
        name: "A",
        lat: 1,
        lng: 2,
        category: "museum",
        source: "tile",
        confirmStatus: "provisional",
      },
      {
        id: "osm:b",
        name: "B",
        lat: 1,
        lng: 2,
        category: "museum",
        source: "overpass",
        confirmStatus: "confirmed",
      },
    ]);
    expect(confirmed.map((poi) => poi.id)).toEqual(["osm:b"]);
  });

  it("maps candidates into tentacle pois for the active category", () => {
    const poi = poiCandidateToTentaclePoi(
      {
        id: "tile:1",
        name: "Gallery",
        point: [53.3, -6.2],
        categoryId: "museum",
        source: "tile",
        confirmStatus: "provisional",
      },
      "museum",
    );
    expect(poi.category).toBe("museum");
    expect(poi.lat).toBe(53.3);
    expect(poi.confirmStatus).toBe("provisional");
  });
});
