import { describe, expect, it } from "vitest";
import type { GameArea } from "../../domain/map/annotations";
import {
  buildHidingZoneTransitStopOverpassQuery,
  buildTransitStopOverpassQuery,
  HIDING_ZONE_BUS_STOP_OVERPASS_CAP,
  HIDING_ZONE_RAIL_STOP_OVERPASS_CAP,
  parseOverpassTransitStops,
  transitStopDisplayName,
} from "./transitStops";

const sampleGameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-130.35, 54.28],
      [-130.3, 54.28],
      [-130.3, 54.32],
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
    expect(query).toContain('public_transport"="stop_position"');
    expect(query).not.toContain('["name"]');
  });

  it("builds a hiding-zone overpass query with bus and rail buckets", () => {
    const query = buildHidingZoneTransitStopOverpassQuery({
      south: 54.28,
      west: -130.35,
      north: 54.32,
      east: -130.3,
    });

    expect(query).toMatch(/->\.bus|\.bus out/);
    expect(query).toMatch(/->\.rail|\.rail out/);
    expect(query.indexOf(".rail out")).toBeLessThan(query.indexOf(".bus out"));
    expect(query).toContain(`out center ${HIDING_ZONE_BUS_STOP_OVERPASS_CAP}`);
    expect(query).toContain(`out center ${HIDING_ZONE_RAIL_STOP_OVERPASS_CAP}`);
    expect(HIDING_ZONE_BUS_STOP_OVERPASS_CAP).toBe(150);
    expect(HIDING_ZONE_RAIL_STOP_OVERPASS_CAP).toBe(100);
    expect(query).toContain('highway"="bus_stop"');
    expect(query).toContain('railway"="station"');
    expect(query).not.toContain('public_transport"="stop_position"');
  });

  it("prefers the stop name over stop codes for display labels", () => {
    expect(
      transitStopDisplayName({
        ref: "51",
        name: "3rd Avenue at McBride",
      }),
    ).toBe("3rd Avenue at McBride");
    expect(
      transitStopDisplayName({
        local_ref: "PA",
        name: "Princes Street (west)",
      }),
    ).toBe("Princes Street (west)");
  });

  it("falls back to ref then local_ref then Transit stop when unnamed", () => {
    expect(transitStopDisplayName({ ref: "51", local_ref: "A" })).toBe("51");
    expect(transitStopDisplayName({ local_ref: "Stop A" })).toBe("Stop A");
    expect(transitStopDisplayName({ name: "  ", ref: "7" })).toBe("7");
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

  it("merges same-named stop positions that only differ by ref", () => {
    const stations = parseOverpassTransitStops(
      [
        {
          id: 3001,
          lat: 54.3,
          lon: -130.32,
          tags: { public_transport: "stop_position", ref: "1", name: "Edinburgh Waverley" },
        },
        {
          id: 3002,
          lat: 54.3004,
          lon: -130.32,
          tags: { public_transport: "stop_position", ref: "4", name: "Edinburgh Waverley" },
        },
      ],
      sampleGameArea,
    );

    expect(stations).toHaveLength(1);
    expect(stations[0]?.name).toBe("Edinburgh Waverley");
  });
});
