import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { GtfsStaticBundle } from "./gtfsBundle";
import {
  filterGtfsStopsForGameArea,
  gtfsStopsShareStationOrRoute,
  resolveTransitLineMatch,
} from "./gtfsRouteGraph";

const ROOT = resolve(import.meta.dirname, "../../..");

function loadProductionBundle(metroId: string): GtfsStaticBundle | null {
  const path = resolve(ROOT, `public/geo/gtfs/${metroId}.json`);
  try {
    return JSON.parse(readFileSync(path, "utf8")) as GtfsStaticBundle;
  } catch {
    return null;
  }
}

const MIDTOWN_NYC = {
  type: "Polygon" as const,
  coordinates: [
    [
      [-74.01, 40.74],
      [-73.97, 40.74],
      [-73.97, 40.77],
      [-74.01, 40.77],
      [-74.01, 40.74],
    ],
  ],
};

const CENTRAL_LONDON = {
  type: "Polygon" as const,
  coordinates: [
    [
      [-0.15, 51.5],
      [-0.1, 51.5],
      [-0.1, 51.54],
      [-0.15, 51.54],
      [-0.15, 51.5],
    ],
  ],
};

const CENTRAL_PORTLAND_MAINE = {
  type: "Polygon" as const,
  coordinates: [
    [
      [-70.28, 43.64],
      [-70.24, 43.64],
      [-70.24, 43.67],
      [-70.28, 43.67],
      [-70.28, 43.64],
    ],
  ],
};

const CENTRAL_PRINCE_RUPERT = {
  type: "Polygon" as const,
  coordinates: [
    [
      [-130.34, 54.3],
      [-130.3, 54.3],
      [-130.3, 54.33],
      [-130.34, 54.33],
      [-130.34, 54.3],
    ],
  ],
};

describe("production GTFS bundles", () => {
  it("NYC midtown play area uses full subway stop inventory", async () => {
    const bundle = loadProductionBundle("nyc");
    expect(bundle).not.toBeNull();
    expect(bundle!.stops.length).toBeGreaterThan(100);

    const stops = filterGtfsStopsForGameArea(bundle!, MIDTOWN_NYC);
    expect(stops.length).toBeGreaterThan(20);

    const penn = stops.find((stop) => stop.name === "34 St-Penn Station");
    const times = stops.find((stop) => stop.name === "Times Sq-42 St");
    expect(penn).toBeDefined();
    expect(times).toBeDefined();
    expect(
      gtfsStopsShareStationOrRoute(penn!.id, times!.id, bundle!),
    ).toBe(true);

    const match = await resolveTransitLineMatch(
      [40.7504, -73.991],
      [40.7553, -73.9875],
      bundle!,
      MIDTOWN_NYC,
    );
    expect(match).toBe(true);
  });

  it("London central play area uses full TfL stop inventory", async () => {
    const bundle = loadProductionBundle("london");
    expect(bundle).not.toBeNull();
    expect(bundle!.stops.length).toBeGreaterThan(100);

    const stops = filterGtfsStopsForGameArea(bundle!, CENTRAL_LONDON);
    expect(stops.length).toBeGreaterThan(10);

    const kingsCross = stops.find((stop) =>
      stop.name.includes("King's Cross St. Pancras"),
    );
    const euston = stops.find((stop) =>
      stop.name === "Euston Underground Station",
    );
    expect(kingsCross).toBeDefined();
    expect(euston).toBeDefined();
  });

  it("Portland Maine central play area uses full GP Metro stop inventory", async () => {
    const bundle = loadProductionBundle("portland-maine");
    expect(bundle).not.toBeNull();
    expect(bundle!.stops.length).toBeGreaterThan(100);

    const stops = filterGtfsStopsForGameArea(bundle!, CENTRAL_PORTLAND_MAINE);
    expect(stops.length).toBeGreaterThan(5);

    const elm = stops.find((stop) => stop.name.includes("ELM ST"));
    expect(elm).toBeDefined();
  });

  it("Prince Rupert bundle loads BC Transit fixture stops", async () => {
    const bundle = loadProductionBundle("prince-rupert");
    expect(bundle).not.toBeNull();
    expect(bundle!.stops.length).toBeGreaterThanOrEqual(2);

    const stops = filterGtfsStopsForGameArea(bundle!, CENTRAL_PRINCE_RUPERT);
    expect(stops.length).toBeGreaterThanOrEqual(2);

    const cityHall = stops.find((stop) => stop.name === "City Hall");
    expect(cityHall).toBeDefined();
  });
});
