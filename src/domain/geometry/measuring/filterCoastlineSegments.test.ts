import type { Feature, LineString } from "geojson";
import { describe, expect, it } from "vitest";
import type { BoundingBox } from "../gameArea/gameAreaBounds";
import { filterCoastlineSegmentsForMeasuring } from "./filterCoastlineSegments";

const bbox: BoundingBox = {
  south: 0,
  west: 0,
  north: 1,
  east: 1,
};

function segment(id: string, coordinates: [number, number][]): Feature<LineString> {
  return {
    type: "Feature",
    properties: { id },
    geometry: {
      type: "LineString",
      coordinates,
    },
  };
}

describe("filterCoastlineSegmentsForMeasuring", () => {
  it("drops segments shorter than the measuring minimum", () => {
    const short = segment("short", [
      [0.5, 0.5],
      [0.50001, 0.5],
    ]);

    expect(filterCoastlineSegmentsForMeasuring([short], bbox)).toEqual([]);
  });

  it("drops short closed rings that do not touch the bbox edge", () => {
    const harbourLoop = segment("harbour-loop", [
      [0.4, 0.4],
      [0.405, 0.4],
      [0.405, 0.405],
      [0.4, 0.405],
      [0.4, 0.4],
    ]);

    expect(filterCoastlineSegmentsForMeasuring([harbourLoop], bbox)).toEqual([]);
  });

  it("keeps open ways and closed rings that reach the bbox edge", () => {
    const openWay = segment("open", [
      [0.2, 0.2],
      [0.3, 0.3],
    ]);
    const edgeLoop = segment("edge-loop", [
      [0.4, 0],
      [0.45, 0],
      [0.45, 0.05],
      [0.4, 0.05],
      [0.4, 0],
    ]);
    const longIsland = segment("long-island", [
      [0.1, 0.1],
      [0.5, 0.1],
      [0.5, 0.5],
      [0.1, 0.5],
      [0.1, 0.1],
    ]);

    expect(filterCoastlineSegmentsForMeasuring([openWay, edgeLoop, longIsland], bbox)).toEqual([
      openWay,
      edgeLoop,
      longIsland,
    ]);
  });
});
