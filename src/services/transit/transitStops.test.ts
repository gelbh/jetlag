import { describe, expect, it } from "vitest";
import type { GameArea } from "../../domain/map/annotations";
import {
  buildTransitStopOverpassQuery,
  parseOverpassTransitStops,
  transitStopDisplayName,
} from "./transitStops";

const sampleGameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-130.35, 54.28],
      [-130.30, 54.28],
      [-130.30, 54.32],
      [-130.35, 54.32],
      [-130.35, 54.28],
    ],
  ],
};

describe("transitStops", () => {
  it("builds an overpass query that includes bus stops", () => {
    const query = buildTransitStopOverpassQuery({
      south: 54.28,
      west: -130.35,
      north: 54.32,
      east: -130.3,
    });

    expect(query).toContain('highway"="bus_stop"');
    expect(query).toContain('public_transport"="platform"');
    expect(query).not.toContain('["name"]');
  });

  it("prefers ref over name for display labels", () => {
    expect(
      transitStopDisplayName({
        ref: "51",
        name: "3rd Avenue at McBride",
      }),
    ).toBe("51");
  });

  it("falls back to local_ref then name then Transit stop", () => {
    expect(transitStopDisplayName({ local_ref: "Stop A" })).toBe("Stop A");
    expect(transitStopDisplayName({ name: "Central Station" })).toBe(
      "Central Station",
    );
    expect(transitStopDisplayName({})).toBe("Transit stop");
  });

  it("parses bus stops with ref-only tags into hiding-zone stations", () => {
    const stations = parseOverpassTransitStops(
      [
        {
          id: 9001,
          lat: 54.3,
          lon: -130.32,
          tags: { highway: "bus_stop", ref: "51" },
        },
        {
          id: 9002,
          lat: 54.301,
          lon: -130.321,
          tags: { highway: "bus_stop" },
        },
      ],
      sampleGameArea,
    );

    expect(stations).toHaveLength(2);
    expect(stations[0]?.name).toBe("51");
    expect(stations[1]?.name).toBe("Transit stop");
  });

  it("dedupes same-named stops that are very close together", () => {
    const stations = parseOverpassTransitStops(
      [
        {
          id: 1,
          lat: 54.3,
          lon: -130.32,
          tags: { highway: "bus_stop", name: "Main & 3rd" },
        },
        {
          id: 2,
          lat: 54.30001,
          lon: -130.32001,
          tags: { highway: "bus_stop", name: "main & 3rd" },
        },
      ],
      sampleGameArea,
    );

    expect(stations).toHaveLength(1);
  });
});
